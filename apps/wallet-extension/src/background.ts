/**
 * MV3 service worker — thin wiring between Chrome APIs and the dispatcher.
 *
 * No secrets are held in module scope: the unlocked secret lives in
 * `chrome.storage.session` (memory only), so losing this worker is harmless.
 */
import { RpcClient } from './lib/rpc';
import { createChromeStore, restrictSessionStorage } from './lib/storage';
import { createScamShield } from './safety/scamshield';
import { Dispatcher, type ExtMessage, type ExtResponse, type ProviderOutcome } from './runtime/dispatcher';
import { VaultStore } from './runtime/vault-store';
import type { ConfirmPayload } from './runtime/pending';
import type { ProviderRequestMessage } from './lib/messages';

const VERSION = __EXTENSION_VERSION__;
const RISK_API_BASE = __BLOCKMIND_API_URL__;

// The unlocked secret must never be readable from a content script.
void restrictSessionStorage();

const store = new VaultStore({
  local: createChromeStore('local'),
  session: createChromeStore('session'),
  now: () => Date.now(),
});

const dispatcher = new Dispatcher({
  store,
  rpc: new RpcClient(),
  scamShield: createScamShield({ baseUrl: RISK_API_BASE }),
  version: VERSION,
  now: () => Date.now(),
  openConfirm: async (payload: ConfirmPayload) => {
    await chrome.windows.create({
      url: chrome.runtime.getURL(`confirm.html?id=${encodeURIComponent(payload.id)}`),
      type: 'popup',
      width: 420,
      height: 780,
      focused: true,
    });
  },
  openPopup: async () => {
    try {
      await chrome.action.openPopup();
    } catch {
      // openPopup is not available in every Chrome build; the badge below still hints.
      await chrome.action.setBadgeText({ text: '!' }).catch(() => undefined);
    }
  },
});

interface RelayMessage {
  kind: 'provider_request';
  request: ProviderRequestMessage;
}

function isRelayMessage(value: unknown): value is RelayMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'provider_request' &&
    typeof (value as { request?: unknown }).request === 'object'
  );
}

/** Ext messages whose handling invalidates what pages believe about accounts or chain. */
const STATE_CHANGING: ReadonlySet<ExtMessage['type']> = new Set([
  'vault_unlock',
  'vault_lock',
  'vault_create',
  'vault_import_mnemonic',
  'vault_import_private_key',
  'vault_add_account',
  'vault_select_account',
  'settings_update',
  'pending_decide',
]);

function originOf(sender: chrome.runtime.MessageSender): string {
  if (sender.origin) return sender.origin;
  if (sender.url) {
    try {
      return new URL(sender.url).origin;
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err: unknown) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    );
  // Keep the channel open for the async response above.
  return true;
});

async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<{ outcome: ProviderOutcome } | ExtResponse> {
  if (isRelayMessage(message)) {
    const outcome = await dispatcher.handleProvider(message.request, {
      origin: originOf(sender),
      ...(sender.tab?.id !== undefined ? { tabId: sender.tab.id } : {}),
    });
    return { outcome };
  }

  const ext = message as ExtMessage;
  const response = await dispatcher.handleExtMessage(ext);
  if (response.ok && STATE_CHANGING.has(ext.type)) await broadcastState();
  return response;
}

/** Tells every open page that accounts or the active chain changed. */
async function broadcastState(): Promise<void> {
  let accounts: string[] = [];
  let chainId = 0;
  try {
    const status = await store.status();
    chainId = status.chainId;
    accounts = status.locked
      ? []
      : status.accounts.filter((account) => account.index === status.selectedIndex).map((account) => account.address);
  } catch {
    return;
  }

  const chainHex = `0x${chainId.toString(16)}`;
  const tabs = await chrome.tabs.query({}).catch(() => []);
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;
      await chrome.tabs.sendMessage(tab.id, { kind: 'event', event: 'accountsChanged', data: accounts }).catch(() => undefined);
      await chrome.tabs.sendMessage(tab.id, { kind: 'event', event: 'chainChanged', data: chainHex }).catch(() => undefined);
    }),
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.1–§12.5, ADR-011
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
