interface ErrorInfo {
  code: string;
  message: string;
  suggestion?: string;
  retryable?: boolean;
}

interface Props {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const errorMap: Record<string, { icon: string; color: string; suggestion: string }> = {
  'insufficient_funds': { icon: '💰', color: '#c44b3f', suggestion: 'Add more GIWA to your wallet to cover gas fees.' },
  'network_error': { icon: '🌐', color: '#c18b3c', suggestion: 'Check your internet connection and try again.' },
  'user_rejected': { icon: '✋', color: '#777169', suggestion: 'You rejected the transaction. No action needed.' },
  'timeout': { icon: '⏱️', color: '#c18b3c', suggestion: 'The network is congested. Try again in a few seconds.' },
  'invalid_address': { icon: '📍', color: '#c44b3f', suggestion: 'Double-check the recipient address format.' },
  'simulation_failed': { icon: '🛡️', color: '#c44b3f', suggestion: 'The transaction would fail on-chain. Review the details.' },
  'rate_limited': { icon: '🚦', color: '#c18b3c', suggestion: 'Too many requests. Wait a moment and try again.' },
  'unknown': { icon: '❓', color: '#777169', suggestion: 'Something went wrong. Try again or contact support.' },
};

export default function ErrorRecoveryCard({ error, onRetry, onDismiss }: Props) {
  const info = errorMap[error.code] || errorMap['unknown'];

  return (
    <div className="error-card" style={{ borderColor: `${info.color}33` }}>
      <div className="error-header">
        <span className="error-icon">{info.icon}</span>
        <div className="error-header-text">
          <span className="error-title">Transaction Failed</span>
          <span className="error-code">{error.code}</span>
        </div>
      </div>

      <div className="error-body">
        <p className="error-message">{error.message}</p>
        <div className="error-suggestion" style={{ borderLeftColor: info.color }}>
          <span className="error-suggestion-label">💡 Suggestion</span>
          <span className="error-suggestion-text">{error.suggestion || error.suggestion}</span>
        </div>
      </div>

      <div className="error-actions">
        {onDismiss && (
          <button className="error-btn-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
        {error.retryable !== false && onRetry && (
          <button className="error-btn-retry" onClick={onRetry}>
            🔄 Retry
          </button>
        )}
      </div>
    </div>
  );
}
