interface Props {
  message?: string;
  sublabel?: string;
}

export default function AgentThinking({ message = 'Thinking…', sublabel }: Props) {
  return (
    <div className="msg-group assistant" style={{ animation: 'fadeIn 180ms var(--ease-out) both' }}>
      <div className="msg-avatar assistant" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="12" rx="2" />
          <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
          <path d="M9 16c1.2 1 2.8 1 4 0" />
        </svg>
      </div>
      <div className="agent-thinking-card" aria-live="polite" aria-label="Agent is thinking">
        <span className="thinking-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="thinking-label" style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
          {sublabel && <span className="thinking-sublabel">{sublabel}</span>}
        </span>
        <span className="spinner spinner-brand spinner-sm" style={{ marginLeft: 4 }} aria-hidden />
      </div>
    </div>
  );
}
