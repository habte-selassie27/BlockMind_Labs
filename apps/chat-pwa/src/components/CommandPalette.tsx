import { useState, useEffect, useRef, useMemo } from 'react';

interface Command {
  id: string;
  label: string;
  desc?: string;
  icon?: string;
  action: () => void;
  group: 'Actions' | 'Tools' | 'Navigation';
  keywords?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onToolClick?: (tool: string) => void;
  onNewChat?: () => void;
}

export default function CommandPalette({ open, onClose, onToolClick, onNewChat }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const commands: Command[] = useMemo(() => [
    { id: 'new', label: 'New chat', desc: 'Start a fresh conversation', group: 'Actions', keywords: ['new', 'chat', 'clear'], action: () => { onClose(); onNewChat?.(); } },
    { id: 'balance', label: 'Check balance', desc: 'Show GIWA balance', group: 'Tools', keywords: ['balance', 'giwa'], action: () => { onClose(); onToolClick?.('balance'); } },
    { id: 'transfer', label: 'Transfer tokens', desc: 'Send GIWA to an address', group: 'Tools', keywords: ['transfer', 'send'], action: () => { onClose(); onToolClick?.('transfer'); } },
    { id: 'swap', label: 'Swap tokens', desc: 'Swap GIWA ↔ USDC', group: 'Tools', keywords: ['swap', 'trade'], action: () => { onClose(); onToolClick?.('swap'); } },
    { id: 'gas', label: 'Gas tracker', desc: 'View current gas prices', group: 'Tools', keywords: ['gas', 'fee'], action: () => { onClose(); onToolClick?.('gas'); } },
    { id: 'approvals', label: 'Token approvals', desc: 'Manage ERC-20 approvals', group: 'Tools', keywords: ['approval', 'allowance'], action: () => { onClose(); onToolClick?.('approvals'); } },
    { id: 'chain', label: 'Multi-step', desc: 'Build chained transactions', group: 'Tools', keywords: ['chain', 'multi'], action: () => { onClose(); onToolClick?.('chain'); } },
    { id: 'portfolio', label: 'Go to Portfolio', desc: 'View portfolio dashboard', group: 'Navigation', keywords: ['portfolio'], action: () => { onClose(); window.location.hash = ''; window.location.pathname = '/portfolio'; } },
    { id: 'history', label: 'Transaction history', desc: 'View past transactions', group: 'Navigation', keywords: ['history', 'tx'], action: () => { onClose(); window.location.pathname = '/history'; } },
  ], [onClose, onNewChat, onToolClick]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.desc?.toLowerCase().includes(q) ||
      c.keywords?.some(k => k.includes(q))
    );
  }, [commands, query]);

  useEffect(() => { setActive(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.action();
    }
  };

  if (!open) return null;

  const groups = ['Actions', 'Tools', 'Navigation'] as const;

  return (
    <div className="cmd-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Type a command or search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-kbd">ESC</span>
        </div>

        <div className="cmd-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--chat-text-tertiary)', fontSize: 13 }}>
              No commands found for “{query}”
            </div>
          ) : (
            groups.map(g => {
              const items = filtered.filter(c => c.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <div className="cmd-group-label">{g}</div>
                  {items.map(cmd => {
                    const idx = filtered.indexOf(cmd);
                    return (
                      <div
                        key={cmd.id}
                        className={`cmd-item ${idx === active ? 'active' : ''}`}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setActive(idx)}
                        role="option"
                        aria-selected={idx === active}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          {cmd.id === 'new' && <><path d="M12 5v14M5 12h14" /></>}
                          {cmd.id === 'balance' && <><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></>}
                          {cmd.id === 'transfer' && <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></>}
                          {cmd.id === 'swap' && <><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>}
                          {(cmd.id === 'gas' || cmd.id === 'approvals' || cmd.id === 'chain') && <><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></>}
                          {(cmd.id === 'portfolio' || cmd.id === 'history') && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>}
                        </svg>
                        <span style={{ flex: 1 }}>{cmd.label}</span>
                        {cmd.desc && <span className="cmd-item-desc">{cmd.desc}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
