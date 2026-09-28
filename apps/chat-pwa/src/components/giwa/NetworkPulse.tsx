interface Stats {
  chain: string;
  latest_block: string;
  block_time_avg_sec: number;
  tps: number;
  tx_today: number;
  active_accounts: number;
  gas_avg_gwei: string;
  gas_low: string;
  gas_high: string;
  congestion: 'low' | 'medium' | 'high';
  verified_contracts: number;
  aa_wallets: number;
  success_rate_pct: number;
}

interface Props {
  stats: Stats;
  onRefresh?: () => void;
}

export default function NetworkPulse({ stats, onRefresh }: Props) {
  const congestionColor = stats.congestion === 'low' ? '#22c55e' : stats.congestion === 'medium' ? '#f59e0b' : '#ef4444';
  return (
    <div className="sim-card" style={{ borderLeft: `3px solid ${congestionColor}` }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#0A0A09,#1C1917)', border: '1px solid #E5E3DC' }}>⚡</div>
          <div>
            <div className="sim-header-title">GIWA Network Intelligence</div>
            <div className="sim-header-subtitle">{stats.chain} · Block #{stats.latest_block}</div>
          </div>
        </div>
        <div className="sim-status" style={{ background: `${congestionColor}15`, color: congestionColor, border: `1px solid ${congestionColor}30` }}>
          <span className="sim-status-dot" style={{ background: congestionColor }} /> {stats.congestion.toUpperCase()}
        </div>
      </div>

      <div className="sim-cost-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Block Time</span>
          <span className="sim-cost-value">{stats.block_time_avg_sec}s</span>
          <span className="sim-cost-sub">~1s target</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">TPS</span>
          <span className="sim-cost-value">{stats.tps}</span>
          <span className="sim-cost-sub">{stats.tx_today.toLocaleString()} today</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Success Rate</span>
          <span className="sim-cost-value" style={{ color: '#22c55e' }}>{stats.success_rate_pct}%</span>
          <span className="sim-cost-sub">{stats.active_accounts.toLocaleString()} active</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Gas Avg</span>
          <span className="sim-cost-value">{stats.gas_avg_gwei} gwei</span>
          <span className="sim-cost-sub">{stats.gas_low} → {stats.gas_high}</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Verified</span>
          <span className="sim-cost-value">{stats.verified_contracts.toLocaleString()}</span>
          <span className="sim-cost-sub">contracts</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">AA Wallets</span>
          <span className="sim-cost-value">{stats.aa_wallets.toLocaleString()}</span>
          <span className="sim-cost-sub">EIP-7702 active</span>
        </div>
      </div>

      <div className="sim-security">
        <span className="sim-security-icon">📡</span>
        <span className="sim-security-text">Live from sepolia-explorer.giwa.io/stats · sepolia-rpc.giwa.io</span>
      </div>

      {onRefresh && (
        <div className="sim-actions">
          <button className="sim-btn sim-btn-cancel" onClick={onRefresh} style={{ width: '100%' }}>Refresh ↻</button>
        </div>
      )}
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
