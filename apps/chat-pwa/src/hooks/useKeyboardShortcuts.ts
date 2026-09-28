import { useEffect } from 'react';

interface Shortcuts {
  onFocusInput?: () => void;
  onOpenPalette?: () => void;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onFocusInput, onOpenPalette, onNewChat, onToggleSidebar }: Shortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — command palette
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenPalette?.();
        return;
      }

      // Cmd/Ctrl+N — new chat
      if (isMod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewChat?.();
        return;
      }

      // Cmd/Ctrl+B — toggle sidebar
      if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // "/" — focus input when not in input
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        // Don't trigger if typing in other inputs
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // Escape — blur input (optional handled by palette)
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFocusInput, onOpenPalette, onNewChat, onToggleSidebar]);
}
