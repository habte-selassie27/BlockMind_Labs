interface Props {
  type: 'address' | 'transaction' | 'debug';
  data: any;
  onFix?: () => void;
}

export default function ExplorerCard({ type, data, onFix }: Props) {
  const isAddress = type === 'address';
  const isDebug = type === 'debug';
  const risk = data.risk || (data.is_verified === false ? 'HIGH' : 'LOW');
  const riskColor = risk === 'LOW' ? '#22c55e' : risk === 'HIGH' ? '#ef4444' : '#f59e0b';

  return (
    <div className="sim-card" style={{ borderLeft: `3px solid ${riskColor}` }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: isAddress ? '#1C1917' : '#D97A5C' }}>
            {isAddress ? '📄' : isDebug ? '🐛' : '🔍'}
          </div>
          <div>
            <div className="sim-header-title">
              {type === 'address' ? 'GIWA Explorer — Address' : type === 'debug' ? 'AI Transaction Debugger' : 'GIWA Explorer — Transaction'}
            </div>
            <div className="sim-header-subtitle" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
              {(data.address || data.tx_hash || '').slice(0, 18)}…
            </div>
          </div>
        </div>
        <div className="sim-status" style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
          {risk} {data.is_verified === false ? '· UNVERIFIED' : data.is_verified ? '· VERIFIED' : ''}
        </div>
      </div>

      {isAddress ? (
        <>
          <div className="sim-info-row">
            <div className="sim-info-item">
              <span className="sim-info-label">Type</span>
              <span className="sim-info-value">{data.is_contract ? 'Contract' : 'EOA Wallet'}</span>
            </div>
            {data.contract_name && (
              <div className="sim-info-item">
                <span className="sim-info-label">Name</span>
                <span className="sim-info-value">{data.contract_name}</span>
              </div>
            )}
            {data.tx_count !== undefined && (
              <div className="sim-info-item">
                <span className="sim-info-label">TX Count</span>
                <span className="sim-info-value">{data.tx_count?.toLocaleString?.() ?? data.tx_count}</span>
              </div>
            )}
          </div>
          {data.summary && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 'var(--space-3) 0' }}>{data.summary}</p>}
          {data.functions && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
              {data.functions.slice(0, 6).map((f: string) => (
                <span key={f} className="badge" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', fontSize: 11 }}>{f}</span>
              ))}
            </div>
          )}
          <div className="sim-security" style={{ background: risk === 'HIGH' ? '#fef2f2' : undefined, borderColor: risk === 'HIGH' ? '#fecaca' : undefined }}>
            <span className="sim-security-icon">{risk === 'HIGH' ? '⚠️' : '✓'}</span>
            <span className="sim-security-text" style={{ color: risk === 'HIGH' ? '#b91c1c' : undefined }}>
              {data.is_verified === false ? 'UNVERIFIED — source not on explorer. Scam Shield recommends simulation before interaction.' : 'Verified on sepolia-explorer.giwa.io'}
            </span>
          </div>
          {data.explorer && (
            <a href={data.explorer} target="_blank" rel="noreferrer" className="sim-cost-sub" style={{ display: 'block', marginTop: 8, color: '#D97A5C' }}>
              View on GIWA Explorer →
            </a>
          )}
        </>
      ) : (
        <>
          <div className="sim-info-row">
            <div className="sim-info-item">
              <span className="sim-info-label">Status</span>
              <span className="sim-info-value" style={{ color: data.status === 'failed' ? '#ef4444' : '#22c55e' }}>{data.status}</span>
            </div>
            {data.block && (
              <div className="sim-info-item">
                <span className="sim-info-label">Block</span>
                <span className="sim-info-value sim-info-mono">#{String(data.block).slice(0, 10)}</span>
              </div>
            )}
            {data.gas_used && (
              <div className="sim-info-item">
                <span className="sim-info-label">Gas Used</span>
                <span className="sim-info-value sim-info-mono">{data.gas_used}</span>
              </div>
            )}
          </div>
          {data.revert_reason && (
            <div className="scam-card" style={{ margin: 'var(--space-3) 0', background: '#fef2f2', borderColor: '#fecaca' }}>
              <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>Revert Reason</div>
              <div style={{ fontSize: 13, color: '#7f1d1d', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{data.revert_reason}</div>
            </div>
          )}
          {data.summary && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{data.summary}</p>}
          {isDebug && data.suggested_fix && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Suggested Fix</div>
              <div style={{ fontSize: 13, color: '#15803d', marginTop: 4 }}>{data.suggested_fix}</div>
              {onFix && data.fix_action && (
                <button className="sim-btn sim-btn-confirm" style={{ marginTop: 8, background: '#22c55e' }} onClick={onFix}>
                  Fix & Retry →
                </button>
              )}
            </div>
          )}
          {data.explorer && (
            <a href={data.explorer} target="_blank" rel="noreferrer" className="sim-cost-sub" style={{ display: 'block', marginTop: 8, color: '#D97A5C' }}>
              View on GIWA Explorer →
            </a>
          )}
        </>
      )}
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
