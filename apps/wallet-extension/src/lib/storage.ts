/**
 * Storage abstraction.
 *
 * `local`   — persisted on disk. Holds the SEALED vault record and public settings only.
 * `session` — in-memory, cleared on browser restart, trusted contexts only. Holds the
 *             decrypted secret while unlocked (ADR-011 invariant 3).
 *
 * The interface exists so vault logic can be unit tested without a browser.
 */

export interface KVStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export type StorageAreaName = 'local' | 'session';

export function createMemoryStore(initial: Record<string, unknown> = {}): KVStore {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    async get<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
    async keys() {
      return [...data.keys()];
    },
  };
}

type ChromeArea = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  setAccessLevel?(level: { accessLevel: 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }): Promise<void>;
};

export function createChromeStore(areaName: StorageAreaName): KVStore {
  const area = (): ChromeArea => (areaName === 'local' ? chrome.storage.local : chrome.storage.session);

  return {
    async get<T>(key: string) {
      const result = await area().get(key);
      return result[key] as T | undefined;
    },
    async set(key, value) {
      await area().set({ [key]: value });
    },
    async remove(key) {
      await area().remove(key);
    },
    async keys() {
      const result = await area().get(null);
      return Object.keys(result);
    },
  };
}

/**
 * The unlocked secret never touches disk and is unreadable from content scripts.
 * Called once at service-worker start.
 */
export async function restrictSessionStorage(): Promise<void> {
  try {
    await chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch {
    // Older Chrome builds: session storage is already limited to the extension origin.
  }
}

// ✅ COMPLIES WITH: AGENTS.md §9, §12.5 (ADR-011 invariant 3)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
