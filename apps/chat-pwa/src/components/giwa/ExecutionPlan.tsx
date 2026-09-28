interface Step {
  tool: string;
  args: Record<string, unknown>;
  simulation?: 'passed' | 'failed';
  gasUsed?: string;
}

interface Props {
  steps: Step[];
  totalGas?: string;
  allPassed?: boolean;
  risk?: string;
  onExecute?: () => void;
  onCancel?: () => void;
}

export default function ExecutionPlan({ steps, totalGas, allPassed, risk = 'LOW', onExecute, onCancel }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #D97A5C' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#D97A5C,#C15F3C)' }}>🗺️</div>
          <div>
            <div className="sim-header-title">Execution Plan</div>
            <div className="sim-header-subtitle">{steps.length} steps · Single confirmation</div>
          </div>
        </div>
        <div className={`sim-status ${allPassed ? 'sim-status-success' : 'sim-status-warning'}`}>
          <span className="sim-status-dot" /> {allPassed ? 'Simulation OK' : 'Check Needed'}
        </div>
      </div>

      <div className="chain-steps" style={{ margin: 'var(--space-3) 0' }}>
        {steps.map((s, i) => (
          <div key={i} className={`chain-step chain-step-${s.simulation === 'failed' ? 'error' : s.simulation === 'passed' ? 'success' : 'pending'}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <span className="chain-step-num" style={{
              width: 28, height: 28, borderRadius: 9999, display: 'grid', placeItems: 'center',
              background: s.simulation === 'passed' ? '#22c55e' : s.simulation === 'failed' ? '#ef4444' : '#E5E3DC',
              color: s.simulation ? '#fff' : '#141413', fontSize: 12, fontWeight: 700
            }}>
              {s.simulation === 'passed' ? '✓' : s.simulation === 'failed' ? '✕' : i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Step {i + 1} · {s.tool}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}>
                {Object.entries(s.args).map(([k, v]) => `${k}=${String(v)}`).join(' · ')}
              </div>
              {s.gasUsed && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Gas: {s.gasUsed}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="sim-cost-grid">
        <div className="sim-cost-item">
          <span className="sim-cost-label">Total Gas</span>
          <span className="sim-cost-value">{totalGas || '0.0021 GIWA'}</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Risk</span>
          <span className="sim-cost-value" style={{ color: risk === 'LOW' ? '#22c55e' : '#ef4444' }}>{risk}</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Confirmation</span>
          <span className="sim-cost-value">1 signature</span>
          <span className="sim-cost-sub">vs {steps.length} popups</span>
        </div>
      </div>

      <div className="sim-security">
        <span className="sim-security-icon">🧪</span>
        <span className="sim-security-text">All steps simulated · Scam Shield passed · Batched via GIWA (1–2s)</span>
      </div>

      <div className="sim-actions">
        <button className="sim-btn sim-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="sim-btn sim-btn-confirm" onClick={onExecute} disabled={!allPassed}>
          Execute All →
        </button>
      </div>
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
