/**
 * Wire protocol between the three worlds of the extension:
 *
 *   page (MAIN world)  ──window.postMessage──▶  content relay (ISOLATED)  ──chrome.runtime──▶  background
 *
 * The MAIN world cannot touch `chrome.*`, so the page-side provider speaks postMessage
 * and the isolated content script relays to the service worker.
 *
 * Two protocols are accepted:
 *   • `blockmind:inpage`  — current protocol (id-matched, no readiness race)
 *   • `BLOCKMIND_REQUEST` — legacy protocol kept working for dApps built against the
 *                           first extension release. Legacy responses now always carry
 *                           `method`, and every incoming legacy request triggers a
 *                           fresh `BLOCKMIND_WALLET_READY` so late-registering pages
 *                           (which missed the document_start broadcast) still detect us.
 */

export const INPAGE_CHANNEL = 'blockmind:inpage';
export const CONTENT_CHANNEL = 'blockmind:content';

export const LEGACY_REQUEST = 'BLOCKMIND_REQUEST';
export const LEGACY_RESPONSE = 'BLOCKMIND_RESPONSE';
export const LEGACY_READY = 'BLOCKMIND_WALLET_READY';

export const PROVIDER_NAME = 'Blockmind Wallet';
export const PROVIDER_RDNS = 'io.blockmind.wallet';

/**
 * Fired on `window` the moment the provider is installed.
 *
 * dApps that mount after `document_start` (every React app) can listen for this instead
 * of polling `window.blockmind` or racing the EIP-6963 announcement.
 */
export const INITIALIZED_EVENT = 'blockmind#initialized';

/** EIP-6963 provider info — lets dApps discover us with no timing race at all. */
export const PROVIDER_INFO = {
  uuid: 'a1f2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  name: PROVIDER_NAME,
  icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZD0iTTE2IDMgMjcgOS41djEzbC0xMSA2LjVMNSAyMi41di0xM3oiIGZpbGw9IiNDMTVGM0MiLz48L3N2Zz4=',
  rdns: PROVIDER_RDNS,
} as const;

export interface ProviderErrorShape {
  code: number;
  message: string;
  data?: unknown;
}

export interface ProviderRequestMessage {
  channel: typeof INPAGE_CHANNEL;
  id: string;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export interface ProviderResponseMessage {
  channel: typeof CONTENT_CHANNEL;
  id: string;
  result?: unknown;
  error?: ProviderErrorShape;
}

export interface ProviderEventMessage {
  channel: typeof CONTENT_CHANNEL;
  event: 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect' | 'message';
  data: unknown;
}

export type ContentMessage = ProviderResponseMessage | ProviderEventMessage;

let requestCounter = 0;

/** Monotonic + random id so ids stay unique across page lives and SW restarts. */
export function newRequestId(): string {
  requestCounter += 1;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasChannel(value: unknown, channel: string): boolean {
  return typeof value === 'object' && value !== null && (value as { channel?: unknown }).channel === channel;
}

export function isProviderRequest(value: unknown): value is ProviderRequestMessage {
  if (!hasChannel(value, INPAGE_CHANNEL)) return false;
  const msg = value as Partial<ProviderRequestMessage>;
  return typeof msg.id === 'string' && typeof msg.method === 'string';
}

export function isContentMessage(value: unknown): value is ContentMessage {
  if (!hasChannel(value, CONTENT_CHANNEL)) return false;
  const msg = value as { id?: unknown; event?: unknown };
  return typeof msg.id === 'string' || typeof msg.event === 'string';
}

export function successResponse(id: string, result: unknown): ProviderResponseMessage {
  return { channel: CONTENT_CHANNEL, id, result };
}

export function errorResponse(id: string, error: ProviderErrorShape): ProviderResponseMessage {
  return { channel: CONTENT_CHANNEL, id, error };
}

/** Normalizes a legacy `BLOCKMIND_REQUEST` into the current protocol. */
export function fromLegacyRequest(value: unknown): ProviderRequestMessage | null {
  if (typeof value !== 'object' || value === null) return null;
  const msg = value as { type?: unknown; method?: unknown; params?: unknown; id?: unknown };
  if (msg.type !== LEGACY_REQUEST || typeof msg.method !== 'string') return null;
  return {
    channel: INPAGE_CHANNEL,
    id: typeof msg.id === 'string' ? msg.id : String(msg.id ?? newRequestId()),
    method: msg.method,
    params: Array.isArray(msg.params) ? msg.params : undefined,
  };
}

/**
 * Legacy responses. `method` is included because the first-generation dApp matched on
 * it — omitting it was one of the original wallet's defects.
 */
export function toLegacyResponse(
  response: ProviderResponseMessage,
  method: string,
): { type: typeof LEGACY_RESPONSE; id: string; method: string; result?: unknown; error?: ProviderErrorShape } {
  return response.error
    ? { type: LEGACY_RESPONSE, id: response.id, method, error: response.error }
    : { type: LEGACY_RESPONSE, id: response.id, method, result: response.result };
}

export function legacyReady(version: string): { type: typeof LEGACY_READY; version: string } {
  return { type: LEGACY_READY, version };
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
