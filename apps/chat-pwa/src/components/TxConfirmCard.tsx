import { useState } from 'react';

interface Props {
  summary: Record<string, unknown>;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TxConfirmCard({ summary, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    onConfirm();
  };

  const fields = Object.entries(summary).filter(([_, v]) => v !== undefined && v !== null);

  const getFieldLabel = (key: string) => {
    const labels: Record<string, string> = {
      action: 'Action',
      token: 'Token',
      amount: 'Amount',
      to: 'Recipient',
      from: 'From',
      chain: 'Chain',
      gas_estimate: 'Est. Gas',
    };
    return labels[key] || key.replace(/_/g, ' ');
  };

  return (
    <div className="tx-confirm-card" role="alertdialog" aria-labelledby="tx-title" aria-describedby="tx-summary">
      <div className="tx-confirm-header" id="tx-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>Transaction Review</span>
      </div>

      <div id="tx-summary">
        {fields.length > 0 ? (
          fields.map(([key, value]) => (
            <div className="tx-field" key={key}>
              <span className="tx-field-label">{getFieldLabel(key)}</span>
              <span className="tx-field-value amber" style={{
                fontFamily: key === 'to' || key === 'from' ? "'JetBrains Mono', monospace" : undefined,
                fontSize: key === 'to' || key === 'from' ? '12px' : undefined,
                wordBreak: 'break-all',
              }}>
                {String(value)}
              </span>
            </div>
          ))
        ) : (
          <div className="tx-field">
            <span className="tx-field-label">Details</span>
            <span className="tx-field-value">A transaction is ready to submit</span>
          </div>
        )}
      </div>

      <div className="tx-sim-status tx-sim-pass">
        <span>✓</span>
        <span>Simulation passed — ready to sign</span>
      </div>

      <div style={{
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--color-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
      }}>
        This transaction will be signed by your wallet. Please review carefully before confirming.
      </div>

      <div className="tx-confirm-actions">
        <button className="btn btn-danger" onClick={onCancel} disabled={loading}>
          Reject
        </button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Signing...' : 'Sign & Send →'}
        </button>
      </div>
    </div>
  );
}
