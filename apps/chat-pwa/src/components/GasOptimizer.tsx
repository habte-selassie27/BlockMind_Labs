import { useState, useEffect } from 'react';
import { getGasPrice, getBlockNumber } from '../lib/giwa-rpc';

interface GasQuote {
  slow: { gwei: string; time: string; usd: string };
  standard: { gwei: string; time: string; usd: string };
  fast: { gwei: string; time: string; usd: string };
  suggestion: 'slow' | 'standard' | 'fast';
  reason: string;
  blockNumber: number;
}

interface Props {
  onDismiss?: () => void;
}

function estimateCostUsd(gwei: string, gasLimit: number = 21000): string {
  const eth = parseFloat(gwei) * gasLimit / 1e9;
  const usd = eth * 0.20;
  return `$${usd.toFixed(4)}`;
}

export default function GasOptimizer({ onDismiss }: Props) {
  const [gas, setGas] = useState<GasQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGas = async () => {
      try {
        const [prices, block] = await Promise.all([getGasPrice(), getBlockNumber()]);

        const gweiToFloat = (g: string) => parseFloat(g);
        const slow = gweiToFloat(prices.slow);
        const fast = gweiToFloat(prices.fast);

        setGas({
          slow: { gwei: prices.slow, time: '~4s', usd: estimateCostUsd(prices.slow) },
          standard: { gwei: prices.standard, time: '~2s', usd: estimateCostUsd(prices.standard) },
          fast: { gwei: prices.fast, time: '~1s', usd: estimateCostUsd(prices.fast) },
          suggestion: fast > slow * 2 ? 'standard' : 'fast',
          reason: 'GIWA is fast and cheap — standard is plenty for most transactions',
          blockNumber: block,
        });
        setError(null);
      } catch (err) {
        console.error('Gas fetch error:', err);
        setError('Could not fetch gas prices from GIWA');
      } finally {
        setLoading(false);
      }
    };

    fetchGas();
    const interval = setInterval(fetchGas, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !gas) {
    return (
      <div className="gas-card">
        <div className="gas-loading">
          <span className="gas-spinner" />
          Fetching gas from GIWA...
        </div>
      </div>
    );
  }

  if (error && !gas) {
    return (
      <div className="gas-card">
        <div className="gas-header">
          <div className="gas-header-left">
            <span className="gas-icon">⛽</span>
            <span className="gas-title">Gas Tracker</span>
          </div>
          {onDismiss && (
            <button className="gas-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
          )}
        </div>
        <div className="gas-error">
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  if (!gas) return null;

  return (
    <div className="gas-card">
      <div className="gas-header">
        <div className="gas-header-left">
          <span className="gas-icon">⛽</span>
          <span className="gas-title">Gas Tracker</span>
        </div>
        <div className="gas-header-right">
          <span className="gas-block">Block #{gas.blockNumber}</span>
          {onDismiss && (
            <button className="gas-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
          )}
        </div>
      </div>

      <div className="gas-grid">
        {(['slow', 'standard', 'fast'] as const).map((tier) => (
          <div
            key={tier}
            className={`gas-tier ${tier === gas.suggestion ? 'gas-tier-suggested' : ''}`}
          >
            <div className="gas-tier-header">
              <span className="gas-tier-label">
                {tier === 'slow' ? '🐢' : tier === 'standard' ? '⚡' : '🚀'} {tier}
              </span>
              {tier === gas.suggestion && (
                <span className="gas-tier-badge">Recommended</span>
              )}
            </div>
            <span className="gas-tier-gwei">{gas[tier].gwei} gwei</span>
            <span className="gas-tier-time">{gas[tier].time}</span>
            <span className="gas-tier-usd">{gas[tier].usd}</span>
          </div>
        ))}
      </div>

      <div className="gas-suggestion">
        <span className="gas-suggestion-icon">💡</span>
        <span className="gas-suggestion-text">{gas.reason}</span>
      </div>
    </div>
  );
}
