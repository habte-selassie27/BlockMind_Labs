import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onSend: (message: string) => void;
  loading?: boolean;
  walletAddress?: string;
  onOpenPalette?: () => void;
}

export default function InputBar({ onSend, loading = false, walletAddress, onOpenPalette }: Props) {
  const [input, setInput] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const autoResize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const h = Math.min(ta.scrollHeight, 128);
    ta.style.height = h + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    onSend(text);
    setInput('');
    // reset height
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto';
    });
  }, [input, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Cmd/Ctrl+K handled globally
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="input-bar">
      <div className="input-bar-inner">
        <div className="input-bar-chain" title="GIWA Sepolia">
          <span className="chain-dot" />
          <span className="chain-name">GIWA</span>
        </div>

        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything — try “swap 0.1 GIWA for USDC”"
          disabled={loading}
          rows={1}
          aria-label="Message input"
        />

        {shortAddress && (
          <span className="input-bar-wallet" title={walletAddress}>
            {shortAddress}
          </span>
        )}

        <button
          className="input-bar-send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={loading ? 'Sending' : 'Send message'}
          title={loading ? 'Sending…' : canSend ? 'Send (Enter)' : 'Type a message'}
        >
          {loading ? (
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.25)' }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          )}
        </button>
      </div>

      <div className="input-bar-hint">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd>↵</kbd> send
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd>⇧</kbd> + <kbd>↵</kbd> new line
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd>/</kbd> focus
          </span>
        </span>
        <button
          onClick={onOpenPalette}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--chat-text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
          }}
          title="Open command palette (⌘K)"
        >
          <kbd>⌘K</kbd> commands
        </button>
      </div>
    </div>
  );
}
