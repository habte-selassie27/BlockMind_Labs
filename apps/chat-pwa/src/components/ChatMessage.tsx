interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function renderMarkdown(text: string): string {
  return text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Inline code: `text`
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export default function ChatMessage({ role, content }: Props) {
  const className = role === 'user' ? 'msg msg-user' : role === 'assistant' ? 'msg msg-agent' : 'msg msg-system';

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
