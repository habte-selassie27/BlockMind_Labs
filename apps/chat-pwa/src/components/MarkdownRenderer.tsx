import CodeBlock from './CodeBlock';

interface Props {
  content: string;
}

// Escape HTML to prevent XSS but allow our own tags
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  // 1) Escape first
  let html = escapeHtml(text);
  // 2) Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // 3) Bold **text** and __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // 4) Italic *text* and _text_  (avoid inside words + code)
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
  // 5) Links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // 6) Autolink bare URLs
  html = html.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return html;
}

function parseBlocks(text: string): Array<{ type: 'code' | 'text'; content: string; lang?: string }> {
  const blocks: Array<{ type: 'code' | 'text'; content: string; lang?: string }> = [];
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (m.index > last) {
      blocks.push({ type: 'text', content: text.slice(last, m.index) });
    }
    blocks.push({ type: 'code', content: m[2].trimEnd(), lang: m[1] || 'text' });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ type: 'text', content: text.slice(last) });
  if (blocks.length === 0) blocks.push({ type: 'text', content: text });
  return blocks;
}

function renderTextBlock(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length > 0) {
      const para = paraLines.join('<br/>');
      html += `<p>${renderInline(para)}</p>`;
      paraLines = [];
    }
  };
  const closeLists = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
    if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === '') {
      flushPara();
      closeLists();
      continue;
    }

    // Headings
    if (/^#{1,3}\s/.test(trimmed)) {
      flushPara(); closeLists();
      const level = trimmed.match(/^#+/)![0].length;
      const content = trimmed.replace(/^#+\s/, '');
      html += `<h${level + 2} style="margin:12px 0 6px;font-weight:600;letter-spacing:-0.01em;">${renderInline(content)}</h${level + 2}>`;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushPara();
      if (!inBlockquote) { closeLists(); html += '<blockquote>'; inBlockquote = true; }
      const content = trimmed.replace(/^>\s?/, '');
      html += renderInline(content) + '<br/>';
      // peek next: if next not blockquote, close
      const next = lines[i + 1]?.trim() || '';
      if (!next.startsWith('>')) { html += '</blockquote>'; inBlockquote = false; }
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(trimmed)) {
      flushPara();
      if (inOl) { html += '</ol>'; inOl = false; }
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      const content = trimmed.replace(/^[-*]\s/, '');
      html += `<li>${renderInline(content)}</li>`;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      flushPara();
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      const content = trimmed.replace(/^\d+\.\s/, '');
      html += `<li>${renderInline(content)}</li>`;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushPara(); closeLists();
      html += '<hr style="border:none;border-top:1px solid var(--chat-border);margin:12px 0;" />';
      continue;
    }

    // Table row detection (simple)
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      // For now render as plain text with code style — full table parsing is heavy
      // We keep it simple: flush and render as inline
      // Could add full table later
    }

    // Regular paragraph line — accumulate
    if (inUl || inOl || inBlockquote) {
      closeLists();
    }
    paraLines.push(raw);
  }

  flushPara();
  closeLists();
  return html;
}

export default function MarkdownRenderer({ content }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div className="markdown">
      {blocks.map((b, i) => {
        if (b.type === 'code') {
          return <CodeBlock key={i} code={b.content} language={b.lang} />;
        }
        // Empty text block (just whitespace) skip
        if (!b.content.trim()) return null;
        const html = renderTextBlock(b.content);
        if (!html.trim()) return null;
        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}
