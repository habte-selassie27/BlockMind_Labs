import { useState } from 'react';

interface Props {
  onSendPrompt: (text: string) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

const steps = [
  {
    icon: '💬',
    title: 'Ask in plain English',
    desc: 'No complex interfaces. Just type what you want to do with your blockchain.',
    prompt: 'check my GIWA balance',
    promptLabel: 'Check my balance',
  },
  {
    icon: '🔄',
    title: 'Swap tokens instantly',
    desc: 'AI finds the best route and executes the swap with simulation first.',
    prompt: 'swap 10 GIWA for USDC',
    promptLabel: 'Swap tokens',
  },
  {
    icon: '🛡️',
    title: 'Always simulated first',
    desc: 'Every transaction is simulated before signing. You see the full summary.',
    prompt: 'show my portfolio',
    promptLabel: 'View portfolio',
  },
];

export default function OnboardingWizard({ onSendPrompt, walletConnected, onConnectWallet }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const step = steps[currentStep];

  return (
    <div className="onboard-wizard">
        <button className="onboard-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ✕
      </button>

      <div className="onboard-progress">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`onboard-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}
            onClick={() => setCurrentStep(i)}
          />
        ))}
      </div>

      <div className="onboard-content">
        <span className="onboard-icon">{step.icon}</span>
        <h3 className="onboard-title">{step.title}</h3>
        <p className="onboard-desc">{step.desc}</p>
      </div>

      <div className="onboard-actions">
        {!walletConnected ? (
          <button className="onboard-btn-primary" onClick={onConnectWallet}>
            Connect Wallet First →
          </button>
        ) : (
          <button
            className="onboard-btn-primary"
            onClick={() => onSendPrompt(step.prompt)}
          >
            Try: {step.promptLabel} →
          </button>
        )}

        <div className="onboard-nav">
          {currentStep > 0 && (
            <button className="onboard-btn-ghost" onClick={() => setCurrentStep(currentStep - 1)}>
              ← Back
            </button>
          )}
          {currentStep < steps.length - 1 ? (
            <button className="onboard-btn-ghost" onClick={() => setCurrentStep(currentStep + 1)}>
              Next →
            </button>
          ) : (
            <button className="onboard-btn-ghost" onClick={() => setDismissed(true)}>
              Skip Tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
