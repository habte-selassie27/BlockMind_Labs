import { useNavigate } from 'react-router-dom';

interface Props {
  sessions?: Array<{ id: string; title: string; time: string }>;
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewChat?: () => void;
  portfolio?: { total: string; usd: string };
  onToolClick?: (tool: string) => void;
}

export default function Sidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  portfolio,
  onToolClick,
}: Props) {
  const navigate = useNavigate();
  const tools = [
    { icon: '💰', label: 'Check Balance', tool: 'balance' },
    { icon: '📤', label: 'Transfer', tool: 'transfer' },
    { icon: '🔄', label: 'Swap', tool: 'swap' },
    { icon: '🔍', label: 'Analyze', tool: 'analyze' },
    { icon: '👁', label: 'Monitor', tool: 'monitor' },
    { icon: '🔐', label: 'Approvals', tool: 'approvals' },
    { icon: '⛽', label: 'Gas Tracker', tool: 'gas' },
    { icon: '⛓️', label: 'Multi-Step', tool: 'chain' },
    { icon: '🔔', label: 'Alerts', tool: 'notifications' },
  ];

  return (
    <aside className="sidebar">
      <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 'var(--space-4)' }} onClick={onNewChat}>
        + New Chat
      </button>

      <div className="sidebar-section">
        <div className="sidebar-label">Recent Sessions</div>
        {sessions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: 'var(--space-2) var(--space-3)' }}>
            No sessions yet
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={`sidebar-item ${s.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession?.(s.id)}
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
        <div className="sidebar-label">Available Tools</div>
        <div className="tool-grid">
          {tools.map((tool) => (
            <div
              key={tool.label}
              className="tool-card clickable"
              onClick={() => onToolClick?.(tool.tool)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onToolClick?.(tool.tool)}
            >
              <span className="tool-card-icon">{tool.icon}</span>
              <span>{tool.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-label">Portfolio Snapshot</div>
        <div className="portfolio-snapshot">
          <div>
            <span className="portfolio-total">{portfolio?.total || '0.00'}</span>
            <span className="portfolio-usd">{portfolio?.usd || '≈ $0.00'}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-label">Quick Links</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="sidebar-link" onClick={() => navigate('/templates')}>📋 Agent Templates</button>
          <button className="sidebar-link" onClick={() => navigate('/preferences')}>⚙️ Preferences</button>
          <button className="sidebar-link" onClick={() => navigate('/portfolio')}>📊 Portfolio</button>
          <button className="sidebar-link" onClick={() => navigate('/history')}>📜 TX History</button>
        </div>
      </div>
    </aside>
  );
}
