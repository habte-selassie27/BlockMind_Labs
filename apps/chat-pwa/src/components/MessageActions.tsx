import { useState, useCallback } from 'react';

interface Props {
  content: string;
  onRetry?: () => void;
  onEdit?: () => void;
  variant?: 'assistant' | 'user';
}

export default function MessageActions({ content, onRetry, onEdit, variant = 'assistant' }: Props) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }, [content]);

  return (
    <div className="msg-actions" role="toolbar" aria-label="Message actions">
      <button
        className="msg-action-btn"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy message'}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" /></svg>
        )}
      </button>

      {variant === 'assistant' && onRetry && (
        <button className="msg-action-btn" onClick={onRetry} aria-label="Regenerate" title="Regenerate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3h-5l2.26 2.26A7 7 0 1 0 21 12z" /></svg>
        </button>
      )}

      {variant === 'user' && onEdit && (
        <button className="msg-action-btn" onClick={onEdit} aria-label="Edit" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
      )}

      {variant === 'assistant' && (
        <>
          <button
            className="msg-action-btn"
            onClick={() => setLiked(liked === 'up' ? null : 'up')}
            aria-label="Thumbs up"
            title="Good response"
            style={liked === 'up' ? { color: 'var(--chat-success)', background: 'var(--chat-success-bg)', borderColor: 'var(--chat-success-border)' } : undefined}
          >
            <svg viewBox="0 0 24 24" fill={liked === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v7h8.28a2 2 0 0 0 2-1.7l1.38-7a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
          </button>
          <button
            className="msg-action-btn"
            onClick={() => setLiked(liked === 'down' ? null : 'down')}
            aria-label="Thumbs down"
            title="Bad response"
            style={liked === 'down' ? { color: 'var(--chat-danger)', background: 'var(--chat-danger-bg)', borderColor: 'var(--chat-danger-border)' } : undefined}
          >
            <svg viewBox="0 0 24 24" fill={liked === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V6h-8.28a2 2 0 0 0-2 1.7l-1.38 7a2 2 0 0 0 2 2.3H10z" /><path d="M7 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
