interface Props {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  onClose: () => void;
}

const icons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
};

export default function Toast({ type, title, message, onClose }: Props) {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <div className="toast-body">
        <div className="toast-title">{title}</div>
        {message && <div className="toast-msg">{message}</div>}
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}
