import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConnect: (method: 'metamask' | 'walletconnect' | 'blockmind' | 'manual') => Promise<void>;
  connecting: boolean;
}

export default function WalletModal({ open, onClose, onConnect, connecting }: Props) {
  const [manualAddress, setManualAddress] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'choose' | 'manual'>('choose');

  if (!open) return null;

  const handleConnect = async (method: 'metamask' | 'walletconnect' | 'blockmind' | 'manual') => {
    setError('');
    try {
      if (method === 'manual') {
        setStep('manual');
        return;
      }
      await onConnect(method);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    }
  };

  const handleManualSubmit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualAddress)) {
      setError('Invalid address format');
      return;
    }
    try {
      await onConnect('manual');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(8,12,24,0.85)',
      backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div
        className="card card-elevated"
        style={{
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          padding: 'var(--space-8)',
          animation: 'msg-in 0.35s cubic-bezier(0.0, 0.0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            fontSize: 24,
          }}>
            🔗
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            Connect Wallet
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}>
            Choose a method to connect your wallet
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            fontSize: 13,
            color: 'var(--color-error-400)',
          }}>
            {error}
          </div>
        )}

        {step === 'choose' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* MetaMask */}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-3)', padding: '14px 16px' }}
              onClick={() => handleConnect('metamask')}
              disabled={connecting}
            >
              <span style={{ fontSize: 24 }}>🦊</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>MetaMask</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Browser extension
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>→</span>
            </button>

            {/* Blockmind Wallet */}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-3)', padding: '14px 16px' }}
              onClick={() => handleConnect('blockmind')}
              disabled={connecting}
            >
              <span style={{ fontSize: 24 }}>⬡</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>Blockmind Wallet</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  GIWA-native wallet extension
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>→</span>
            </button>

            {/* Manual */}
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-3)', padding: '14px 16px' }}
              onClick={() => handleConnect('manual')}
              disabled={connecting}
            >
              <span style={{ fontSize: 24 }}>📋</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>View-Only Address</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Paste address to view balance (no signing)
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>→</span>
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}>
                Wallet Address
              </label>
              <input
                className="input"
                type="text"
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => { setManualAddress(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { setStep('choose'); setManualAddress(''); setError(''); }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleManualSubmit}
                disabled={!manualAddress || connecting}
              >
                {connecting ? <span className="spinner spinner-sm" /> : null}
                Connect
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--space-4)',
            right: 'var(--space-4)',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-tertiary)',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
