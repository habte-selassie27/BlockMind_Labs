import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  label?: string;
  size?: number;
  className?: string;
  title?: string;
}

/** Shared copy-to-clipboard button with a transient ✓ confirmation. */
export default function CopyButton({ value, label, size = 13, className, title }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={copy}
      title={copied ? 'Copied' : title || 'Copy'}
      aria-label={copied ? 'Copied' : label || 'Copy'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        background: copied ? 'rgba(107,203,119,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(107,203,119,0.35)' : 'var(--chat-border-soft)'}`,
        color: copied ? 'var(--chat-success)' : 'var(--chat-text-tertiary)',
        borderRadius: 8,
        cursor: 'pointer',
        padding: label ? '5px 9px' : 5,
        fontSize: 11.5,
        lineHeight: 1,
        fontFamily: 'inherit',
        transition: 'all 160ms var(--ease-out)',
      }}
    >
      {copied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
        </svg>
      )}
      {label && <span style={{ fontWeight: 600 }}>{copied ? 'Copied' : label}</span>}
    </button>
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.5
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
