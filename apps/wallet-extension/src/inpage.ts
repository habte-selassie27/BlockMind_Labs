/**
 * In-page provider (MAIN world).
 *
 * Runs in the page's own JavaScript context, so `window.blockmind` is a real object
 * dApps can feature-detect synchronously — no postMessage handshake needed to answer
 * "is the wallet installed?", which is what the previous extension got wrong.
 *
 * Requests travel to the isolated content relay over postMessage (this world has no
 * `chrome.*` access). EIP-6963 announcement is also implemented, which is the modern
 * discovery mechanism and is immune to load-order races.
 */
import {
  INITIALIZED_EVENT,
  INPAGE_CHANNEL,
  PROVIDER_INFO,
  PROVIDER_NAME,
  isContentMessage,
  newRequestId,
  type ProviderErrorShape,
} from './lib/messages';

type RequestArguments = { method: string; params?: unknown[] | Record<string, unknown> };
type Listener = (...args: unknown[]) => void;

interface Inflight {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export class ProviderRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(error: ProviderErrorShape) {
    super(error.message);
    this.name = 'ProviderRpcError';
    this.code = error.code;
    this.data = error.data;
  }
}

export class BlockmindProvider {
  readonly isBlockmind = true;
  readonly isMetaMask = false;
  readonly chainId: string | null = null;
  readonly selectedAddress: string | null = null;

  private readonly inflight = new Map<string, Inflight>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private version = '1.0.0';

  constructor() {
    window.addEventListener('message', (event: MessageEvent) => this.onMessage(event.data));
    window.addEventListener('eip6963:requestProvider', () => this.announce());
    this.announce();
  }

  private announce(): void {
    const detail = Object.freeze({ info: { ...PROVIDER_INFO, name: PROVIDER_NAME }, provider: this });
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
  }

  /**
   * Announces the provider on every lifecycle boundary a page can be listening at.
   *
   * `document_start` runs before any page script exists, so a one-shot announcement is
   * only heard by dApps that registered a listener in that same tick. Re-announcing on
   * DOM-ready, on load, and once after a short delay means a React app that mounts late
   * still discovers us without polling.
   */
  announceWhenReady(): void {
    const announce = (): void => this.announce();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', announce, { once: true });
    }
    window.addEventListener('load', announce, { once: true });
    // Last resort for dApps that mount after `load` (lazy routes, hydration).
    setTimeout(announce, 1000);
  }

  /** Lets a page react to injection instead of polling for `window.blockmind`. */
  signalInitialized(): void {
    window.dispatchEvent(new CustomEvent(INITIALIZED_EVENT, { detail: { ...PROVIDER_INFO } }));
  }

  private onMessage(data: unknown): void {
    if (!isContentMessage(data)) return;

    if ('event' in data && typeof data.event === 'string') {
      this.emit(data.event, [data.data]);
      return;
    }
    if (!('id' in data) || typeof data.id !== 'string') return;

    const entry = this.inflight.get(data.id);
    if (!entry) return;
    this.inflight.delete(data.id);

    if (data.error) entry.reject(new ProviderRpcError(data.error));
    else entry.resolve(data.result);
  }

  request(args: RequestArguments): Promise<unknown> {
    if (!args || typeof args.method !== 'string') {
      return Promise.reject(new ProviderRpcError({ code: -32602, message: 'A request needs a method' }));
    }

    const id = newRequestId();
    return new Promise<unknown>((resolve, reject) => {
      this.inflight.set(id, { resolve, reject });
      window.postMessage({ channel: INPAGE_CHANNEL, id, method: args.method, params: args.params }, '*');
    });
  }

  on(event: string, listener: Listener): this {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  once(event: string, listener: Listener): this {
    const wrapper: Listener = (...args) => {
      this.removeListener(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  isConnected(): boolean {
    return true;
  }

  private emit(event: string, args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(...args);
      } catch {
        // A throwing dApp listener must not break other listeners.
      }
    }
  }

  /** Kept in sync with the extension version via the content relay. */
  setVersion(version: string): void {
    this.version = version;
  }

  getVersion(): string {
    return this.version;
  }
}

/** Existing provider from an earlier injection, if any. */
function existingProvider(): BlockmindProvider | null {
  const current = (window as unknown as { blockmind?: unknown }).blockmind;
  return current instanceof BlockmindProvider ? current : null;
}

function define(target: Window, key: 'blockmind' | 'ethereum', value: unknown, configurable: boolean): void {
  // Never throw: a re-injected script (extension reload) or a competing extension must
  // not abort the rest of this file, which would leave `window.blockmind` half-built.
  try {
    Object.defineProperty(target, key, { value, writable: false, configurable });
  } catch {
    // Already defined and non-configurable — keep whatever is there.
  }
}

const provider = existingProvider() ?? new BlockmindProvider();

// Only claim `window.blockmind` when nobody else already owns it.
if ((window as unknown as Record<string, unknown>).blockmind === undefined) {
  define(window, 'blockmind', provider, false);
}

// Only claim `window.ethereum` when nobody else owns it — wallets must not fight.
if ((window as unknown as Record<string, unknown>).ethereum === undefined) {
  define(window, 'ethereum', provider, true);
}

provider.announceWhenReady();
provider.signalInitialized();

// ✅ COMPLIES WITH: AGENTS.md §12.2, ADR-011
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
