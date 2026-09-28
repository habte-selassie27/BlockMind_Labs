/**
 * Request dispatcher — the single place where a provider call can become a signature.
 *
 * Design notes:
 *  • Pure orchestration: chain access, risk lookup, and window management are injected,
 *    so the whole flow is unit-testable without a browser.
 *  • State-changing requests are *deferred*, not awaited. The service worker answers
 *    immediately with a request id and the caller polls `result_get`. A request that
 *    waits on a human must not keep an MV3 worker alive (it would be torn down).
 *  • Nothing is signed before `evaluateTransaction` returns canSign (§12.1–§12.4), and
 *    the gate is re-checked at signature time, after the user's decision.
 */
import { getChain, isSupportedChain } from '../lib/chains';
import {
  ErrorCode,
  ProviderRpcError,
  internalError,
  invalidParams,
  toRpcError,
  unauthorized,
  unsupportedMethod,
} from '../lib/errors';
import {
  encodeErc20Transfer,
  isTokenAddress,
  normalizeTokenAddress,
  parseTokenAmount,
  readTokenMetadata,
  removeToken,
  tokensForChain,
  upsertToken,
  type TokenConfig,
} from '../lib/tokens';
import {
  CONTENT_CHANNEL,
  newRequestId,
  successResponse,
  type ProviderRequestMessage,
  type ProviderResponseMessage,
} from '../lib/messages';
import { bigIntToHex } from '../lib/rpc';
import { isUnlimitedApproval } from '../safety/approvals';
import { decodeCall, formatTokenAmount, type DecodedCall } from '../safety/calldata';
import { evaluateTransaction } from '../safety/gate';
import type { ContractRisk, ScamShield } from '../safety/scamshield';
import { simulateTransaction, type SimulationResult } from '../safety/simulate';
import { signMessage, signTransaction, signTypedData, type TransactionLike } from '../vault/vault';
import type { MnemonicWordCount, TypedDataPayload } from '../vault/vault';
import { VaultLockedError, VaultStore } from './vault-store';
import type { ConfirmPayload, HexTxFields, PendingKind, PendingRequest, StoredResult } from './pending';

/** Provider-specific error code for a request stopped by the safety gate. */
export const SAFETY_BLOCKED = -32001;

export type ExtMessage =
  | { type: 'vault_status' }
  | { type: 'vault_create'; password: string; words?: MnemonicWordCount }
  | { type: 'vault_import_mnemonic'; password: string; mnemonic: string }
  | { type: 'vault_import_private_key'; password: string; privateKey: string }
  | { type: 'vault_unlock'; password: string }
  | { type: 'vault_lock' }
  | { type: 'vault_reveal'; password: string }
  | { type: 'vault_add_account' }
  | { type: 'vault_select_account'; index: number }
  | {
      type: 'settings_update';
      patch: { chainId?: number; autoLockMinutes?: number; tokens?: TokenConfig[] };
    }
  | { type: 'pending_get'; id: string }
  | { type: 'pending_decide'; id: string; approved: boolean; acknowledgements?: string[]; trustContract?: boolean }
  | { type: 'result_get'; id: string }
  | { type: 'token_add'; address: string; chainId?: number }
  | { type: 'token_remove'; address: string; chainId: number }
  /** `token` omitted = native GIWA transfer; present = ERC-20 transfer. */
  | { type: 'send_form'; to: string; amount: string; token?: string };

export type ExtResponse = { ok: true; data?: unknown } | { ok: false; error: string };

export type ProviderOutcome =
  | { status: 'response'; response: ProviderResponseMessage }
  | { status: 'deferred'; id: string };

/**
 * The slice of chain access the dispatcher needs. `RpcClient` satisfies it structurally;
 * tests supply a fake without a network.
 */
export interface ChainClient {
  call<T>(chainId: number, method: string, params: unknown[]): Promise<T>;
  getCode(chainId: number, address: string): Promise<`0x${string}`>;
  getTransactionCount(chainId: number, address: string): Promise<`0x${string}`>;
  getGasPrice(chainId: number): Promise<`0x${string}`>;
  getMaxPriorityFeePerGas(chainId: number): Promise<`0x${string}`>;
  sendRawTransaction(chainId: number, raw: `0x${string}`): Promise<`0x${string}`>;
}

export interface DispatcherDeps {
  store: VaultStore;
  rpc: ChainClient;
  scamShield: ScamShield;
  /** Opens the confirmation window. Must render `payload` verbatim. */
  openConfirm(payload: ConfirmPayload): Promise<void>;
  /** Brings the unlock UI to the user's attention when a locked vault blocks a request. */
  openPopup?(): Promise<void>;
  version: string;
  now(): number;
}

const READ_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'web3_clientVersion',
]);

interface EthTxParams {
  from?: string;
  to?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  chainId?: string;
  type?: string;
  allow_unlimited?: boolean;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;

function asArray(params: unknown): unknown[] {
  return Array.isArray(params) ? params : [];
}

function parseBigInt(value: string | undefined, label: string): bigint | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !HEX_RE.test(value)) throw invalidParams(`${label} must be a hex quantity`);
  return BigInt(value);
}

function parseNonce(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!HEX_RE.test(value)) throw invalidParams('nonce must be a hex quantity');
  return Number(BigInt(value));
}

function decodeHexText(hex: string): string | undefined {
  if (!HEX_RE.test(hex)) return undefined;
  const body = hex.slice(2);
  let text = '';
  for (let i = 0; i + 1 < body.length; i += 2) {
    const code = Number.parseInt(body.slice(i, i + 2), 16);
    if (code === 0) return text || undefined;
    if (code < 9 || (code > 13 && code < 32) || code > 126) return undefined;
    text += String.fromCharCode(code);
  }
  return text || undefined;
}

function tokenFromDecoded(decoded: DecodedCall): string | null {
  switch (decoded.kind) {
    case 'transfer':
    case 'transferFrom':
    case 'approve':
    case 'increaseAllowance':
    case 'setApprovalForAll':
      return decoded.token;
    default:
      return null;
  }
}

export class Dispatcher {
  constructor(private readonly deps: DispatcherDeps) {}

  // ── Extension pages (popup + confirm) ───────────────────────────

  async handleExtMessage(message: ExtMessage): Promise<ExtResponse> {
    try {
      switch (message.type) {
        case 'vault_status':
          return { ok: true, data: await this.deps.store.status() };

        case 'vault_create': {
          const status = await this.deps.store.create(message.password, message.words ?? 12);
          // The backup phrase is handed to the popup window exactly once, right after
          // creation, so the user can write it down. It is never returned again.
          const secret = await this.deps.store.secretIfUnlocked();
          return {
            ok: true,
            data: { ...status, ...(secret?.mnemonic ? { backupPhrase: secret.mnemonic } : {}) },
          };
        }

        case 'vault_import_mnemonic':
          return { ok: true, data: await this.deps.store.importMnemonic(message.password, message.mnemonic) };

        case 'vault_import_private_key':
          return { ok: true, data: await this.deps.store.importPrivateKey(message.password, message.privateKey) };

        case 'vault_unlock':
          return { ok: true, data: await this.deps.store.unlock(message.password) };

        case 'vault_lock':
          await this.deps.store.lock();
          return { ok: true, data: await this.deps.store.status() };

        case 'vault_reveal':
          return { ok: true, data: await this.deps.store.reveal(message.password) };

        case 'vault_add_account':
          return { ok: true, data: await this.deps.store.addAccount() };

        case 'vault_select_account':
          return { ok: true, data: await this.deps.store.selectAccount(message.index) };

        case 'settings_update': {
          if (message.patch.chainId !== undefined && !isSupportedChain(message.patch.chainId)) {
            return { ok: false, error: `Chain ${message.patch.chainId} is not supported` };
          }
          await this.deps.store.updateSettings(message.patch);
          return { ok: true, data: await this.deps.store.status() };
        }

        case 'pending_get': {
          const pending = await this.deps.store.getPending<PendingRequest>(message.id);
          if (!pending) return { ok: false, error: 'This request is no longer pending' };
          return { ok: true, data: pending.payload };
        }

        case 'result_get': {
          const result = await this.deps.store.getResult<StoredResult>(message.id);
          return { ok: true, data: result ? { done: true, response: result.response } : { done: false } };
        }

        case 'pending_decide':
          return await this.decide(
            message.id,
            message.approved,
            message.acknowledgements ?? [],
            message.trustContract === true,
          );

        case 'token_add': {
          const settings = await this.deps.store.getSettings();
          const chainId = message.chainId ?? settings.chainId;
          if (!isSupportedChain(chainId)) return { ok: false, error: `Chain ${chainId} is not supported` };
          if (!isTokenAddress(message.address)) {
            return { ok: false, error: 'Enter a valid 0x… token address' };
          }

          // Metadata comes from the chain, never from the form — a typo or a lie would
          // otherwise change the number the user sees on the confirmation screen.
          const meta = await readTokenMetadata(this.deps.rpc, chainId, message.address).catch(() => null);
          if (!meta) {
            return { ok: false, error: 'No ERC-20 contract found at that address on this network' };
          }

          const token: TokenConfig = {
            chainId,
            address: normalizeTokenAddress(message.address),
            symbol: meta.symbol,
            decimals: meta.decimals,
          };
          const tokens = upsertToken(settings.tokens, token);
          await this.deps.store.updateSettings({ tokens });
          return { ok: true, data: { token, tokens } };
        }

        case 'token_remove': {
          const settings = await this.deps.store.getSettings();
          const tokens = removeToken(settings.tokens, message.chainId, message.address);
          await this.deps.store.updateSettings({ tokens });
          return { ok: true, data: await this.deps.store.status() };
        }

        case 'send_form':
          return await this.handleSendForm(message.to, message.amount, message.token);

        default:
          return { ok: false, error: 'Unsupported message' };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── Provider surface (dApps) ────────────────────────────────────

  async handleProvider(
    request: ProviderRequestMessage,
    context: { origin: string; tabId?: number },
  ): Promise<ProviderOutcome> {
    try {
      return await this.route(request, context);
    } catch (err) {
      if (err instanceof VaultLockedError) {
        // Surface the unlock UI rather than failing silently on a locked vault, and
        // report 4100 (unauthorized) so dApps can react correctly.
        await this.deps.openPopup?.().catch(() => undefined);
        return {
          status: 'response',
          response: {
            channel: CONTENT_CHANNEL,
            id: request.id,
            error: toRpcError(unauthorized(err.message)),
          },
        };
      }
      return {
        status: 'response',
        response: { channel: CONTENT_CHANNEL, id: request.id, error: toRpcError(err) },
      };
    }
  }

  private async route(
    request: ProviderRequestMessage,
    context: { origin: string; tabId?: number },
  ): Promise<ProviderOutcome> {
    const { method } = request;
    const params = request.params;

    if (method === 'blockmind_ping') {
      const status = await this.deps.store.status();
      return this.respond(request.id, {
        installed: true,
        name: 'Blockmind Wallet',
        version: this.deps.version,
        chainId: status.chainId,
        locked: status.locked,
        accounts: status.locked ? [] : status.accounts.map((account) => account.address),
      });
    }

    if (method === 'eth_requestAccounts' || method === 'wallet_requestPermissions') {
      if (!(await this.deps.store.isConnected(context.origin))) {
        return this.defer('connect', request, context, {
          headline: `Connect to ${context.origin}`,
          details: [],
        });
      }
      return this.respond(request.id, await this.visibleAccounts());
    }

    if (method === 'eth_accounts') {
      const connected = await this.deps.store.isConnected(context.origin);
      return this.respond(request.id, connected ? await this.visibleAccounts() : []);
    }

    if (method === 'wallet_getPermissions') {
      const connected = await this.deps.store.isConnected(context.origin);
      return this.respond(request.id, connected ? [{ parentCapability: 'eth_accounts' }] : []);
    }

    if (method === 'eth_chainId') {
      const settings = await this.deps.store.getSettings();
      return this.respond(request.id, `0x${settings.chainId.toString(16)}`);
    }

    if (method === 'net_version') {
      const settings = await this.deps.store.getSettings();
      return this.respond(request.id, String(settings.chainId));
    }

    if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
      const target = asArray(params)[0] as { chainId?: string } | undefined;
      const chainId = target?.chainId ? Number(BigInt(target.chainId)) : NaN;
      if (!isSupportedChain(chainId)) throw new ProviderRpcError(ErrorCode.unrecognizedChain, `Unsupported chain: ${target?.chainId ?? 'missing'}`);
      await this.deps.store.updateSettings({ chainId });
      return this.respond(request.id, null);
    }

    // Signing is never permitted for arbitrary caller-supplied hex — that would bypass
    // the simulation and confirmation gates (§12.1, §12.2).
    if (method === 'eth_sendRawTransaction') {
      throw new ProviderRpcError(
        ErrorCode.unsupportedMethod,
        'Blockmind Wallet signs and broadcasts internally; eth_sendRawTransaction is not available to dApps.',
      );
    }

    // eth_sign signs an opaque 32-byte digest, which cannot be shown to the user (§12.2).
    if (method === 'eth_sign') {
      throw new ProviderRpcError(
        ErrorCode.unsupportedMethod,
        'eth_sign is disabled because the payload cannot be shown to the user. Use personal_sign or eth_signTypedData_v4.',
      );
    }

    if (READ_METHODS.has(method)) {
      const settings = await this.deps.store.getSettings();
      const result = await this.deps.rpc.call(settings.chainId, method, asArray(params));
      return this.respond(request.id, result);
    }

    if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
      return this.prepareTransaction(method, request, context);
    }
    if (method === 'personal_sign' || method === 'eth_signTypedData_v4') {
      return this.prepareSignature(method, request, context);
    }

    throw unsupportedMethod(method);
  }

  private respond(id: string, result: unknown): ProviderOutcome {
    return { status: 'response', response: successResponse(id, result) };
  }

  /**
   * Request ids come from the caller, so a replayed id must not be able to reuse an
   * existing confirmation (or its already-recorded result).
   */
  private async beginPending(id: string): Promise<void> {
    if (await this.deps.store.getPending(id)) {
      throw new ProviderRpcError(ErrorCode.internal, 'A request with this id is already awaiting confirmation');
    }
  }

  private async visibleAccounts(): Promise<string[]> {
    const status = await this.deps.store.status();
    if (status.locked || !status.address) return [];
    const selected = status.accounts.find((account) => account.index === status.selectedIndex);
    return selected ? [selected.address] : [status.address];
  }

  // ── Transaction flow ────────────────────────────────────────────

  private async prepareTransaction(
    method: 'eth_sendTransaction' | 'eth_signTransaction',
    request: ProviderRequestMessage,
    context: { origin: string; tabId?: number },
  ): Promise<ProviderOutcome> {
    const raw = asArray(request.params)[0];
    if (typeof raw !== 'object' || raw === null) throw invalidParams('Missing transaction object');
    const params = raw as EthTxParams;

    const { index, address } = await this.deps.store.unlockedAccount();

    if (params.from && !ADDRESS_RE.test(params.from)) throw invalidParams('from is not a valid address');
    if (params.from && params.from.toLowerCase() !== address.toLowerCase()) {
      throw unauthorized(`from ${params.from} is not the selected Blockmind account`);
    }
    if (params.to !== undefined && !ADDRESS_RE.test(params.to)) throw invalidParams('to is not a valid address');

    const settings = await this.deps.store.getSettings();
    let chainId = settings.chainId;
    if (params.chainId !== undefined) {
      const requested = Number(BigInt(params.chainId));
      if (!isSupportedChain(requested)) throw new ProviderRpcError(ErrorCode.unrecognizedChain, `Unsupported chain: ${params.chainId}`);
      chainId = requested;
    }

    const value = parseBigInt(params.value, 'value') ?? 0n;
    const data = params.data && params.data !== '0x' ? params.data : undefined;
    if (data && !HEX_RE.test(data)) throw invalidParams('data must be hex');

    // Token metadata so the confirmation screen shows "1.5 USDC", not "1500000".
    const tokenMeta = data && params.to ? await this.readTokenMeta(chainId, params.to) : undefined;
    const decoded = decodeCall({
      to: params.to,
      data,
      value,
      symbol: tokenMeta?.symbol,
      decimals: tokenMeta?.decimals,
    });

    // §12.1 — simulate before anything is shown to the user.
    const simulation: SimulationResult = await simulateTransaction(this.deps.rpc, chainId, {
      from: address,
      to: params.to,
      value,
      data: data as `0x${string}` | undefined,
    });

    // §12.4 — Scam Shield for contracts we have not seen before.
    const risk = await this.checkRisk(chainId, params.to, decoded);

    const allowUnlimited = params.allow_unlimited === true;
    const chain = getChain(chainId);
    const gate = evaluateTransaction({
      chainId,
      origin: context.origin,
      decoded,
      simulation,
      risk,
      allowUnlimited,
      isTestnet: chain.testnet,
    });

    if (!gate.canSign) {
      // §12.1: a failed simulation stops here — the signer is never reached.
      throw new ProviderRpcError(SAFETY_BLOCKED, gate.blockers.join(' '), {
        blockers: gate.blockers,
        simulation,
        risk,
      });
    }

    const nonce = parseNonce(params.nonce) ?? (await this.nextNonce(chainId, address));
    const gas = parseBigInt(params.gas, 'gas') ?? simulation.gasEstimate;
    const suppliedGasPrice = parseBigInt(params.gasPrice, 'gasPrice');
    const suppliedMaxFee = parseBigInt(params.maxFeePerGas, 'maxFeePerGas');
    const suppliedPriority = parseBigInt(params.maxPriorityFeePerGas, 'maxPriorityFeePerGas');
    const feeFields =
      suppliedGasPrice !== undefined
        ? { gasPriceHex: bigIntToHex(suppliedGasPrice) }
        : suppliedMaxFee !== undefined
          ? {
              maxFeePerGasHex: bigIntToHex(suppliedMaxFee),
              maxPriorityFeePerGasHex: bigIntToHex(suppliedPriority ?? 1_000_000_000n),
            }
          : await this.suggestFees(chainId);

    const tx: HexTxFields = {
      chainId,
      nonce,
      ...(params.to ? { to: params.to } : {}),
      ...(value > 0n ? { valueHex: bigIntToHex(value) } : {}),
      ...(data ? { data } : {}),
      ...(gas !== undefined ? { gasHex: bigIntToHex(gas) } : {}),
      ...feeFields,
    };

    const id = request.id;
    await this.beginPending(id);
    const accounts = (await this.deps.store.status()).accounts;

    const payload: ConfirmPayload = {
      id,
      kind: 'transaction',
      origin: context.origin,
      method,
      chainId,
      chainName: chain.name,
      isTestnet: chain.testnet,
      headline: method === 'eth_signTransaction' ? `${decoded.summary} (sign only, no broadcast)` : decoded.summary,
      details: this.buildTxDetails(tx, decoded, tokenMeta),
      blockers: gate.blockers,
      warnings: gate.warnings,
      acknowledgements: gate.acknowledgements,
      rules: gate.rules,
      simulation: {
        success: simulation.success,
        ...(simulation.gasEstimate !== undefined ? { gas: simulation.gasEstimate.toString() } : {}),
        ...(simulation.revertReason ? { revertReason: simulation.revertReason } : {}),
      },
      risk: this.describeRisk(risk),
      ...(data ? { rawData: data } : {}),
      accounts: accounts.map((account) => ({ index: account.index, address: account.address })),
    };

    const pending: PendingRequest = {
      id,
      kind: 'transaction',
      createdAt: this.deps.now(),
      origin: context.origin,
      method,
      chainId,
      accountIndex: index,
      from: address,
      allowUnlimited,
      broadcast: method === 'eth_sendTransaction',
      tx,
      payload,
    };

    await this.deps.store.setPending(pending);
    await this.deps.openConfirm(payload);
    return { status: 'deferred', id };
  }

  private async prepareSignature(
    method: 'personal_sign' | 'eth_signTypedData_v4',
    request: ProviderRequestMessage,
    context: { origin: string; tabId?: number },
  ): Promise<ProviderOutcome> {
    const args = asArray(request.params);
    const { index, address } = await this.deps.store.unlockedAccount();
    const settings = await this.deps.store.getSettings();
    const chain = getChain(settings.chainId);
    const id = request.id;
    await this.beginPending(id);

    let message: { text?: string; raw?: string } | undefined;
    let typedData: unknown;
    let headline: string;

    if (method === 'personal_sign') {
      const candidate = args[0];
      if (typeof candidate !== 'string' || !HEX_RE.test(candidate)) {
        throw invalidParams('personal_sign expects a hex-encoded payload');
      }
      const text = decodeHexText(candidate);
      message = text ? { text } : { raw: candidate };
      headline = text ? 'Sign this message (shown as text)' : 'Sign this opaque byte payload';
    } else {
      const candidate = args[1] ?? args[0];
      const parsed =
        typeof candidate === 'string'
          ? (JSON.parse(candidate) as TypedDataPayload)
          : (candidate as TypedDataPayload);
      if (!parsed || typeof parsed !== 'object' || !('message' in parsed) || !('types' in parsed)) {
        throw invalidParams('eth_signTypedData_v4 expects an EIP-712 payload');
      }
      typedData = parsed;
      headline = `Sign typed data: ${String((parsed as { primaryType?: unknown }).primaryType ?? 'unknown')}`;
    }

    const typedDetails = typedData
      ? Object.entries(((typedData as { message?: Record<string, unknown> }).message ?? {}))
          .slice(0, 10)
          .map(([label, value]) => ({ label, value: typeof value === 'string' ? value : JSON.stringify(value) }))
      : [{ label: 'Message', value: message?.text ?? message?.raw ?? '' }];

    const payload: ConfirmPayload = {
      id,
      kind: method === 'personal_sign' ? 'signature' : 'typedData',
      origin: context.origin,
      method,
      chainId: chain.id,
      chainName: chain.name,
      isTestnet: chain.testnet,
      headline,
      details: typedDetails,
      blockers: [],
      warnings: [
        'Signatures can authorise on-chain actions. Only sign for a dApp you trust.',
        ...(message?.raw ? ['This payload is opaque — you cannot verify what it authorises.'] : []),
      ],
      acknowledgements: message?.raw ? ['I understand this signature payload is not human-readable'] : [],
      rules: ['§12.2 no TX without confirmation'],
      risk: { label: 'Not applicable', tone: 'muted', detail: 'No contract interaction' },
      accounts: [{ index, address }],
    };

    const pending: PendingRequest = {
      id,
      kind: payload.kind,
      createdAt: this.deps.now(),
      origin: context.origin,
      method,
      chainId: chain.id,
      accountIndex: index,
      from: address,
      allowUnlimited: false,
      broadcast: false,
      ...(message ? { message } : {}),
      ...(typedData ? { typedData } : {}),
      payload,
    };

    await this.deps.store.setPending(pending);
    await this.deps.openConfirm(payload);
    return { status: 'deferred', id };
  }

  /**
   * Popup "Send" form — same gate, same confirmation window, origin is the wallet.
   *
   * An ERC-20 send is plain `transfer` calldata, so it inherits §12.1 (simulation), §12.2
   * (confirmation) and §12.4 (Scam Shield on the new token contract) without a special case.
   */
  private async handleSendForm(to: string, amount: string, token?: string): Promise<ExtResponse> {
    if (!ADDRESS_RE.test(to)) return { ok: false, error: 'Enter a valid 0x… address' };

    const { address } = await this.deps.store.unlockedAccount();
    const settings = await this.deps.store.getSettings();

    let params: EthTxParams;

    if (token) {
      const target = normalizeTokenAddress(token);
      if (!ADDRESS_RE.test(target)) return { ok: false, error: 'That is not a valid token address' };

      const stored = tokensForChain(settings.tokens, settings.chainId).find((t) => t.address === target);
      const meta = stored ?? (await readTokenMetadata(this.deps.rpc, settings.chainId, target).catch(() => null));
      if (!meta) return { ok: false, error: 'That address holds no ERC-20 contract on this network' };

      const value = parseTokenAmount(amount, meta.decimals);
      if (value === null) {
        return { ok: false, error: `Enter an amount greater than zero (at most ${meta.decimals} decimals)` };
      }

      params = {
        from: address,
        to: target,
        value: '0x0',
        data: encodeErc20Transfer(to, value),
        allow_unlimited: false,
      };
    } else {
      const value = parseTokenAmount(amount, 18);
      if (value === null) return { ok: false, error: 'Enter an amount greater than zero' };

      params = { from: address, to, value: bigIntToHex(value), allow_unlimited: false };
    }

    const outcome = await this.prepareTransaction(
      'eth_sendTransaction',
      {
        channel: 'blockmind:inpage',
        id: newRequestId(),
        method: 'eth_sendTransaction',
        params: [params],
      } as ProviderRequestMessage,
      { origin: 'Blockmind Wallet' },
    );

    if (outcome.status === 'response' && outcome.response.error) {
      return { ok: false, error: outcome.response.error.message };
    }
    return { ok: true, data: { id: outcome.status === 'deferred' ? outcome.id : undefined } };
  }

  // ── User decision ───────────────────────────────────────────────

  private async decide(
    id: string,
    approved: boolean,
    acknowledgements: string[],
    trustContract: boolean,
  ): Promise<ExtResponse> {
    const pending = await this.deps.store.getPending<PendingRequest>(id);
    if (!pending) {
      const cached = await this.deps.store.getResult<StoredResult>(id);
      return cached ? { ok: true, data: cached.response } : { ok: false, error: 'This request expired' };
    }

    if (!approved) {
      await this.finish(id, {
        channel: CONTENT_CHANNEL,
        id,
        error: { code: ErrorCode.userRejectedRequest, message: 'User rejected the request.' },
      });
      return { ok: true };
    }

    const required = pending.payload.acknowledgements.length;
    if (required > 0 && acknowledgements.length < required) {
      return { ok: false, error: 'This request needs every warning acknowledged before it can be approved' };
    }

    try {
      await this.deps.store.touch();

      if (trustContract) {
        const target = pending.tx?.to;
        if (target) await this.deps.store.trust(target);
      }

      const result = await this.execute(pending);
      await this.finish(id, successResponse(id, result));
      return { ok: true, data: { result } };
    } catch (err) {
      const error = toRpcError(err);
      await this.finish(id, { channel: CONTENT_CHANNEL, id, error });
      return { ok: false, error: error.message };
    }
  }

  /** Re-checks the safety gate, then signs. Called only after explicit approval. */
  private async execute(pending: PendingRequest): Promise<unknown> {
    if (pending.kind === 'connect') {
      await this.deps.store.setConnected(pending.origin);
      return this.visibleAccounts();
    }

    const secret = await this.deps.store.requireUnlocked();

    if (pending.kind === 'signature') {
      if (!pending.message) throw internalError('Pending signature is missing its payload');
      return signMessage(secret, pending.accountIndex, {
        ...(pending.message.text !== undefined ? { text: pending.message.text } : {}),
        ...(pending.message.raw !== undefined ? { raw: pending.message.raw as `0x${string}` } : {}),
      });
    }

    if (pending.kind === 'typedData') {
      if (!pending.typedData) throw internalError('Pending typed data is missing its payload');
      return signTypedData(secret, pending.accountIndex, pending.typedData as TypedDataPayload);
    }

    if (!pending.tx) throw internalError('Pending transaction is missing its payload');

    // Defense in depth: re-assert §12.3 at signing time, after the user's decision.
    if (isUnlimitedApproval(pending.tx.data) && !pending.allowUnlimited) {
      throw new ProviderRpcError(SAFETY_BLOCKED, 'Unlimited approval blocked at signing time (§12.3)');
    }

    const tx: TransactionLike = {
      chainId: pending.tx.chainId,
      ...(pending.tx.to ? { to: pending.tx.to } : {}),
      ...(pending.tx.valueHex ? { value: BigInt(pending.tx.valueHex) } : {}),
      ...(pending.tx.data ? { data: pending.tx.data as `0x${string}` } : {}),
      ...(pending.tx.gasHex ? { gas: BigInt(pending.tx.gasHex) } : {}),
      ...(pending.tx.gasPriceHex ? { gasPrice: BigInt(pending.tx.gasPriceHex) } : {}),
      ...(pending.tx.maxFeePerGasHex ? { maxFeePerGas: BigInt(pending.tx.maxFeePerGasHex) } : {}),
      ...(pending.tx.maxPriorityFeePerGasHex
        ? { maxPriorityFeePerGas: BigInt(pending.tx.maxPriorityFeePerGasHex) }
        : {}),
      ...(pending.tx.nonce !== undefined ? { nonce: pending.tx.nonce } : {}),
    };

    const raw = await signTransaction(secret, pending.accountIndex, tx);
    if (!pending.broadcast) return raw;

    return this.deps.rpc.sendRawTransaction(pending.tx.chainId, raw);
  }

  private async finish(id: string, response: ProviderResponseMessage): Promise<void> {
    await this.deps.store.setResult(id, { createdAt: this.deps.now(), response } satisfies StoredResult);
    await this.deps.store.clearPending(id);
  }

  // ── Helpers ────────────────────────────────────────────────────

  private async nextNonce(chainId: number, address: string): Promise<number> {
    const hex = await this.deps.rpc.getTransactionCount(chainId, address);
    return Number(BigInt(hex));
  }

  private async suggestFees(
    chainId: number,
  ): Promise<{ gasPriceHex?: string; maxFeePerGasHex?: string; maxPriorityFeePerGasHex?: string }> {
    try {
      const block = await this.deps.rpc.call<{ baseFeePerGas?: string }>(chainId, 'eth_getBlockByNumber', [
        'latest',
        false,
      ]);
      const base = block?.baseFeePerGas ? BigInt(block.baseFeePerGas) : 0n;
      if (base > 0n) {
        let priority = 1_000_000_000n;
        try {
          priority = BigInt(await this.deps.rpc.getMaxPriorityFeePerGas(chainId));
        } catch {
          // Node does not expose eth_maxPriorityFeePerGas — keep the 1 gwei default.
        }
        return {
          maxFeePerGasHex: bigIntToHex(base * 2n + priority),
          maxPriorityFeePerGasHex: bigIntToHex(priority),
        };
      }
    } catch {
      // Fall through to legacy pricing.
    }
    return { gasPriceHex: await this.deps.rpc.getGasPrice(chainId) };
  }

  private async readTokenMeta(
    chainId: number,
    token: string,
  ): Promise<{ symbol?: string; decimals: number } | undefined> {
    // Delegates to the shared reader so the confirmation screen and the token list can
    // never disagree about a token's decimals.
    const meta = await readTokenMetadata(this.deps.rpc, chainId, token).catch(() => null);
    return meta ?? undefined;
  }

  private async checkRisk(
    chainId: number,
    to: string | undefined,
    decoded: DecodedCall,
  ): Promise<ContractRisk> {
    if (!to || decoded.kind === 'nativeTransfer') {
      return { status: 'ok', risk: 'LOW', verified: true, flags: [], source: 'native transfer' };
    }

    try {
      const code = await this.deps.rpc.getCode(chainId, to);
      if (!code || code === '0x') {
        // An EOA target is not a contract interaction, so §12.4 does not apply.
        return { status: 'ok', risk: 'LOW', verified: true, flags: [], source: 'eoa' };
      }
    } catch {
      return { status: 'unavailable', reason: 'Could not read the target account' };
    }

    return this.deps.scamShield.check(to, chainId, {
      trusted: await this.deps.store.isTrusted(to),
    });
  }

  private buildTxDetails(
    tx: HexTxFields,
    decoded: DecodedCall,
    tokenMeta: { symbol?: string; decimals: number } | undefined,
  ): { label: string; value: string; mono?: boolean }[] {
    const details: { label: string; value: string; mono?: boolean }[] = [];
    const chain = getChain(tx.chainId);

    if (tx.to) details.push({ label: 'To', value: tx.to, mono: true });
    if (tx.valueHex && tx.valueHex !== '0x0') {
      details.push({ label: 'Amount', value: `${formatTokenAmount(BigInt(tx.valueHex), 18)} GIWA` });
    }

    const token = tokenFromDecoded(decoded);
    if (token && decoded.kind !== 'nativeTransfer') {
      const symbol = tokenMeta?.symbol ?? 'tokens';
      details.push({ label: 'Token', value: `${symbol} · ${token}`, mono: true });
    }
    if (decoded.kind === 'approve' || decoded.kind === 'increaseAllowance') {
      details.push({ label: 'Spender', value: decoded.spender, mono: true });
      details.push({
        label: 'Allowance',
        value: decoded.unlimited ? 'UNLIMITED (MAX_UINT256)' : formatTokenAmount(decoded.amount, decoded.decimals),
      });
    }
    if (decoded.kind === 'setApprovalForAll') {
      details.push({ label: 'Operator', value: decoded.operator, mono: true });
    }

    if (decoded.kind === 'contractCall') {
      details.push({ label: 'Function', value: decoded.selector, mono: true });
    }

    if (tx.gasHex) details.push({ label: 'Gas limit', value: BigInt(tx.gasHex).toString() });
    if (tx.maxFeePerGasHex) {
      details.push({
        label: 'Max fee',
        value: `${formatTokenAmount(BigInt(tx.maxFeePerGasHex), 9)} Gwei / gas`,
      });
    } else if (tx.gasPriceHex) {
      details.push({ label: 'Gas price', value: `${formatTokenAmount(BigInt(tx.gasPriceHex), 9)} Gwei` });
    }
    if (tx.nonce !== undefined) details.push({ label: 'Nonce', value: String(tx.nonce) });
    details.push({ label: 'Network', value: `${chain.name} (${chain.id})${chain.testnet ? ' · testnet' : ''}` });
    return details;
  }

  private describeRisk(risk: ContractRisk): ConfirmPayload['risk'] {
    switch (risk.status) {
      case 'trusted':
        return { label: 'Trusted', tone: 'ok', detail: 'You previously approved this contract' };
      case 'ok':
        return {
          label: `${risk.risk} RISK${risk.verified ? ' · source verified' : ' · unverified source'}`,
          tone: risk.risk === 'HIGH' ? 'high' : risk.risk === 'MEDIUM' ? 'warn' : 'ok',
          detail: risk.flags.length > 0 ? risk.flags.join('; ') : 'No flags reported',
        };
      case 'unavailable':
        return { label: 'NOT SCREENED', tone: 'warn', detail: risk.reason };
    }
  }

  private async defer(
    kind: PendingKind,
    request: ProviderRequestMessage,
    context: { origin: string; tabId?: number },
    content: { headline: string; details: { label: string; value: string }[] },
  ): Promise<ProviderOutcome> {
    const { index, address } = await this.deps.store.unlockedAccount();
    const settings = await this.deps.store.getSettings();
    const chain = getChain(settings.chainId);
    const id = request.id;
    await this.beginPending(id);

    const payload: ConfirmPayload = {
      id,
      kind,
      origin: context.origin,
      method: request.method,
      chainId: chain.id,
      chainName: chain.name,
      isTestnet: chain.testnet,
      headline: content.headline,
      details: [
        ...content.details,
        { label: 'Account', value: address, mono: true },
        { label: 'Network', value: `${chain.name} (${chain.id})` },
      ],
      blockers: [],
      warnings: [`This site will be able to see your address and ask you to sign transactions.`],
      acknowledgements: [],
      rules: ['§12.2 no TX without confirmation'],
      risk: { label: 'Not applicable', tone: 'muted', detail: 'Connection request' },
      accounts: [{ index, address }],
    };

    const pending: PendingRequest = {
      id,
      kind,
      createdAt: this.deps.now(),
      origin: context.origin,
      method: request.method,
      chainId: chain.id,
      accountIndex: index,
      from: address,
      allowUnlimited: false,
      broadcast: false,
      payload,
    };

    await this.deps.store.setPending(pending);
    await this.deps.openConfirm(payload);
    return { status: 'deferred', id };
  }
}
