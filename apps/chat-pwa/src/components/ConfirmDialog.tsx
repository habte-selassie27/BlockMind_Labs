interface Props {
  summary: Record<string, unknown>;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ summary, onConfirm, onCancel }: Props) {
  const details = Object.entries(summary)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n');

  return (
    <div className="confirm-dialog">
      <div className="confirm-title">⚠️ Confirm Transaction</div>
      <div className="confirm-details">{details || 'A transaction is ready to submit.'}</div>
      <div className="confirm-actions">
        <button className="btn-confirm" onClick={onConfirm}>Confirm</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
