interface Props {
  findings?: Array<{ text: string; severity: 'critical' | 'medium' | 'low' }>;
  contractAddress?: string;
  onDismiss?: () => void;
  onGoBack?: () => void;
}

export default function ScamShieldCard({
  findings = [
    { text: 'Hidden mint function detected', severity: 'critical' },
    { text: 'Proxy upgradeable by deployer', severity: 'medium' },
  ],
  contractAddress = '0xdead...beef',
  onDismiss,
  onGoBack,
}: Props) {
  return (
    <div className="scam-card" role="alert" aria-live="assertive">
      <div className="scam-header">
        <div className="scam-title">
          <span>🛡</span>
          <span>Scam Shield Alert</span>
        </div>
        <span className="scam-risk badge badge-error">HIGH RISK</span>
      </div>

      <div className="address" style={{ marginBottom: 'var(--space-3)' }}>
        <span>Contract</span>
        <span>{contractAddress}</span>
      </div>

      {findings.map((f, i) => (
        <div className="scam-finding" key={i}>
          <span className="scam-finding-text">● {f.text}</span>
          <span className={`scam-finding-severity severity-${f.severity}`}>
            {f.severity.toUpperCase()}
          </span>
        </div>
      ))}

      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)' }}>
        We recommend avoiding this contract.
      </p>

      <div className="tx-confirm-actions" style={{ marginTop: 'var(--space-4)' }}>
        <button className="btn btn-secondary" onClick={onGoBack}>Go back</button>
        <button className="btn btn-danger" onClick={onDismiss}>Dismiss and proceed</button>
      </div>
    </div>
  );
}
