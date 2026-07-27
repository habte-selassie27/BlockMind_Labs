import { useState, useRef, useEffect } from 'react';

interface Props {
  onSend: (message: string) => void;
  loading?: boolean;
  walletAddress?: string;
}

export default function InputBar({ onSend, loading = false, walletAddress }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="input-bar">
      <div className="input-bar-inner">
        <div className="input-bar-chain">
          <span className="chain-dot" />
          <span className="chain-name" style={{ fontSize: '12px' }}>GIWA</span>
        </div>

        <input
          ref={inputRef}
          className="input-bar-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your wallet..."
          disabled={loading}
        />

        {shortAddress && (
          <span className="input-bar-wallet">{shortAddress}</span>
        )}

        <button
          className="input-bar-send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? (
            <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--color-bg-base)' }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
