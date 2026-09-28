import { useState } from 'react';

interface Props {
  onSendPrompt: (text: string) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

const steps = [
  {
    title: 'Ask in plain English',
    desc: 'No forms. Just type what you want — “check my balance”, “swap 10 GIWA”, “send 0.01 to 0x…”.',
    prompt: 'check my GIWA balance',
    promptLabel: 'Check my balance',
    icon: 'chat',
  },
  {
    title: 'Swap with one prompt',
    desc: 'AI finds the best route, simulates the trade, and shows you gas + price impact before you sign.',
    prompt: 'swap 0.1 GIWA for USDC',
    promptLabel: 'Swap tokens',
    icon: 'swap',
  },
  {
    title: 'Always simulated first',
    desc: 'Every transaction is simulated. You see the full summary and Scam Shield result before signing.',
    prompt: 'show my portfolio',
    promptLabel: 'View portfolio',
    icon: 'shield',
  },
];

function StepIcon({ name }: { name: string }) {
  const p = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'chat') return <svg {...p} viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L2 21l1.5-6.5A8.5 8.5 0 0 1 21 11.5z" /></svg>;
  if (name === 'swap') return <svg {...p} viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  return <svg {...p} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

export default function OnboardingWizard({ onSendPrompt, walletConnected, onConnectWallet }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const step = steps[currentStep];

  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid var(--chat-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        maxWidth: 440,
        width: '100%',
        alignSelf: 'center',
        boxShadow: 'var(--chat-shadow-card)',
        animation: 'popIn 380ms var(--ease-spring) both',
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--chat-border-soft)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--chat-text-tertiary)',
          cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            aria-label={`Go to step ${i + 1}`}
            style={{
              height: 6,
              width: i === currentStep ? 24 : 8,
              borderRadius: 9999,
              background: i === currentStep ? 'var(--chat-brand)' : i < currentStep ? 'var(--chat-success)' : 'rgba(255,255,255,0.12)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 200ms var(--ease-out)',
              padding: 0,
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--chat-brand-soft)',
            border: '1px solid rgba(217,122,92,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chat-brand)',
            margin: '0 auto 10px',
          }}
        >
          <StepIcon name={step.icon} />
        </div>
        <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--chat-text-primary)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--chat-text-muted)', lineHeight: 1.55, margin: 0, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          {step.desc}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!walletConnected ? (
          <button className="btn btn-primary" onClick={onConnectWallet} style={{ width: '100%', justifyContent: 'center' }}>
            Connect Wallet First
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => onSendPrompt(step.prompt)} style={{ width: '100%', justifyContent: 'center' }}>
            Try: {step.promptLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              background: 'none',
              border: '1px solid transparent',
              color: currentStep === 0 ? 'var(--chat-text-faint)' : 'var(--chat-text-tertiary)',
              fontSize: 12.5,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: currentStep === 0 ? 0.5 : 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--chat-border-soft)',
                color: 'var(--chat-text-secondary)',
                fontSize: 12.5,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 9999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Next
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--chat-text-tertiary)',
                fontSize: 12.5,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Skip Tour
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--chat-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 11, color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
        <span>Step {currentStep + 1} of {steps.length}</span>
        <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--chat-border-strong)' }} />
        <span>⌘K for commands</span>
      </div>
    </div>
  );
}
