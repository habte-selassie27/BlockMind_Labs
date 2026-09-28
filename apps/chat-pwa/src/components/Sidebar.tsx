import { useNavigate } from 'react-router-dom';

interface Props {
  sessions?: Array<{ id: string; title: string; time: string }>;
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewChat?: () => void;
  portfolio?: { total: string; usd: string };
  onToolClick?: (tool: string) => void;
  /** View-only session: signing tools are disabled with an explanatory tooltip. */
  viewOnly?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  portfolio,
  onToolClick,
  viewOnly = false,
  open,
  onClose,
}: Props) {
  const navigate = useNavigate();

  const tools: Array<{ icon: string; label: string; tool: string; desc: string; signing?: boolean }> = [
    { icon: 'balance', label: 'Check Balance', tool: 'balance', desc: 'GIWA balance' },
    { icon: 'transfer', label: 'Transfer', tool: 'transfer', desc: 'Send tokens', signing: true },
    { icon: 'swap', label: 'Swap', tool: 'swap', desc: 'Swap GIWA ↔ USDC', signing: true },
    { icon: 'analyze', label: 'Analyze', tool: 'analyze', desc: 'Wallet insights' },
    { icon: 'monitor', label: 'Monitor', tool: 'monitor', desc: 'Track address' },
    { icon: 'approvals', label: 'Approvals', tool: 'approvals', desc: 'ERC-20', signing: true },
    { icon: 'gas', label: 'Gas Tracker', tool: 'gas', desc: 'Live gas' },
    { icon: 'chain', label: 'Multi-Step', tool: 'chain', desc: 'Chained TXs', signing: true },
    { icon: 'alerts', label: 'Alerts', tool: 'notifications', desc: 'Notifications' },
  ];

  const ToolIcon = ({ name }: { name: string }) => {
    const common = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
      case 'balance': return <svg {...common} viewBox="0 0 24 24"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></svg>;
      case 'transfer': return <svg {...common} viewBox="0 0 24 24"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
      case 'swap': return <svg {...common} viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
      case 'analyze': return <svg {...common} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6M11 8v6" /></svg>;
      case 'monitor': return <svg {...common} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
      case 'approvals': return <svg {...common} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" /></svg>;
      case 'gas': return <svg {...common} viewBox="0 0 24 24"><path d="M3 9h13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" /><path d="M16 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /><path d="M7 19H17" /></svg>;
      case 'chain': return <svg {...common} viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
      case 'alerts': return <svg {...common} viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7-6 11-6 11S6 15 6 8z" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
      default: return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="mobile-overlay open" onClick={onClose} aria-hidden />}

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Sidebar">
        {/* Mobile close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }} className="mobile-only">
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--chat-text-primary)', fontSize: 14 }}>Menu</span>
          <button className="hamburger" onClick={onClose} aria-label="Close menu" style={{ display: 'inline-flex' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 14, justifyContent: 'center', gap: 8 }}
          onClick={onNewChat}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          New Chat
        </button>

        <div className="sidebar-section">
          <div className="sidebar-label">Recent Sessions</div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--chat-text-faint)', padding: '6px 10px', lineHeight: 1.5 }}>
              No sessions yet — start a new chat to begin.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`sidebar-item ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => { onSelectSession?.(s.id); onClose?.(); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectSession?.(s.id)}
              >
                <div className="sidebar-session">
                  <span className="sidebar-session-title">{s.title}</span>
                  <span className="sidebar-session-time">{s.time}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <div className="sidebar-label">
            Available Tools
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 500, color: 'var(--chat-text-faint)', letterSpacing: 0 }}>9</span>
          </div>
          <div className="tool-grid">
            {tools.map((tool) => {
              const blocked = viewOnly && !!tool.signing;
              return (
                <div
                  key={tool.label}
                  className={`tool-card ${blocked ? 'disabled' : 'clickable'}`}
                  onClick={() => { if (blocked) return; onToolClick?.(tool.tool); onClose?.(); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !blocked && onToolClick?.(tool.tool)}
                  title={blocked ? 'View-only mode — connect a wallet to sign' : tool.desc}
                  style={blocked ? { opacity: 0.42, cursor: 'not-allowed' } : undefined}
                >
                  <span style={{ color: 'var(--chat-text-muted)' }}><ToolIcon name={tool.icon} /></span>
                  <span className="tool-card-label">{tool.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <div className="sidebar-label">Portfolio Snapshot</div>
          <div className="portfolio-snapshot">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="portfolio-total">{portfolio?.total || '0.00'}</span>
              <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>GIWA</span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="portfolio-usd" style={{ marginLeft: 0 }}>{portfolio?.usd || '≈ $0.00'}</span>
              <span style={{ fontSize: 11, color: 'var(--chat-success)', background: 'var(--chat-success-bg)', border: '1px solid var(--chat-success-border)', padding: '1px 6px', borderRadius: 9999, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>• Live</span>
            </div>
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section" style={{ marginBottom: 0 }}>
          <div className="sidebar-label">Quick Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button className="sidebar-link" onClick={() => { navigate('/templates'); onClose?.(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></svg>
              Agent Templates
            </button>
            <button className="sidebar-link" onClick={() => { navigate('/preferences'); onClose?.(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              Preferences
            </button>
            <button className="sidebar-link" onClick={() => { navigate('/portfolio'); onClose?.(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
              Portfolio
            </button>
            <button className="sidebar-link" onClick={() => { navigate('/history'); onClose?.(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
              TX History
            </button>
            <button className="sidebar-link" onClick={() => { navigate('/docs'); onClose?.(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M13 13h1" /></svg>
              Documentation
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--chat-border-soft)', marginLeft: -12, marginRight: -12, paddingLeft: 12, paddingRight: 12, marginBottom: -4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.35)', display: 'inline-block' }} />
            All systems operational
            <span style={{ marginLeft: 'auto' }}>v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
