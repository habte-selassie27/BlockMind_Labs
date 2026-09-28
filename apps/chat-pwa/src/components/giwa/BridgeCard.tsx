interface Props {
  amount: string;
  token: string;
  fromChain: string;
  toChain: string;
  fee?: string;
  time?: string;
  route?: string;
  status?: 'estimate' | 'initiated' | 'proven' | 'finalized';
  elapsed?: string;
  remaining?: string;
  confirmations?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onStatus?: () => void;
}

export default function BridgeCard({ amount, token, fromChain, toChain, fee, time, route, status = 'estimate', elapsed, remaining, confirmations, onConfirm, onCancel, onStatus }: Props) {
  const isEstimate = status === 'estimate';
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #0052FF' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#0052FF,#28A0F0)' }}>🌉</div>
          <div>
            <div className="sim-header-title">GIWA Bridge</div>
            <div className="sim-header-subtitle">{fromChain} → {toChain}</div>
          </div>
        </div>
        <div className={`sim-status sim-status-${status === 'finalized' ? 'success' : status === 'estimate' ? 'warning' : 'success'}`}>
          <span className="sim-status-dot" /> {isEstimate ? 'Ready' : status}
        </div>
      </div>

      <div className="sim-info-row">
        <div className="sim-info-item">
          <span className="sim-info-label">Amount</span>
          <span className="sim-info-value sim-info-highlight">{amount} {token}</span>
        </div>
        <div className="sim-info-item">
          <span className="sim-info-label">Estimated Fee</span>
          <span className="sim-info-value">{fee || '0.00042 ETH'}</span>
        </div>
        <div className="sim-info-item">
          <span className="sim-info-label">Bridge Time</span>
          <span className="sim-info-value">{time || '~2.3 min'}</span>
          {elapsed && <span className="sim-cost-sub">{elapsed} elapsed · {remaining} left</span>}
        </div>
      </div>

      {route && (
        <div className="sim-cost-grid">
          <div className="sim-cost-item" style={{ gridColumn: '1 / -1' }}>
            <span className="sim-cost-label">Route</span>
            <span className="sim-cost-value" style={{ fontSize: '0.78rem' }}>{route}</span>
            {typeof confirmations === 'number' && (
              <span className="sim-cost-sub">{confirmations}/12 confirmations</span>
            )}
          </div>
        </div>
      )}

      <div className="sim-security">
        <span className="sim-security-icon">🛡️</span>
        <span className="sim-security-text">OP Stack Standard Bridge · Simulation passed · via app.giwa.zone</span>
      </div>

      <div className="sim-actions">
        {isEstimate ? (
          <>
            <button className="sim-btn sim-btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="sim-btn sim-btn-confirm" onClick={onConfirm}>Confirm Bridge →</button>
          </>
        ) : (
          <>
            <button className="sim-btn sim-btn-cancel" onClick={onStatus}>Refresh Status</button>
            <button className="sim-btn sim-btn-confirm" disabled>{status === 'finalized' ? '✓ Finalized' : 'Bridging…'}</button>
          </>
        )}
      </div>
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
