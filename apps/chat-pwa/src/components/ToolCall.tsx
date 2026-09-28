interface Props {
  name: string;
  status: 'running' | 'success' | 'error';
}

export default function ToolCall({ name, status }: Props) {
  return (
    <div className={`tool-call ${status === 'success' ? 'tool-call-success' : status === 'error' ? 'tool-call-error' : ''}`} role="status" aria-live="polite">
      <span className="tool-call-dot" aria-hidden />
      <span className="tool-call-name">{name}</span>
      <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
        {status === 'running' ? 'Executing…' : status === 'success' ? 'Done' : 'Failed'}
      </span>
      {status === 'running' && <span className="spinner spinner-brand spinner-sm" aria-hidden />}
      {status === 'success' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--chat-success)' }}><path d="M20 6L9 17l-5-5" /></svg>}
      {status === 'error' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--chat-danger)' }}><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>}
    </div>
  );
}
