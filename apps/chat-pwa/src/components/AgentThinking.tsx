interface Props {
  message?: string;
}

export default function AgentThinking({ message = 'Thinking...' }: Props) {
  return (
    <div className="agent-thinking" aria-live="polite" aria-label="Agent is thinking">
      <div className="thinking-dots">
        <span />
        <span />
        <span />
      </div>
      <span className="thinking-label">{message}</span>
    </div>
  );
}
