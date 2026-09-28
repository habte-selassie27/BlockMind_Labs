import { useState } from 'react';

interface Token {
  symbol: string;
  name: string;
  amount: string;
  usd: string;
  change: string;
  up: boolean;
}
interface TxRecord {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
}
interface Props {
  walletAddress?: string;
  balance?: string | null;
  tokens?: Token[];
  txHistory?: TxRecord[];
  onToolClick?: (tool: string) => void;
  /** View-only session: signing tools disabled, watch badge shown. */
  viewOnly?: boolean;
  onOpenWatch?: () => void;
}

export default function ContextPanel({ walletAddress, balance, tokens: _tokens = [], txHistory = [], onToolClick, viewOnly = false, onOpenWatch }: Props) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'tools' | 'history'>('portfolio');
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected';

  const tools = [
    { name: 'balance', label: 'Check Balance', icon: 'balance', needsConfirm: false, desc: 'Show all token balances' },
    { name: 'transfer', label: 'Transfer Tokens', icon: 'transfer', needsConfirm: true, desc: 'Send to any address or .up' },
    { name: 'swap', label: 'Swap Tokens', icon: 'swap', needsConfirm: true, desc: 'Best route, simulated first' },
    { name: 'identity', label: 'GIWA Identity (UP ID)', icon: 'shield', needsConfirm: true, desc: 'Resolve / create alice.up' },
    { name: 'bridge', label: 'GIWA Bridge', icon: 'transfer', needsConfirm: true, desc: 'Sepolia → GIWA ~2.3 min' },
    { name: 'network', label: 'Network Pulse', icon: 'balance', needsConfirm: false, desc: 'Blocks, gas, AA wallets' },
    { name: 'explorer', label: 'Explorer Copilot', icon: 'eye', needsConfirm: false, desc: 'Explain address/tx' },
    { name: 'discover', label: 'Discover GIWA Apps', icon: 'eye', needsConfirm: false, desc: 'Verified DeFi & more' },
    { name: 'batch', label: 'Batch Execute', icon: 'swap', needsConfirm: true, desc: 'Approve→Deposit→Stake' },
    { name: 'risk', label: 'Contract Risk', icon: 'shield', needsConfirm: false, desc: 'Scam Shield check' },
    { name: 'monitor', label: 'Monitor Address', icon: 'eye', needsConfirm: false, desc: 'Watch for activity' },
  ];

  const ToolIcon = ({ name }: { name: string }) => {
    const p = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
      case 'balance': return <svg {...p} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></svg>;
      case 'transfer': return <svg {...p} viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
      case 'swap': return <svg {...p} viewBox="0 0 24 24"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
      case 'shield': return <svg {...p} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
      case 'eye': return <svg {...p} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
      default: return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
    }
  };

  return (
    <div className="context-panel">
      <div className="context-tabs" role="tablist">
        {(['portfolio', 'tools', 'history'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`context-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'portfolio' ? 'Portfolio' : tab === 'tools' ? 'Tools' : 'History'}
          </button>
        ))}
      </div>

      <div className="context-content">
        {activeTab === 'portfolio' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="sidebar-label" style={{ marginBottom: 0, padding: 0 }}>Wallet</div>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: walletAddress ? (viewOnly ? '#E8C07D' : '#22c55e') : 'var(--chat-text-faint)', background: walletAddress ? (viewOnly ? 'rgba(232,192,125,0.10)' : 'rgba(34,197,94,0.10)') : 'rgba(255,255,255,0.04)', border: `1px solid ${walletAddress ? (viewOnly ? 'rgba(232,192,125,0.20)' : 'rgba(34,197,94,0.18)') : 'var(--chat-border-soft)'}`, padding: '2px 7px', borderRadius: 9999, fontWeight: 600 }}>
                {walletAddress ? (viewOnly ? '👁 Watch-only' : '● Connected') : '○ Offline'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 'var(--radius-lg)', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9999, background: walletAddress ? 'linear-gradient(135deg,#D97A5C 0%,#C15F3C 100%)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--chat-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortAddress}
                </div>
                <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>{walletAddress ? (viewOnly ? 'View-only • no signing' : 'GIWA Sepolia • EOA') : 'Connect to view assets'}</div>
              </div>
              {walletAddress && onOpenWatch && (
                <button
                  className="address-copy"
                  aria-label="Open watch dashboard"
                  title={viewOnly ? 'Watch dashboard' : 'Balance dashboard'}
                  onClick={onOpenWatch}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              )}
              {walletAddress && (
                <button className="address-copy" aria-label="Copy address" onClick={() => navigator.clipboard.writeText(walletAddress)} title="Copy address">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" /></svg>
                </button>
              )}
            </div>

            <div className="sidebar-label" style={{ marginBottom: 10, padding: 0 }}>Tokens</div>
            {!walletAddress ? (
              <div className="empty-state" style={{ padding: '18px 12px' }}>
                <div className="empty-state-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--chat-text-tertiary)', lineHeight: 1.5 }}>
                  Connect wallet to view<br />tokens and balances
                </div>
                <div style={{ fontSize: 11, color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>GIWA • ETH • USDC</div>
              </div>
            ) : balance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)', border: '1px solid var(--chat-border)', borderRadius: 'var(--radius-lg)' }}>
                  <div className="token-icon" style={{ width: 36, height: 36, fontSize: 13 }}>G</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="token-name">GIWA</span>
                      <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.18)', padding: '1px 6px', borderRadius: 9999, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>NATIVE</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>GIWA Sepolia</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="token-amount" style={{ fontSize: 13 }}>{balance}</div>
                    <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>≈ ${(parseFloat(balance) * 0.2).toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>Total Value</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--chat-text-primary)', fontFamily: 'Space Grotesk, sans-serif', marginTop: 2 }}>${(parseFloat(balance) * 0.2).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>Chain</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--chat-text-primary)', marginTop: 2 }}>GIWA Sepolia</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-lg)' }} />
              </div>
            )}

            {walletAddress && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(217,122,92,0.06)', border: '1px solid rgba(217,122,92,0.12)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--chat-brand-soft)', border: '1px solid rgba(217,122,92,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-brand)', flexShrink: 0, marginTop: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--chat-text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--chat-text-primary)' }}>Tip:</span> Try “check my GIWA balance” or “swap 0.1 GIWA for USDC”.
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tools' && (
          <>
            <div className="sidebar-label" style={{ marginBottom: 10, padding: 0 }}>Available Tools</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tools.map((tool) => {
                const blocked = viewOnly && tool.needsConfirm;
                return (
                  <div
                    key={tool.name}
                    className={`tool-card ${blocked ? 'disabled' : 'clickable'}`}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', textAlign: 'left', ...(blocked ? { opacity: 0.42, cursor: 'not-allowed' } : {}) }}
                    onClick={() => { if (!blocked) onToolClick?.(tool.name); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !blocked && onToolClick?.(tool.name)}
                    title={blocked ? 'View-only mode — connect a wallet to sign' : tool.desc}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--chat-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-text-muted)', flexShrink: 0 }}>
                        <ToolIcon name={tool.icon} />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--chat-text-primary)', lineHeight: 1.1 }}>{tool.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', lineHeight: 1.2 }}>{blocked ? 'View-only — connect to sign' : tool.desc}</span>
                      </span>
                    </span>
                    {!blocked && tool.needsConfirm && <span className="badge badge-warning" style={{ flexShrink: 0 }}>Form</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--chat-text-tertiary)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--chat-text-muted)', fontWeight: 600 }}>How it works:</span> Tools run with simulation first. You’ll always see a summary before signing.
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="sidebar-label" style={{ marginBottom: 0, padding: 0 }}>Recent Transactions</div>
              {txHistory.length > 0 && <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>{txHistory.length} tx</span>}
            </div>
            {txHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 12px' }}>
                <div className="empty-state-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg></div>
                <div className="empty-state-title" style={{ fontSize: 13 }}>No transactions yet</div>
                <div className="empty-state-desc" style={{ fontSize: 12 }}>Your history will appear here after you send your first transaction.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txHistory.map((tx) => (
                  <div
                    key={tx.hash}
                    className="tool-card clickable"
                    style={{ flexDirection: 'column', gap: 6, padding: '12px', textAlign: 'left', alignItems: 'stretch' }}
                    onClick={() => window.open(`https://sepolia-explorer.giwa.io/tx/${tx.hash}`, '_blank')}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--chat-text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {tx.amount} {tx.token}
                      </span>
                      <span className={`badge badge-${tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}`} style={{ fontSize: 10 }}>
                        {tx.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                      {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
