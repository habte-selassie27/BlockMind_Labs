/**
 * Vault lifecycle + persisted state.
 *
 * Layout (ADR-011):
 *   bm.vault          local    sealed vault record (password-encrypted)
 *   bm.settings       local    non-secret preferences
 *   bm.trusted        local    contract addresses the user has vouched for (§12.4)
 *   bm.connected      local    origins the user has approved for account access
 *   bm.unlocked       session  decrypted secret + unlock time — memory only
 *   bm.pending.<id>   session  a request awaiting user confirmation
 *   bm.result.<id>    session  the outcome, so a restarted service worker can answer
 */
import { DEFAULT_CHAIN_ID } from '../lib/chains';
import type { KVStore } from '../lib/storage';
import { decryptJson, encryptJson } from '../vault/crypto';
import { createSecret, deriveAddress, exportSecret } from '../vault/vault';
import type { MnemonicWordCount } from '../vault/vault';
import { secretFromMnemonic, secretFromPrivateKey } from '../vault/vault';
import type { ExportedSecret, Settings, VaultAccount, VaultRecord, VaultSecret, VaultStatus } from '../vault/types';

export const KEYS = {
  vault: 'bm.vault',
  settings: 'bm.settings',
  trusted: 'bm.trusted',
  connected: 'bm.connected',
  unlocked: 'bm.unlocked',
  pending: (id: string) => `bm.pending.${id}`,
  result: (id: string) => `bm.result.${id}`,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  chainId: DEFAULT_CHAIN_ID,
  selectedIndex: 0,
  autoLockMinutes: 15,
  tokens: [],
};

export interface UnlockedState {
  secret: VaultSecret;
  unlockedAt: number;
}

export interface VaultStoreDeps {
  local: KVStore;
  session: KVStore;
  now(): number;
}

export class VaultLockedError extends Error {
  constructor(message = 'Blockmind Wallet is locked. Open the extension and unlock it to continue.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

export class VaultStore {
  constructor(private readonly deps: VaultStoreDeps) {}

  private get local(): KVStore {
    return this.deps.local;
  }

  private get session(): KVStore {
    return this.deps.session;
  }

  // ── Reads ───────────────────────────────────────────────────────

  async getRecord(): Promise<VaultRecord | undefined> {
    return this.local.get<VaultRecord>(KEYS.vault);
  }

  async getSettings(): Promise<Settings> {
    const stored = await this.local.get<Partial<Settings>>(KEYS.settings);
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await this.local.set(KEYS.settings, next);
    return next;
  }

  private async getUnlockedState(): Promise<UnlockedState | undefined> {
    return this.session.get<UnlockedState>(KEYS.unlocked);
  }

  async status(): Promise<VaultStatus> {
    const [record, settings, unlocked] = await Promise.all([
      this.getRecord(),
      this.getSettings(),
      this.getUnlockedState(),
    ]);

    return {
      exists: Boolean(record),
      locked: !unlocked && Boolean(record),
      address: record?.address ?? null,
      accounts: record?.accounts ?? [],
      chainId: settings.chainId,
      autoLockMinutes: settings.autoLockMinutes,
      selectedIndex: settings.selectedIndex,
      tokens: settings.tokens ?? [],
    };
  }

  /**
   * Returns the secret only if unlocked and within the auto-lock window.
   * Locking happens as a side effect, so an idle tab cannot keep signing forever.
   */
  async secretIfUnlocked(): Promise<VaultSecret | undefined> {
    const state = await this.getUnlockedState();
    if (!state) return undefined;

    const settings = await this.getSettings();
    const ttlMs = Math.max(1, settings.autoLockMinutes) * 60_000;
    if (this.deps.now() - state.unlockedAt > ttlMs) {
      await this.lock();
      return undefined;
    }
    return state.secret;
  }

  async requireUnlocked(): Promise<VaultSecret> {
    const secret = await this.secretIfUnlocked();
    if (!secret) throw new VaultLockedError();
    return secret;
  }

  /** Signing counts as activity, so an active session does not expire mid-flow. */
  async touch(): Promise<void> {
    const state = await this.getUnlockedState();
    if (!state) return;
    await this.session.set(KEYS.unlocked, { ...state, unlockedAt: this.deps.now() } satisfies UnlockedState);
  }

  async unlockedAccount(): Promise<{ secret: VaultSecret; index: number; address: string }> {
    const secret = await this.requireUnlocked();
    const settings = await this.getSettings();
    const record = await this.getRecord();
    const index = settings.selectedIndex;
    const account = record?.accounts.find((candidate) => candidate.index === index);
    if (!account) {
      throw new Error('Selected account no longer exists in this vault');
    }
    return { secret, index, address: account.address };
  }

  // ── Mutations ───────────────────────────────────────────────────

  private async persist(secret: VaultSecret, password: string): Promise<VaultRecord> {
    const address = deriveAddress(secret, 0);
    const accounts: VaultAccount[] = [{ index: 0, address }];
    const existing = await this.getRecord();

    const record: VaultRecord = {
      version: 1,
      createdAt: existing?.createdAt ?? this.deps.now(),
      address,
      accounts,
      sealed: await encryptJson(secret, password),
    };

    await this.local.set(KEYS.vault, record);
    await this.session.set(KEYS.unlocked, { secret, unlockedAt: this.deps.now() } satisfies UnlockedState);
    await this.updateSettings({ selectedIndex: 0 });
    return record;
  }

  async create(password: string, words: MnemonicWordCount = 12): Promise<VaultStatus> {
    await this.persist(createSecret(words), password);
    return this.status();
  }

  async importMnemonic(password: string, mnemonic: string): Promise<VaultStatus> {
    await this.persist(secretFromMnemonic(mnemonic), password);
    return this.status();
  }

  async importPrivateKey(password: string, privateKey: string): Promise<VaultStatus> {
    await this.persist(secretFromPrivateKey(privateKey), password);
    return this.status();
  }

  async unlock(password: string): Promise<VaultStatus> {
    const record = await this.getRecord();
    if (!record) throw new Error('No wallet exists yet — create or import one first');

    // Throws VaultDecryptError on a wrong password; the secret never leaves this scope.
    const secret = await decryptJson<VaultSecret>(record.sealed, password);
    if (!secret.kind) throw new VaultLockedError('Vault contents are unreadable');

    await this.session.set(KEYS.unlocked, { secret, unlockedAt: this.deps.now() } satisfies UnlockedState);
    return this.status();
  }

  async lock(): Promise<void> {
    await this.session.remove(KEYS.unlocked);
  }

  /** Export requires the password again — an unlocked session is not enough. */
  async reveal(password: string): Promise<ExportedSecret> {
    const record = await this.getRecord();
    if (!record) throw new Error('No wallet exists yet');
    const secret = await decryptJson<VaultSecret>(record.sealed, password);
    return { kind: secret.kind, ...exportSecret(secret), accounts: record.accounts };
  }

  async addAccount(): Promise<VaultStatus> {
    const secret = await this.requireUnlocked();
    const record = await this.getRecord();
    if (!record) throw new Error('No wallet exists yet');
    if (secret.kind === 'privateKey') {
      throw new Error('A single-key vault cannot derive additional accounts — import a recovery phrase instead');
    }

    const index = record.accounts.length;
    if (index >= 100) throw new Error('Account limit reached for this vault');

    const account: VaultAccount = { index, address: deriveAddress(secret, index) };
    const next: VaultRecord = { ...record, accounts: [...record.accounts, account] };
    await this.local.set(KEYS.vault, next);
    await this.updateSettings({ selectedIndex: index });
    return this.status();
  }

  async selectAccount(index: number): Promise<VaultStatus> {
    const record = await this.getRecord();
    if (!record) throw new Error('No wallet exists yet');
    if (!record.accounts.some((account) => account.index === index)) {
      throw new Error(`Account ${index} does not exist`);
    }
    await this.updateSettings({ selectedIndex: index });
    return this.status();
  }

  // ── Trusted contracts (§12.4) ───────────────────────────────────

  async trustedAddresses(): Promise<string[]> {
    return (await this.local.get<string[]>(KEYS.trusted)) ?? [];
  }

  async isTrusted(address: string): Promise<boolean> {
    const list = await this.trustedAddresses();
    return list.includes(address.toLowerCase());
  }

  async trust(address: string): Promise<void> {
    const list = await this.trustedAddresses();
    const normalized = address.toLowerCase();
    if (list.includes(normalized)) return;
    await this.local.set(KEYS.trusted, [...list, normalized]);
  }

  // ── Origin connections ──────────────────────────────────────────

  async isConnected(origin: string): Promise<boolean> {
    const map = (await this.local.get<Record<string, boolean>>(KEYS.connected)) ?? {};
    return map[origin] === true;
  }

  async setConnected(origin: string, connected = true): Promise<void> {
    const map = (await this.local.get<Record<string, boolean>>(KEYS.connected)) ?? {};
    await this.local.set(KEYS.connected, { ...map, [origin]: connected });
  }

  async disconnectOrigin(origin: string): Promise<void> {
    await this.setConnected(origin, false);
  }

  // ── Pending requests + results ──────────────────────────────────

  async setPending<T extends { id: string }>(record: T): Promise<void> {
    await this.session.set(KEYS.pending(record.id), record);
  }

  async getPending<T>(id: string): Promise<T | undefined> {
    return this.session.get<T>(KEYS.pending(id));
  }

  async clearPending(id: string): Promise<void> {
    await this.session.remove(KEYS.pending(id));
  }

  async setResult(id: string, result: unknown): Promise<void> {
    await this.session.set(KEYS.result(id), result);
  }

  async getResult<T>(id: string): Promise<T | undefined> {
    return this.session.get<T>(KEYS.result(id));
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.4, §12.5 (see ADR-011)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
