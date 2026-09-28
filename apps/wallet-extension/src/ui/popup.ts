/**
 * Wallet popup — onboarding, unlock, accounts, network, and send.
 *
 * The popup never touches key material directly: every vault operation goes through the
 * service worker, which is the only context that reads the sealed record. Values coming
 * back from the vault are rendered with `textContent`.
 */
import { CHAINS, explorerTxUrl } from '../lib/chains';
import { RpcClient } from '../lib/rpc';
import { readTokenBalance, tokensForChain, type TokenConfig } from '../lib/tokens';
import { formatTokenAmount, shortAddress } from '../safety/calldata';
import type { ExportedSecret, VaultStatus } from '../vault/types';

const VERSION = __EXTENSION_VERSION__;
const root = document.getElementById('root');
const netBadge = document.getElementById('net-badge');
const versionLabel = document.getElementById('version');

if (versionLabel) versionLabel.textContent = `v${VERSION}`;

const rpc = new RpcClient();
let banner: string | undefined;

// ── DOM helpers ──────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, variant: 'primary' | 'secondary' | 'danger', onClick: () => void): HTMLButtonElement {
  const node = el('button', `btn btn-${variant}`, label);
  node.addEventListener('click', onClick);
  return node;
}

function field(label: string, input: HTMLElement): HTMLElement {
  const wrap = el('div');
  wrap.appendChild(el('label', undefined, label));
  wrap.appendChild(input);
  return wrap;
}

function input(type: string, placeholder?: string): HTMLInputElement {
  const node = document.createElement('input');
  node.type = type;
  if (placeholder) node.placeholder = placeholder;
  return node;
}

function mount(...nodes: Node[]): void {
  if (!root) return;
  const children: Node[] = [];
  if (banner) children.push(el('div', 'error', banner));
  children.push(...nodes);
  root.replaceChildren(...children);
}

async function call<T = unknown>(message: unknown): Promise<T> {
  const reply = (await chrome.runtime.sendMessage(message)) as
    | { ok?: boolean; data?: T; error?: string }
    | undefined;
  if (!reply) throw new Error('The extension did not respond — try reopening the popup');
  if (!reply.ok) throw new Error(reply.error ?? 'Request failed');
  return reply.data as T;
}

async function guard(action: () => Promise<void>): Promise<void> {
  banner = undefined;
  try {
    await action();
  } catch (err) {
    banner = err instanceof Error ? err.message : String(err);
    await refresh();
  }
}

function shortError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function passwordFields(): { password: HTMLInputElement; confirm: HTMLInputElement; wrap: HTMLElement } {
  const password = input('password', 'At least 8 characters');
  const confirm = input('password', 'Repeat password');
  const wrap = el('div', 'stack');
  wrap.appendChild(field('Vault password', password));
  wrap.appendChild(field('Confirm password', confirm));
  wrap.appendChild(
    el('p', 'muted', 'This password encrypts your keys on this device. Blockmind cannot reset it.'),
  );
  return { password, confirm, wrap };
}

function validatePassword(password: string, confirm: string): string | undefined {
  if (password.length < 8) return 'Use a password of at least 8 characters';
  if (password !== confirm) return 'The passwords do not match';
  return undefined;
}

function networkBadge(chainId: number): void {
  if (!netBadge) return;
  const chain = CHAINS[chainId];
  netBadge.textContent = chain ? chain.name : `Chain ${chainId}`;
  netBadge.className = `badge ${chain?.testnet ? 'badge-warn' : 'badge-ok'}`;
}

// ── Views ────────────────────────────────────────────────────────

function viewOnboarding(): void {
  const wrap = el('div', 'stack');
  wrap.appendChild(el('h1', undefined, 'Set up your wallet'));
  wrap.appendChild(
    el(
      'p',
      'muted',
      'Blockmind Wallet generates and stores your keys on this device only. Nothing is ever sent to a server.',
    ),
  );

  const [createTab, importTab] = [el('button', 'tab', 'Create new'), el('button', 'tab', 'Import')];
  createTab.setAttribute('aria-selected', 'true');
  importTab.setAttribute('aria-selected', 'false');
  const tabs = el('div', 'tabs');
  tabs.append(createTab, importTab);

  const panel = el('div', 'stack');
  wrap.append(tabs, panel);

  const renderCreate = (): void => {
    createTab.setAttribute('aria-selected', 'true');
    importTab.setAttribute('aria-selected', 'false');
    panel.replaceChildren();

    const words = document.createElement('select');
    words.append(new Option('12 words (recommended)', '12'), new Option('24 words', '24'));

    const { password, confirm, wrap: passwordWrap } = passwordFields();
    const submit = button('Create wallet', 'primary', () =>
      guard(async () => {
        const problem = validatePassword(password.value, confirm.value);
        if (problem) throw new Error(problem);
        const data = await call<VaultStatus & { backupPhrase?: string }>({
          type: 'vault_create',
          password: password.value,
          words: words.value === '24' ? 24 : 12,
        });
        if (data.backupPhrase) viewBackup(data.backupPhrase);
        else await refresh();
      }),
    );
    submit.classList.add('btn-block');

    panel.append(field('Recovery phrase length', words), passwordWrap, submit);
  };

  const renderImport = (): void => {
    createTab.setAttribute('aria-selected', 'false');
    importTab.setAttribute('aria-selected', 'true');
    panel.replaceChildren();

    const secret = document.createElement('textarea');
    secret.placeholder = 'Twelve words separated by spaces, or a 0x private key';

    const { password, confirm, wrap: passwordWrap } = passwordFields();
    const submit = button('Import wallet', 'primary', () =>
      guard(async () => {
        const problem = validatePassword(password.value, confirm.value);
        if (problem) throw new Error(problem);
        const value = secret.value.trim();
        if (!value) throw new Error('Enter a recovery phrase or private key');
        if (value.startsWith('0x')) {
          await call({ type: 'vault_import_private_key', password: password.value, privateKey: value });
        } else {
          await call({ type: 'vault_import_mnemonic', password: password.value, mnemonic: value });
        }
        await refresh();
      }),
    );
    submit.classList.add('btn-block');

    panel.append(
      field('Recovery phrase or private key', secret),
      passwordWrap,
      submit,
      el('p', 'muted', 'A private key vault holds a single account and cannot derive more.'),
    );
  };

  createTab.addEventListener('click', renderCreate);
  importTab.addEventListener('click', renderImport);

  renderCreate();
  mount(wrap);
}

function viewBackup(phrase: string): void {
  const wrap = el('div', 'stack');
  wrap.appendChild(el('h1', undefined, 'Save your recovery phrase'));
  wrap.appendChild(
    el('p', 'notice', 'Write these words down and keep them offline. Anyone with them owns your funds.'),
  );

  const grid = el('div', 'phrase-grid');
  phrase.split(' ').forEach((word, index) => {
    const cell = el('div', 'phrase-word');
    cell.appendChild(el('span', 'phrase-index', String(index + 1)));
    cell.appendChild(el('span', undefined, word));
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);

  const copy = button('Copy phrase', 'secondary', () =>
    guard(async () => {
      await navigator.clipboard.writeText(phrase);
      copy.textContent = 'Copied';
    }),
  );
  copy.classList.add('btn-block');

  const done = button('I have saved it', 'primary', () => void refresh());
  done.classList.add('btn-block');

  wrap.append(copy, done);
  mount(wrap);
}

function viewLocked(): void {
  const wrap = el('div', 'stack');
  wrap.appendChild(el('h1', undefined, 'Wallet locked'));

  const password = input('password', 'Vault password');
  const unlock = button('Unlock', 'primary', () =>
    guard(async () => {
      await call({ type: 'vault_unlock', password: password.value });
      await refresh();
    }),
  );
  unlock.classList.add('btn-block');
  password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlock.click();
  });

  wrap.append(field('Password', password), unlock);
  mount(wrap);
}

function viewMain(status: VaultStatus): void {
  const wrap = el('div', 'stack');
  const selected = status.accounts.find((account) => account.index === status.selectedIndex);
  const address = selected?.address ?? status.address ?? '';

  // ── Account ────────────────────────────────────────────────────
  const card = el('div', 'card stack');

  if (status.accounts.length > 1) {
    const select = document.createElement('select');
    for (const account of status.accounts) {
      select.append(new Option(`Account ${account.index} · ${shortAddress(account.address)}`, String(account.index)));
    }
    select.value = String(status.selectedIndex);
    select.addEventListener('change', () =>
      void guard(async () => {
        await call({ type: 'vault_select_account', index: Number(select.value) });
        await refresh();
      }),
    );
    card.appendChild(field('Account', select));
  }

  card.appendChild(el('span', 'section-title', 'Address'));
  const addressRow = el('div', 'copy-row');
  const addressInput = input('text');
  addressInput.value = address;
  addressInput.readOnly = true;
  const copyAddress = button('Copy', 'secondary', () =>
    void guard(async () => {
      await navigator.clipboard.writeText(address);
      copyAddress.textContent = 'Copied';
    }),
  );
  addressRow.append(addressInput, copyAddress);
  card.appendChild(addressRow);

  const balance = el('div', 'balance', '—');
  balance.appendChild(el('span', 'balance-unit', 'GIWA'));
  card.appendChild(balance);
  wrap.appendChild(card);

  void loadBalance(status.chainId, address, balance);

  // ── Network ────────────────────────────────────────────────────
  const netCard = el('div', 'card stack');
  const chainSelect = document.createElement('select');
  for (const chain of Object.values(CHAINS)) {
    chainSelect.append(new Option(`${chain.name} (${chain.id})`, String(chain.id)));
  }
  chainSelect.value = String(status.chainId);
  chainSelect.addEventListener('change', () =>
    void guard(async () => {
      await call({ type: 'settings_update', patch: { chainId: Number(chainSelect.value) } });
      await refresh();
    }),
  );
  netCard.appendChild(field('Network', chainSelect));
  wrap.appendChild(netCard);

  // ── Send ───────────────────────────────────────────────────────
  const chainTokens = tokensForChain(status.tokens, status.chainId);
  const sendCard = el('div', 'card stack');
  sendCard.appendChild(el('span', 'section-title', 'Send'));

  const asset = document.createElement('select');
  asset.append(new Option('GIWA (native)', 'native'));
  for (const token of chainTokens) {
    asset.append(new Option(`${token.symbol} · ${shortAddress(token.address)}`, token.address));
  }

  const to = input('text', '0x recipient');
  const amount = input('text', '0.0');
  const amountField = field('Amount (GIWA)', amount);
  const result = el('div', 'muted');

  // The amount label must follow the selected asset so the user never guesses the unit.
  asset.addEventListener('change', () => {
    const symbol =
      asset.value === 'native'
        ? 'GIWA'
        : chainTokens.find((token) => token.address === asset.value)?.symbol ?? 'TOKEN';
    amountField.replaceChildren(el('label', undefined, `Amount (${symbol})`), amount);
  });

  const send = button('Review & send', 'primary', () =>
    void guard(async () => {
      send.disabled = true;
      try {
        const selected = asset.value;
        const data = await call<{ id?: string }>({
          type: 'send_form',
          to: to.value.trim(),
          amount: amount.value,
          ...(selected === 'native' ? {} : { token: selected }),
        });
        if (!data?.id) throw new Error('The wallet could not start this transfer');
        result.textContent = 'Waiting for your confirmation in the Blockmind window…';
        await pollResult(data.id, result, status.chainId);
      } finally {
        send.disabled = false;
      }
    }),
  );
  send.classList.add('btn-block');
  sendCard.append(field('Asset', asset), field('Recipient', to), amountField, send, result);
  wrap.appendChild(sendCard);

  // ── Tokens ─────────────────────────────────────────────────────
  wrap.appendChild(viewTokens(status, chainTokens, address));

  // ── Vault management ──────────────────────────────────────────
  const manage = el('div', 'card stack');
  manage.appendChild(el('span', 'section-title', 'Wallet'));

  const autoLock = document.createElement('select');
  for (const minutes of [5, 15, 30, 60]) {
    autoLock.append(new Option(`${minutes} minutes`, String(minutes)));
  }
  autoLock.value = String(status.autoLockMinutes);
  autoLock.addEventListener('change', () =>
    void guard(async () => {
      await call({ type: 'settings_update', patch: { autoLockMinutes: Number(autoLock.value) } });
      await refresh();
    }),
  );
  manage.appendChild(field('Auto-lock after inactivity', autoLock));

  const addAccount = button('Add account', 'secondary', () =>
    void guard(async () => {
      await call({ type: 'vault_add_account' });
      await refresh();
    }),
  );
  addAccount.classList.add('btn-block');

  const reveal = button('Export keys', 'secondary', () => void viewReveal());
  reveal.classList.add('btn-block');

  const lock = button('Lock now', 'danger', () =>
    void guard(async () => {
      await call({ type: 'vault_lock' });
      await refresh();
    }),
  );
  lock.classList.add('btn-block');

  manage.append(addAccount, reveal, lock);
  wrap.appendChild(manage);

  mount(wrap);
}

/**
 * ERC-20 list: balances plus add/remove.
 *
 * Metadata is read from the chain by the worker, not typed in here, so a token's
 * decimals cannot be spoofed into making the confirmation screen show the wrong amount.
 */
function viewTokens(status: VaultStatus, chainTokens: TokenConfig[], owner: string): HTMLElement {
  const card = el('div', 'card stack');
  card.appendChild(el('span', 'section-title', 'Tokens'));

  if (chainTokens.length === 0) {
    card.appendChild(el('p', 'muted', 'No ERC-20 tokens added yet.'));
  }

  for (const token of chainTokens) {
    const row = el('div', 'token-row');

    const label = el('div', 'token-label');
    label.append(
      el('span', 'token-symbol', token.symbol),
      el('span', 'token-address', shortAddress(token.address)),
    );

    const amount = el('span', 'token-amount', '—');
    const remove = button('Remove', 'danger', () =>
      void guard(async () => {
        await call({ type: 'token_remove', chainId: token.chainId, address: token.address });
        await refresh();
      }),
    );

    row.append(label, amount, remove);
    card.appendChild(row);
    void loadTokenBalance(token, owner, amount);
  }

  const addAddress = input('text', '0x token contract');
  const add = button('Add token', 'secondary', () =>
    void guard(async () => {
      await call({ type: 'token_add', address: addAddress.value, chainId: status.chainId });
      await refresh();
    }),
  );
  add.classList.add('btn-block');

  card.append(field('Add a token by address', addAddress), add);
  return card;
}

async function loadTokenBalance(
  token: TokenConfig,
  owner: string,
  target: HTMLElement,
): Promise<void> {
  const wei = await readTokenBalance(rpc, token.chainId, token.address, owner);
  if (wei === null) {
    target.textContent = 'unavailable';
    return;
  }
  target.textContent = formatTokenAmount(wei, token.decimals);
}

async function loadBalance(chainId: number, address: string, target: HTMLElement): Promise<void> {
  try {
    const wei = await rpc.getBalance(chainId, address);
    target.replaceChildren(
      document.createTextNode(formatTokenAmount(BigInt(wei), 18)),
      el('span', 'balance-unit', 'GIWA'),
    );
  } catch {
    target.replaceChildren(el('span', 'muted', 'Balance unavailable — RPC unreachable'));
  }
}

async function pollResult(
  id: string,
  target: HTMLElement,
  chainId: number,
): Promise<void> {
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const data = await call<{ done: boolean; response?: { result?: string; error?: { message: string } } }>({
        type: 'result_get',
        id,
      });
      if (!data.done) continue;

      if (data.response?.error) {
        target.replaceChildren(el('span', 'error', data.response.error.message));
        return;
      }
      const hash = data.response?.result;
      if (typeof hash === 'string') {
        const link = el('a', 'link', `${shortAddress(hash)} on the explorer`) as HTMLAnchorElement;
        link.href = explorerTxUrl(chainId, hash);
        link.target = '_blank';
        link.rel = 'noreferrer';
        target.replaceChildren(document.createTextNode('Submitted · '), link);
      } else {
        target.replaceChildren(el('span', 'muted', 'Request completed'));
      }
      return;
    } catch {
      // Worker restarting — keep polling.
    }
  }
  target.replaceChildren(el('span', 'error', 'Timed out waiting for confirmation'));
}

async function viewReveal(): Promise<void> {
  const wrap = el('div', 'stack');
  wrap.appendChild(el('h1', undefined, 'Export keys'));

  const password = input('password', 'Vault password');
  const output = el('div', 'stack');
  const reveal = button('Reveal', 'danger', () =>
    void guard(async () => {
      const secret = await call<ExportedSecret>({ type: 'vault_reveal', password: password.value });
      output.replaceChildren();
      if (secret.mnemonic) {
        output.appendChild(el('p', 'notice', 'Anyone with this phrase owns your funds.'));
        output.appendChild(el('div', 'mono', secret.mnemonic));
      }
      if (secret.privateKey) {
        output.appendChild(el('p', 'notice', 'Anyone with this key owns your funds.'));
        output.appendChild(el('div', 'mono', secret.privateKey));
      }
    }),
  );
  reveal.classList.add('btn-block');

  wrap.append(field('Confirm your password', password), reveal, output, button('Back', 'secondary', () => void refresh()));
  mount(wrap);
}

async function refresh(): Promise<void> {
  try {
    const status = await call<VaultStatus>({ type: 'vault_status' });
    networkBadge(status.chainId);
    if (!status.exists) viewOnboarding();
    else if (status.locked) viewLocked();
    else viewMain(status);
  } catch (err) {
    mount(el('p', 'error', shortError(err)));
  }
}

void refresh();

// ✅ COMPLIES WITH: AGENTS.md §12.5 (see ADR-011)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
