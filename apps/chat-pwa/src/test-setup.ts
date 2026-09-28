/**
 * Node ≥22 ships an experimental global `localStorage` that resolves to
 * `undefined` unless `--localstorage-file` is passed. Because the binding
 * already exists on `globalThis`, vitest cannot install jsdom's
 * implementation either — so tests would see an unusable `localStorage`.
 *
 * This setup installs a small in-memory Storage whenever the global is
 * missing, keeping watchlist/session tests hermetic.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      const k = String(key);
      return store.has(k) ? (store.get(k) as string) : null;
    },
    setItem(key: string, value: string): void {
      store.set(String(key), String(value));
    },
    removeItem(key: string): void {
      store.delete(String(key));
    },
    clear(): void {
      store.clear();
    },
  } as Storage;
}

const current: Storage | undefined = (() => {
  try {
    return typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined;
  } catch {
    return undefined;
  }
})();

if (!current || typeof current.getItem !== 'function') {
  const storage = createMemoryStorage();
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  } catch {
    // Non-configurable host binding — tests that touch storage will fail loudly.
  }
  if (typeof globalThis.window !== 'undefined') {
    try {
      Object.defineProperty(globalThis.window, 'localStorage', { value: storage, configurable: true });
    } catch {}
  }
}

export {};

// ✅ COMPLIES WITH: AGENTS.md §13 (test infrastructure)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
