import { useState } from 'react';

interface SimulationResult {
  status: 'success' | 'failed' | 'warning';
  gas_estimate?: string;
  gas_cost_usd?: string;
  output_amount?: string;
  output_token?: string;
  price_impact?: string;
  price_impact_level?: 'low' | 'medium' | 'high';
  route?: string;
  slippage?: string;
  net_worth_change?: string;
}

interface Props {
  summary: Record<string, unknown>;
  simulation?: SimulationResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TxSimulationCard({ summary, simulation, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    onConfirm();
  };

  const action = (summary.action as string) || 'Transaction';
  const token = (summary.token as string) || '';
  const amount = (summary.amount as string) || '';
  const to = (summary.to as string) || '';
  const from = (summary.from as string) || '';

  const sim = simulation || {
    status: 'success' as const,
    gas_estimate: summary.gas_estimate as string || '~0.001 GIWA',
    gas_cost_usd: summary.gas_cost_usd as string || '≈ $0.0002',
    output_amount: summary.output_amount as string || amount,
    output_token: summary.output_token as string || token,
    price_impact: summary.price_impact as string || '<0.01%',
    price_impact_level: (summary.price_impact_level as 'low' | 'medium' | 'high') || 'low',
    route: summary.route as string || undefined,
    slippage: summary.slippage as string || '0.5%',
  };

  return (
    <div className="sim-card" role="alertdialog" aria-labelledby="sim-title" aria-describedby="sim-body">
      {/* Header */}
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon">
            {action.toLowerCase().includes('swap') ? '🔄' :
             action.toLowerCase().includes('transfer') || action.toLowerCase().includes('send') ? '↗️' :
             action.toLowerCase().includes('stake') ? '🔒' :
             action.toLowerCase().includes('approve') ? '✓' : '⚡'}
          </div>
          <div>
            <div className="sim-header-title" id="sim-title">{action}</div>
            <div className="sim-header-subtitle">
              {amount && token ? `${amount} ${token}` : 'Review details below'}
            </div>
          </div>
        </div>
        <div className={`sim-status sim-status-${sim.status}`}>
          <span className="sim-status-dot" />
          {sim.status === 'success' ? 'Simulated' : sim.status === 'warning' ? 'Warning' : 'Failed'}
        </div>
      </div>

      <div id="sim-body">
        {/* Main Info Row */}
        <div className="sim-info-row">
          {from && (
            <div className="sim-info-item">
              <span className="sim-info-label">From</span>
              <span className="sim-info-value sim-info-mono">
                {from.length > 12 ? `${from.slice(0, 6)}...${from.slice(-4)}` : from}
              </span>
            </div>
          )}
          {to && (
            <div className="sim-info-item">
              <span className="sim-info-label">To</span>
              <span className="sim-info-value sim-info-mono">
                {to.length > 12 ? `${to.slice(0, 6)}...${to.slice(-4)}` : to}
              </span>
            </div>
          )}
          {sim.output_amount && sim.output_token && (
            <div className="sim-info-item">
              <span className="sim-info-label">You Receive</span>
              <span className="sim-info-value sim-info-highlight">
                {sim.output_amount} {sim.output_token}
              </span>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="sim-cost-grid">
          <div className="sim-cost-item">
            <span className="sim-cost-label">Gas Estimate</span>
            <span className="sim-cost-value">{sim.gas_estimate}</span>
            {sim.gas_cost_usd && (
              <span className="sim-cost-sub">{sim.gas_cost_usd}</span>
            )}
          </div>
          <div className="sim-cost-item">
            <span className="sim-cost-label">Price Impact</span>
            <span className={`sim-cost-value sim-impact-${sim.price_impact_level || 'low'}`}>
              {sim.price_impact || '<0.01%'}
            </span>
            <span className="sim-cost-sub">
              {sim.price_impact_level === 'high' ? '⚠️ High impact' :
               sim.price_impact_level === 'medium' ? 'Moderate' : '✓ Safe'}
            </span>
          </div>
          {sim.slippage && (
            <div className="sim-cost-item">
              <span className="sim-cost-label">Max Slippage</span>
              <span className="sim-cost-value">{sim.slippage}</span>
              <span className="sim-cost-sub">Tolerance</span>
            </div>
          )}
          {sim.route && (
            <div className="sim-cost-item">
              <span className="sim-cost-label">Route</span>
              <span className="sim-cost-value sim-info-mono" style={{ fontSize: '0.78rem' }}>{sim.route}</span>
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="sim-security">
          <span className="sim-security-icon">🛡️</span>
          <span className="sim-security-text">
            Simulated successfully · No real funds at risk · Requires wallet signature
          </span>
        </div>

        {/* Expandable Details */}
        {Object.keys(summary).length > 3 && (
          <button className="sim-details-toggle" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? '▾ Hide Details' : '▸ Show Raw Details'}
          </button>
        )}

        {showDetails && (
          <div className="sim-details">
            {Object.entries(summary).map(([key, value]) => (
              <div className="sim-detail-row" key={key}>
                <span className="sim-detail-key">{key.replace(/_/g, ' ')}</span>
                <span className="sim-detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sim-actions">
        <button className="sim-btn sim-btn-cancel" onClick={onCancel} disabled={loading}>
          Reject
        </button>
        <button className="sim-btn sim-btn-confirm" onClick={handleConfirm} disabled={loading || sim.status === 'failed'}>
          {loading ? (
            <>
              <span className="sim-spinner" />
              Signing...
            </>
          ) : (
            <>
              Sign & Send →
            </>
          )}
        </button>
      </div>
    </div>
  );
}
