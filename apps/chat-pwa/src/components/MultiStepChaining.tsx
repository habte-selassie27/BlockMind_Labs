import { useState } from 'react';

interface Step {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  result?: string;
}

interface Props {
  onComplete: (steps: Step[]) => void;
  onCancel: () => void;
}

const presets = [
  { label: 'Swap → Stake', prompt: 'Swap 50 GIWA for USDC, then stake the USDC', steps: ['Swap 50 GIWA for USDC', 'Stake USDC in validation pool'] },
  { label: 'Swap → Send', prompt: 'Swap 100 GIWA for USDC and send to 0x...', steps: ['Swap 100 GIWA for USDC', 'Send USDC to recipient'] },
  { label: 'Portfolio Rebalance', prompt: 'Rebalance my portfolio to 50% GIWA, 50% USDC', steps: ['Analyze current allocation', 'Calculate rebalance amounts', 'Execute rebalance swaps'] },
];

export default function MultiStepChaining({ onComplete, onCancel }: Props) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  const handlePreset = (preset: typeof presets[0]) => {
    const parsedSteps = preset.steps.map((prompt, i) => ({
      id: `${Date.now()}_${i}`,
      prompt,
      status: 'pending' as const,
    }));
    setSteps(parsedSteps);
    setCustomPrompt(preset.prompt);
  };

  const handleCustomSubmit = () => {
    if (!customPrompt.trim()) return;
    // Parse multi-step from natural language
    const parts = customPrompt.split(/,\s*then\s+|,\s*and\s+|\n+/i).filter(Boolean);
    const parsedSteps = parts.map((prompt, i) => ({
      id: `${Date.now()}_${i}`,
      prompt: prompt.trim(),
      status: 'pending' as const,
    }));
    setSteps(parsedSteps);
  };

  const handleRun = async () => {
    setRunning(true);
    for (let i = 0; i < steps.length; i++) {
      setSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'running' } : s
      ));
      // Simulate execution
      await new Promise(r => setTimeout(r, 1500));
      setSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'success', result: 'Completed' } : s
      ));
    }
    setRunning(false);
    onComplete(steps);
  };

  return (
    <div className="chain-card">
      <div className="chain-header">
        <span className="chain-icon">⛓️</span>
        <div>
          <h3 className="chain-title">Multi-Step Transaction</h3>
          <p className="chain-subtitle">Chain multiple actions into one flow</p>
        </div>
      </div>

      {steps.length === 0 ? (
        <>
          <div className="chain-presets">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className="chain-preset"
                onClick={() => handlePreset(preset)}
              >
                <span className="chain-preset-label">{preset.label}</span>
                <span className="chain-preset-desc">{preset.prompt}</span>
              </button>
            ))}
          </div>

          <div className="chain-custom">
            <textarea
              className="chain-input"
              placeholder="Or describe your multi-step action...&#10;e.g. 'Swap 50 GIWA for USDC, then stake it, and send rewards to 0x...'"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
            <button
              className="chain-btn-parse"
              onClick={handleCustomSubmit}
              disabled={!customPrompt.trim()}
            >
              Parse Steps →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="chain-steps">
            {steps.map((step, i) => (
              <div key={step.id} className={`chain-step chain-step-${step.status}`}>
                <div className="chain-step-left">
                  <span className="chain-step-num">
                    {step.status === 'success' ? '✓' :
                     step.status === 'running' ? '◉' :
                     step.status === 'error' ? '✕' : i + 1}
                  </span>
                  {i < steps.length - 1 && <div className="chain-step-line" />}
                </div>
                <div className="chain-step-content">
                  <span className="chain-step-prompt">{step.prompt}</span>
                  {step.result && (
                    <span className="chain-step-result">{step.result}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="chain-actions">
            <button className="chain-btn-cancel" onClick={onCancel} disabled={running}>
              Cancel
            </button>
            <button
              className="chain-btn-run"
              onClick={handleRun}
              disabled={running || steps.every(s => s.status === 'success')}
            >
              {running ? 'Running...' : 'Execute All Steps →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
