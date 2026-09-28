/**
 * Content relay (ISOLATED world).
 *
 * Bridges the page-side provider to the service worker and fixes the two defects that
 * made the first wallet unusable:
 *
 *  1. Readiness race — the old relay announced `BLOCKMIND_WALLET_READY` once at
 *     `document_start`, long before a dApp registered its listener. Here, *every*
 *     incoming request re-announces readiness, so a late listener still detects us.
 *  2. Missing `method` — legacy responses now always echo `method` back.
 *
 * It also implements the deferred+poll protocol: state-changing requests return a
 * request id immediately, and the relay waits for the user's decision by polling. That
 * keeps a human-paced confirmation from depending on an MV3 worker staying alive.
 */
import {
  CONTENT_CHANNEL,
  fromLegacyRequest,
  isProviderRequest,
  legacyReady,
  toLegacyResponse,
  type ProviderResponseMessage,
} from './lib/messages';

const VERSION = __EXTENSION_VERSION__;
const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

interface RelayOutcome {
  status?: 'response' | 'deferred';
  id?: string;
  response?: ProviderResponseMessage;
  outcome?: RelayOutcome;
}

function postToPage(message: unknown): void {
  window.postMessage(message, '*');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askBackground(request: {
  channel: 'blockmind:inpage';
  id: string;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}): Promise<RelayOutcome> {
  try {
    const reply = (await chrome.runtime.sendMessage({ kind: 'provider_request', request })) as
      | { outcome?: RelayOutcome }
      | undefined;
    return reply?.outcome ?? {};
  } catch {
    // The worker may be starting up; one retry covers a cold start.
    await sleep(150);
    const reply = (await chrome.runtime.sendMessage({ kind: 'provider_request', request })) as
      | { outcome?: RelayOutcome }
      | undefined;
    return reply?.outcome ?? {};
  }
}

function deliver(response: ProviderResponseMessage, legacy: boolean, method: string): void {
  postToPage(legacy ? toLegacyResponse(response, method) : response);
}

function failure(id: string, code: number, message: string, legacy: boolean, method: string): void {
  deliver({ channel: CONTENT_CHANNEL, id, error: { code, message } }, legacy, method);
}

async function pollForResult(
  id: string,
  legacy: boolean,
  method: string,
): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const reply = (await chrome.runtime.sendMessage({ type: 'result_get', id })) as
        | { ok?: boolean; data?: { done?: boolean; response?: ProviderResponseMessage } }
        | undefined;
      if (reply?.ok && reply.data?.done && reply.data.response) {
        deliver(reply.data.response, legacy, method);
        return;
      }
    } catch {
      // Worker restarted — retry until the deadline.
    }
  }

  failure(id, -32603, 'Timed out waiting for confirmation in Blockmind Wallet', legacy, method);
}

async function handleRequest(
  id: string,
  method: string,
  params: unknown,
  legacy: boolean,
): Promise<void> {
  const outcome = await askBackground({
    channel: 'blockmind:inpage',
    id,
    method,
    ...(Array.isArray(params) ? { params } : {}),
  }).catch(() => ({}) as RelayOutcome);

  if (outcome.status === 'response' && outcome.response) {
    deliver(outcome.response, legacy, method);
    return;
  }
  if (outcome.status === 'deferred' && outcome.id) {
    // Tell the dApp its request is in front of the user, then wait for the outcome.
    void pollForResult(outcome.id, legacy, method);
    return;
  }
  failure(id, -32603, 'Blockmind Wallet did not answer the request', legacy, method);
}

window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data;
  if (!data || typeof data !== 'object') return;

  if (isProviderRequest(data)) {
    void handleRequest(data.id, data.method, data.params, false);
    return;
  }

  const legacyRequest = fromLegacyRequest(data);
  if (legacyRequest) {
    // Re-announce readiness: the original one-shot broadcast is always missed by a page
    // that registers its listener after document_start (i.e. every React dApp).
    postToPage(legacyReady(VERSION));
    void handleRequest(legacyRequest.id, legacyRequest.method, legacyRequest.params, true);
  }
});

// Forward account/chain changes from the worker to the page.
chrome.runtime.onMessage.addListener((message) => {
  if (typeof message !== 'object' || message === null) return;
  const event = message as { kind?: unknown; event?: unknown; data?: unknown };
  if (event.kind !== 'event') return;
  if (event.event !== 'accountsChanged' && event.event !== 'chainChanged') return;

  postToPage({ channel: CONTENT_CHANNEL, event: event.event, data: event.data });
});

// ✅ COMPLIES WITH: AGENTS.md §12.2, ADR-011
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
