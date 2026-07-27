interface Props {
  name: string;
  status: 'running' | 'success' | 'error';
}

const statusLabels = {
  running: 'Executing...',
  success: 'Completed',
  error: 'Failed',
};

const statusClasses = {
  running: 'status-running',
  success: 'status-success',
  error: 'status-error',
};

export default function ToolCall({ name, status }: Props) {
  return (
    <div className="msg-tool">
      <div className="msg-tool-name">🔧 {name}</div>
      <div className={`msg-tool-status ${statusClasses[status]}`}>
        {status === 'running' && <span className="spinner spinner-sm" style={{ marginRight: '6px' }} />}
        {status === 'success' && '✓ '}
        {status === 'error' && '✗ '}
        {statusLabels[status]}
      </div>
    </div>
  );
}
