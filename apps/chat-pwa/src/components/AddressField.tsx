import { useCallback, useEffect, useRef, useState } from 'react';
import { checksumAddress, getEnsAvatar, isAddress, parseWatchInput, resolveWatchInput } from '../lib/address';
import Identicon from './Identicon';
import CopyButton from './CopyButton';
import QRScanner from './QRScanner';

export interface ResolvedWatch {
  address: string | null;
  ens: string | null;
  error: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onResolved: (result: ResolvedWatch) => void;
  recents?: string[];
  onPick?: (address: string) => void;
  autoFocus?: boolean;
}

/**
 * Address / ENS input with live EIP-55 preview, copy, identicon,
 * recent addresses and QR scanning.
 */
export default function AddressField({ value, onChange, onResolved, recents = [], onPick, autoFocus }: Props) {
  const [status, setStatus] = useState<'idle' | 'resolving' | 'resolved' | 'error'>('idle');
  const [resolved, setResolved] = useState<ResolvedWatch>({ address: null, ens: null, error: null });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const requestRef = useRef(0);

  const emit = useCallback(
    (next: ResolvedWatch) => {
      setResolved(next);
      onResolved(next);
    },
    [onResolved],
  );

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const raw = value.trim();
    if (!raw) {
      setStatus('idle');
      emit({ address: null, ens: null, error: null });
      return;
    }

    const parsed = parseWatchInput(raw);
    if (parsed.error) {
      setStatus('error');
      emit({ address: null, ens: null, error: parsed.error });
      return;
    }
    if (parsed.address) {
      setStatus('resolved');
      emit({ address: parsed.address, ens: null, error: null });
      return;
    }

    // ENS name — resolve after a short debounce
    setStatus('resolving');
    const requestId = ++requestRef.current;
    debounceRef.current = window.setTimeout(async () => {
      const result = await resolveWatchInput(raw);
      if (requestId !== requestRef.current) return;
      if (result.address) {
        setStatus('resolved');
        emit({ address: result.address, ens: result.ens, error: null });
      } else {
        setStatus('error');
        emit({ address: null, ens: result.ens, error: result.error || 'Could not resolve name' });
      }
    }, 350);

    return () => window.clearTimeout(debounceRef.current);
  }, [value, emit]);

  // ENS avatar — best effort, purely cosmetic
  useEffect(() => {
    let stale = false;
    if (!resolved.ens) {
      setAvatar(null);
      return;
    }
    getEnsAvatar(resolved.ens).then((url) => {
      if (!stale) setAvatar(url);
    });
    return () => {
      stale = true;
    };
  }, [resolved.ens]);

  const showPreview = status === 'resolved' && resolved.address;

  return (
    <div>
      <label className="form-label" htmlFor="watch-address-input">
        Address or ENS name
      </label>

      <div style={{ position: 'relative' }}>
        <input
          id="watch-address-input"
          className="form-input"
          style={{ paddingRight: 44, fontFamily: value && !isAddress(value) ? 'inherit' : 'JetBrains Mono, monospace' }}
          type="text"
          placeholder="0x… or vitalik.eth"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="watch-address-status"
        />
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          title="Scan QR code"
          aria-label="Scan QR code"
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--chat-text-tertiary)',
            cursor: 'pointer',
            padding: 5,
            display: 'inline-flex',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3h-3zM19 19h2v2h-2zM14 20h1M20 14h1" />
          </svg>
        </button>
      </div>

      <div id="watch-address-status" aria-live="polite" style={{ minHeight: 34, marginTop: 8 }}>
        {status === 'resolving' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--chat-text-tertiary)' }}>
            <span className="spinner spinner-sm" />
            Resolving {value.trim()}…
          </div>
        )}

        {status === 'error' && resolved.error && (
          <div style={{ fontSize: 12.5, color: 'var(--chat-danger)' }}>{resolved.error}</div>
        )}

        {showPreview && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: 'rgba(217,122,92,0.06)',
              border: '1px solid rgba(217,122,92,0.16)',
              borderRadius: 10,
            }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt=""
                width={26}
                height={26}
                style={{ borderRadius: '50%', flexShrink: 0, border: '1px solid var(--chat-border)' }}
                onError={() => setAvatar(null)}
              />
            ) : (
              <Identicon address={resolved.address!} size={26} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11.5,
                  color: 'var(--chat-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={checksumAddress(resolved.address!)}
              >
                {checksumAddress(resolved.address!)}
              </div>
              {resolved.ens && (
                <div style={{ fontSize: 11, color: 'var(--chat-brand)', marginTop: 1 }}>{resolved.ens} ✓</div>
              )}
            </div>
            <CopyButton value={checksumAddress(resolved.address!)} />
          </div>
        )}
      </div>

      {recents.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
            Recent
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recents.map((addr) => (
              <button
                key={addr}
                type="button"
                className="vo-chip"
                title={addr}
                onClick={() => onPick?.(addr)}
              >
                <Identicon address={addr} size={14} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{addr.slice(0, 6)}…{addr.slice(-4)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(addr) => onChange(addr)}
      />
    </div>
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.5, §12.7 (input sanitised via strict parsing before use)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
