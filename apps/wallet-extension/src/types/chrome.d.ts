// Minimal ambient declarations for the Chrome extension APIs Blockmind Wallet uses.
// Declared locally (rather than pulling @types/chrome) so the extension builds from
// the existing pnpm store with no extra dependency.

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
      setAccessLevel?(level: { accessLevel: 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }): Promise<void>;
    }
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }
    interface StorageChangedEvent {
      addListener(cb: (changes: Record<string, StorageChange>, areaName: string) => void): void;
      removeListener(cb: (changes: Record<string, StorageChange>, areaName: string) => void): void;
    }
    const local: StorageArea;
    const session: StorageArea;
    const onChanged: StorageChangedEvent;
  }

  namespace runtime {
    interface MessageSender {
      id?: string;
      url?: string;
      origin?: string;
      tab?: { id?: number; url?: string };
    }
    interface MessageEvent {
      addListener(
        cb: (message: unknown, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean | void,
      ): void;
    }
    interface InstalledEvent {
      addListener(cb: (details: { reason: string }) => void): void;
    }
    const id: string | undefined;
    const lastError: { message?: string } | undefined;
    const onMessage: MessageEvent;
    const onInstalled: InstalledEvent;
    function sendMessage(message: unknown): Promise<unknown>;
    function getURL(path: string): string;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      windowId?: number;
    }
    function query(query: { active?: boolean; currentWindow?: boolean; url?: string }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }

  namespace action {
    const onClicked: { addListener(cb: (tab: tabs.Tab) => void): void };
    function openPopup(): Promise<void>;
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  }

  namespace windows {
    interface Window {
      id?: number;
    }
    function create(createData: {
      url: string;
      type?: 'normal' | 'popup' | 'panel';
      width?: number;
      height?: number;
      focused?: boolean;
    }): Promise<Window>;
    function remove(windowId: number): Promise<void>;
    function update(windowId: number, updateInfo: { focused?: boolean }): Promise<Window>;
  }
}
