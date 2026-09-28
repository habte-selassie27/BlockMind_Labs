/**
 * Discovery for the Blockmind Wallet browser extension.
 *
 * The extension injects `window.blockmind` from a MAIN-world content script at
 * `document_start`, so a synchronous feature check is reliable and needs no handshake.
 * EIP-6963 is also supported as a fallback (and is the multi-wallet-safe mechanism), so
 * a page that somehow misses the injection can still find the provider.
 *
 * This replaces the old postMessage handshake, which raced with the extension's one-shot
 * readiness broadcast and reported "not detected" even when the wallet was installed.
 */

export interface Eip1193RequestArgs {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export interface Eip1193Provider {
  request(args: Eip1193RequestArgs): Promise<unknown>;
  on?(event: string, listener: (...args: any[]) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
  isBlockmind?: boolean;
}

interface Eip6963Detail {
  info?: { rdns?: string; name?: string };
  provider?: Eip1193Provider;
}

const BLOCKMIND_RDNS = 'io.blockmind.wallet';

/**
 * Dispatched on `window` by the extension the moment `window.blockmind` is installed.
 * Must stay in sync with `INITIALIZED_EVENT` in the extension's `lib/messages.ts`.
 */
export const BLOCKMIND_INITIALIZED_EVENT = 'blockmind#initialized';

/** Where to send users who do not have the extension yet. */
export const BLOCKMIND_INSTALL_URL = '/extension/';

/**
 * Resolves once the provider is injected, or `null` when it never appears.
 *
 * Used by the UI to keep the "installed" indicator live: `isBlockmindInstalled()` is a
 * point-in-time read, and the extension can finish injecting after React's first render.
 */
export function onProviderAvailable(
  callback: (provider: Eip1193Provider) => void,
  timeoutMs = 4000,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const settle = () => {
    const provider = readInjected();
    if (provider) {
      cleanup();
      callback(provider);
    }
  };

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Detail>).detail;
    if (detail?.info?.rdns === BLOCKMIND_RDNS && detail.provider) {
      cleanup();
      callback(detail.provider);
      return;
    }
    settle();
  };

  const timers = [0, 100, 300, 800, 1500].map((ms) => window.setTimeout(settle, ms));
  const deadline = window.setTimeout(cleanup, timeoutMs);

  function cleanup() {
    window.removeEventListener('eip6963:announceProvider', onAnnounce);
    window.removeEventListener(BLOCKMIND_INITIALIZED_EVENT, settle);
    timers.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(deadline);
  }

  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.addEventListener(BLOCKMIND_INITIALIZED_EVENT, settle);
  // Ask any already-loaded EIP-6963 provider to re-announce itself.
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  settle();

  return cleanup;
}

function readInjected(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { blockmind?: Eip1193Provider }).blockmind;
  return candidate && typeof candidate.request === 'function' ? candidate : null;
}

/** Synchronous check — true whenever the extension is installed on this page. */
export function isBlockmindInstalled(): boolean {
  return readInjected() !== null;
}

/**
 * Resolves the Blockmind provider, waiting briefly for an EIP-6963 announcement if the
 * injected provider is not already present.
 */
export async function discoverProvider(timeoutMs = 1200): Promise<Eip1193Provider | null> {
  const injected = readInjected();
  if (injected) return injected;

  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return null;

  return new Promise<Eip1193Provider | null>((resolve) => {
    let settled = false;
    const finish = (provider: Eip1193Provider | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      clearTimeout(timer);
      resolve(provider);
    };

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      if (detail?.info?.rdns === BLOCKMIND_RDNS && detail.provider) finish(detail.provider);
    };

    const timer = setTimeout(() => finish(readInjected()), timeoutMs);
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  });
}
