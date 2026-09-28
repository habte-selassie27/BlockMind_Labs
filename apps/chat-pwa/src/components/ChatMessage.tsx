import MarkdownRenderer from './MarkdownRenderer';
import MessageActions from './MessageActions';

interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  onRetry?: () => void;
  onEdit?: () => void;
}

function formatTime(ts?: number): string {
  if (!ts) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Lucide-style icons as inline SVG
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" stroke="currentColor" />
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" />
      <circle cx="9" cy="13" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.25" fill="currentColor" stroke="none" />
      <path d="M9 16c1.2 1 2.8 1 4 0" stroke="currentColor" />
    </svg>
  );
}

export default function ChatMessage({ role, content, timestamp, onRetry, onEdit }: Props) {
  if (role === 'system') {
    return (
      <div className="msg-group system msg-enter">
        <div className="msg msg-system">{content}</div>
      </div>
    );
  }

  if (role === 'user') {
    // User: bubble on right, no markdown except inline code
    const safe = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, '<br/>');

    return (
      <div className="msg-group user msg-enter">
        <div className="msg-avatar user" aria-hidden>
          <UserIcon />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 0, flex: 1 }}>
          <div className="msg msg-user" dangerouslySetInnerHTML={{ __html: safe }} />
          <div className="msg-footer" style={{ justifyContent: 'flex-end' }}>
            <span className="msg-time">{formatTime(timestamp)}</span>
            <MessageActions content={content} variant="user" onEdit={onEdit} />
          </div>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="msg-group assistant msg-enter">
      <div className="msg-avatar assistant" aria-hidden>
        <BotIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div className="msg msg-agent">
          <MarkdownRenderer content={content} />
        </div>
        <div className="msg-footer">
          <span className="msg-time">{formatTime(timestamp)}</span>
          <MessageActions content={content} variant="assistant" onRetry={onRetry} />
        </div>
      </div>
    </div>
  );
}
