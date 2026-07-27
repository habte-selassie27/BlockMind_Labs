import { useState, useRef, useEffect } from 'react';

interface Props {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  connected: boolean;
  connecting: boolean;
  provider: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchChain: (chainId: number) => void;
}

const CHAINS = [
  { id: 91342, name: 'GIWA Sepolia', color: '#F59E0B' },
  { id: 9134, name: 'GIWA Mainnet', color: '#F59E0B' },
];

export default function TopBar({
  address,
  chainId,
  balance,
  connected,
  connecting,
  provider,
  onConnect,
  onDisconnect,
  onSwitchChain,
}: Props) {
  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const chainMenuRef = useRef<HTMLDivElement>(null);
  const disconnectRef = useRef<HTMLDivElement>(null);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;
  const chain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chainMenuRef.current && !chainMenuRef.current.contains(e.target as Node)) {
        setShowChainMenu(false);
      }
      if (disconnectRef.current && !disconnectRef.current.contains(e.target as Node)) {
        setShowDisconnect(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Blockmind</span>
        </div>
      </div>

      <div className="topbar-center">
        {/* Chain selector */}
        <div ref={chainMenuRef} style={{ position: 'relative' }}>
          <button
            className="chain-badge"
            onClick={() => connected && setShowChainMenu(!showChainMenu)}
            style={{ cursor: connected ? 'pointer' : 'default' }}
          >
            <span className="chain-dot" style={{ background: chain.color }} />
            <span className="chain-name">{chain.name}</span>
            {connected && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>▾</span>}
          </button>

          {showChainMenu && connected && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 'var(--space-2)',
              background: 'var(--color-bg-overlay)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-elevated)',
              minWidth: 180,
              zIndex: 60,
              padding: 'var(--space-1)',
            }}>
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSwitchChain(c.id); setShowChainMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    background: c.id === chainId ? 'rgba(245,158,11,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: c.id === chainId ? 'var(--color-amber-400)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <span className="chain-dot" style={{ background: c.color, width: 8, height: 8, borderRadius: '50%' }} />
                  <span>{c.name}</span>
                  {c.id === chainId && <span style={{ marginLeft: 'auto', color: 'var(--color-amber-400)' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-status">
          <span className="status-dot" />
          <span>{connected ? chain.name : 'Not connected'}</span>
        </div>

        {connected && (
          <span className="tier-badge">FREE</span>
        )}

        {connected && balance && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: 'var(--color-amber-400)',
          }}>
            {balance} GIWA
          </span>
        )}

        {connected && shortAddress ? (
          <div ref={disconnectRef} style={{ position: 'relative' }}>
            <button
              className="wallet-btn"
              onClick={() => setShowDisconnect(!showDisconnect)}
            >
              <span className="chain-dot" style={{ width: 6, height: 6 }} />
              {shortAddress}
              {provider && (
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  {provider === 'metamask' ? '🦊' : provider === 'blockmind' ? '⬡' : '📋'}
                </span>
              )}
            </button>

            {showDisconnect && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 'var(--space-2)',
                background: 'var(--color-bg-overlay)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-elevated)',
                minWidth: 220,
                zIndex: 60,
                padding: 'var(--space-3)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Connected via {provider}
                </div>
                <div className="address" style={{ marginBottom: 'var(--space-3)', fontSize: 12 }}>
                  {address}
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => { onDisconnect(); setShowDisconnect(false); }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onConnect} disabled={connecting}>
            {connecting ? <span className="spinner spinner-sm" /> : null}
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
