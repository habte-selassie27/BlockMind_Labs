interface Props {
  upId: string;
  address: string;
  isVerified?: boolean;
  dojangIssued?: boolean;
  verifiedTokens?: number;
  source?: string;
  onSend?: (upId: string) => void;
  onVerify?: (upId: string) => void;
}

export default function IdentityCard({ upId, address, isVerified, dojangIssued, verifiedTokens, source, onSend, onVerify }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #D97A5C' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#D97A5C,#C15F3C)' }}>🆔</div>
          <div>
            <div className="sim-header-title">GIWA Identity</div>
            <div className="sim-header-subtitle">{upId}</div>
          </div>
        </div>
        <div className={`sim-status ${isVerified ? 'sim-status-success' : 'sim-status-warning'}`}>
          <span className="sim-status-dot" /> {isVerified ? 'Verified' : 'Unverified'}
        </div>
      </div>

      <div className="sim-info-row">
        <div className="sim-info-item">
          <span className="sim-info-label">Resolved Address</span>
          <span className="sim-info-value sim-info-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
          <span className="sim-cost-sub">{address}</span>
        </div>
        <div className="sim-info-item">
          <span className="sim-info-label">Dojang</span>
          <span className="sim-info-value">{dojangIssued ? '✓ Issued' : '— Not issued'}</span>
          <span className="sim-cost-sub">VerifiedTokens: {verifiedTokens ?? 0}</span>
        </div>
      </div>

      <div className="sim-cost-grid">
        <div className="sim-cost-item">
          <span className="sim-cost-label">Source</span>
          <span className="sim-cost-value" style={{ fontSize: '0.78rem' }}>{source || 'giwa-playground'}</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Network</span>
          <span className="sim-cost-value">GIWA Sepolia</span>
          <span className="sim-cost-sub">91342 · 1s blocks</span>
        </div>
      </div>

      <div className="sim-security">
        <span className="sim-security-icon">🔒</span>
        <span className="sim-security-text">Resolved via UP ID · Always confirm address before signing</span>
      </div>

      <div className="sim-actions">
        <button className="sim-btn sim-btn-cancel" onClick={() => onVerify?.(upId)}>Verify Dojang</button>
        <button className="sim-btn sim-btn-confirm" onClick={() => onSend?.(upId)}>Send to {upId} →</button>
      </div>
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
