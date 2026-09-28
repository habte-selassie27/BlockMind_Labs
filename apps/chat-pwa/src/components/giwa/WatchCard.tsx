interface Watch {
  id: string;
  address: string;
  type: string;
  threshold?: string;
  target?: string;
  active: boolean;
}

interface Props {
  watches: Watch[];
  address: string;
  onAdd?: () => void;
}

export default function WatchCard({ watches, address, onAdd }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #22c55e' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: '#22c55e' }}>👁️</div>
          <div>
            <div className="sim-header-title">GIWA Watch Mode</div>
            <div className="sim-header-subtitle" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{address.slice(0, 6)}…{address.slice(-4)} · {watches.length} active</div>
          </div>
        </div>
        <div className="sim-status sim-status-success"><span className="sim-status-dot" /> Active</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 'var(--space-3) 0' }}>
        {watches.map(w => (
          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{w.type} — {w.address.slice(0, 6)}…{w.address.slice(-4)}</div>
              <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>{w.threshold ? `threshold ${w.threshold}` : w.target ? `target ${w.target.slice(0, 10)}…` : 'all events'}</div>
            </div>
            <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 9999, height: 'fit-content' }}>● LIVE</span>
          </div>
        ))}
        {watches.length === 0 && <div style={{ fontSize: 12, color: 'var(--chat-text-tertiary)', textAlign: 'center', padding: 12 }}>No watches — try “Watch my wallet” or “Alert when balance &lt;0.01 ETH”</div>}
      </div>

      <div className="sim-security">
        <span className="sim-security-icon">🔔</span>
        <span className="sim-security-text">Alerts via notification-service (Redis pub/sub) · GIWA Sepolia</span>
      </div>

      {onAdd && (
        <div className="sim-actions">
          <button className="sim-btn sim-btn-confirm" style={{ width: '100%' }} onClick={onAdd}>Add Watch →</button>
        </div>
      )}
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
