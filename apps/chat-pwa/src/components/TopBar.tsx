import { useState, useRef, useEffect } from 'react';

interface Props {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  connected: boolean;
  connecting: boolean;
  provider: string | null;
  /** Connected as a watched address (no keys, no signing). */
  isViewOnly?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchChain: (chainId: number) => void;
  onOpenWatch?: () => void;
  onToggleSidebar?: () => void;
  onOpenPalette?: () => void;
}

const CHAINS = [
  { id: 91342, name: 'GIWA Sepolia', color: '#F59E0B', short: 'Sepolia' },
  { id: 9134, name: 'GIWA Mainnet', color: '#22c55e', short: 'Mainnet' },
];

export default function TopBar({
  address,
  chainId,
  balance,
  connected,
  connecting,
  provider,
  isViewOnly = false,
  onConnect,
  onDisconnect,
  onSwitchChain,
  onOpenWatch,
  onToggleSidebar,
  onOpenPalette,
}: Props) {
  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const chainMenuRef = useRef<HTMLDivElement>(null);
  const disconnectRef = useRef<HTMLDivElement>(null);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;
  const chain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chainMenuRef.current && !chainMenuRef.current.contains(e.target as Node)) setShowChainMenu(false);
      if (disconnectRef.current && !disconnectRef.current.contains(e.target as Node)) setShowDisconnect(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger — mobile */}
        <button className="hamburger" onClick={onToggleSidebar} aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <div className="topbar-logo" style={{ cursor: 'default' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Blockmind</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--chat-text-faint)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--chat-border-soft)', padding: '2px 6px', borderRadius: 9999, marginLeft: 6 }}>BETA</span>
        </div>

        {/* Chain selector — desktop */}
        <div ref={chainMenuRef} style={{ position: 'relative' }} className="topbar-center">
          <button
            className="chain-badge"
            onClick={() => connected && setShowChainMenu(!showChainMenu)}
            style={{ cursor: connected ? 'pointer' : 'default' }}
            aria-haspopup="menu"
            aria-expanded={showChainMenu}
          >
            <span className="chain-badge-dot" style={{ background: chain.color, boxShadow: `0 0 8px ${chain.color}66` }} />
            <span className="chain-name">{chain.name}</span>
            {connected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><path d="M6 9l6 6 6-6" /></svg>}
          </button>

          {showChainMenu && connected && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: 'var(--chat-surface)',
                border: '1px solid var(--chat-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--chat-shadow-elevated)',
                minWidth: 200,
                zIndex: 60,
                padding: 6,
                animation: 'scaleIn 160ms var(--ease-out) both',
              }}
              role="menu"
            >
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSwitchChain(c.id); setShowChainMenu(false); }}
                  role="menuitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 10px',
                    background: c.id === chainId ? 'var(--chat-brand-soft)' : 'transparent',
                    border: '1px solid ' + (c.id === chainId ? 'rgba(217,122,92,0.16)' : 'transparent'),
                    borderRadius: 'var(--radius-md)',
                    color: c.id === chainId ? 'var(--chat-brand)' : 'var(--chat-text-primary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: c.id === chainId ? 600 : 450,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: c.color, boxShadow: `0 0 6px ${c.color}66`, flexShrink: 0 }} />
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>{c.short}</span>
                  {c.id === chainId && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6L9 17l-5-5" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Search / palette trigger */}
        <button
          onClick={onOpenPalette}
          title="Command palette (⌘K)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--chat-border-soft)',
            borderRadius: 9999,
            color: 'var(--chat-text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
          }}
          className="hide-mobile"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <span style={{ color: 'var(--chat-text-tertiary)' }}>Search</span>
          <span style={{ background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 6, padding: '1px 5px', fontSize: 10, marginLeft: 4 }}>⌘K</span>
        </button>

        <div className="topbar-status" title={connected ? `Connected to ${chain.name}` : 'Not connected'}>
          <span className="status-dot" style={{ background: connected ? '#22c55e' : '#57534E', boxShadow: connected ? '0 0 8px rgba(34,197,94,0.45)' : 'none' }} />
          <span className="hide-mobile">{connected ? chain.short : 'Not connected'}</span>
        </div>

        {connected && <span className="tier-badge hide-mobile">FREE</span>}

        {connected && isViewOnly && (
          <button
            className="badge badge-warning"
            onClick={onOpenWatch}
            title="View-only mode — open the watch dashboard"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <span aria-hidden>👁</span> WATCH
          </button>
        )}

        {connected && !isViewOnly && onOpenWatch && (
          <button
            onClick={onOpenWatch}
            title="Watch dashboard"
            aria-label="Open watch dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--chat-border-soft)',
              color: 'var(--chat-text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        )}

        {connected && balance && (
          <span
            title={`${balance} GIWA`}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--chat-text-primary)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--chat-border-soft)',
              padding: '5px 10px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            className="hide-mobile"
          >
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#F59E0B' }} />
            {balance} GIWA
          </span>
        )}

        {connected && shortAddress ? (
          <div ref={disconnectRef} style={{ position: 'relative' }}>
            <button className="wallet-btn" onClick={() => setShowDisconnect(!showDisconnect)} aria-haspopup="menu" aria-expanded={showDisconnect}>
              <span className="chain-dot" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
              {shortAddress}
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', fontSize: 11 }}>
                {provider === 'metamask' ? '🦊' : provider === 'blockmind' ? '⬡' : isViewOnly ? '👁' : '•'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {showDisconnect && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--chat-surface)',
                  border: '1px solid var(--chat-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--chat-shadow-elevated)',
                  minWidth: 260,
                  zIndex: 60,
                  padding: 12,
                  animation: 'scaleIn 160ms var(--ease-out) both',
                }}
                role="menu"
              >
                <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isViewOnly ? 'View-only · no signing' : `Connected via ${provider || 'wallet'}`}
                </div>
                <div className="form-address" style={{ marginBottom: 12, fontSize: 11 }}>{address}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {onOpenWatch && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}
                      onClick={() => { onOpenWatch(); setShowDisconnect(false); }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      Watch
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}
                    onClick={() => { navigator.clipboard.writeText(address || ''); }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" /></svg>
                    Copy
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { onDisconnect(); setShowDisconnect(false); }}>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onConnect} disabled={connecting} style={{ gap: 6 }}>
            {connecting ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>}
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
