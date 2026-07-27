import { useState, useEffect, useCallback } from 'react';

interface Approval {
  id: string;
  token: string;
  tokenAddress: string;
  spender: string;
  spenderName: string;
  amount: string;
  chainId: number;
  date: string;
}

interface Props {
  walletAddress: string;
  chainId: number;
  onClose: () => void;
}

export default function TokenApprovalsManager({ walletAddress, chainId, onClose }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Mock data — in production this would call an API
  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setApprovals([
        {
          id: '1',
          token: 'USDC',
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
          spenderName: 'Uniswap Router',
          amount: '115792089237316195423570985008687907853269984665640564039457.584',
          chainId: 1,
          date: '2025-07-20',
        },
        {
          id: '2',
          token: 'GIWA',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          spender: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          spenderName: 'Uniswap V3 Router',
          amount: '500',
          chainId: 91342,
          date: '2025-07-22',
        },
      ]);
      setLoading(false);
    };
    fetchApprovals();
  }, [walletAddress, chainId]);

  const handleRevoke = useCallback(async (approvalId: string) => {
    setRevoking(approvalId);
    // Simulate revoke — in production this would send a TX
    await new Promise(r => setTimeout(r, 1500));
    setApprovals(prev => prev.filter(a => a.id !== approvalId));
    setRevoking(null);
  }, []);

  const isUnlimited = (amount: string) => {
    return amount.length > 10;
  };

  return (
    <div className="approvals-panel">
      <div className="approvals-header">
        <div className="approvals-header-left">
          <span className="approvals-icon">🔐</span>
          <div>
            <h3 className="approvals-title">Token Approvals</h3>
            <p className="approvals-subtitle">
              {approvals.length} active approval{approvals.length !== 1 ? 's' : ''} · {approvals.filter(a => isUnlimited(a.amount)).length} unlimited
            </p>
          </div>
        </div>
        <button className="approvals-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {approvals.some(a => isUnlimited(a.amount)) && (
        <div className="approvals-warning">
          <span className="approvals-warning-icon">⚠️</span>
          <span className="approvals-warning-text">
            You have {approvals.filter(a => isUnlimited(a.amount)).length} unlimited approval{approvals.filter(a => isUnlimited(a.amount)).length !== 1 ? 's' : ''}. These give unlimited access to your tokens. Review and revoke any you don't recognize.
          </span>
        </div>
      )}

      <div className="approvals-list">
        {loading ? (
          <div className="approvals-loading">
            <span className="approvals-spinner" />
            Scanning approvals...
          </div>
        ) : approvals.length === 0 ? (
          <div className="approvals-empty">
            <span className="approvals-empty-icon">✓</span>
            <p>No active approvals found.</p>
          </div>
        ) : (
          approvals.map((approval) => (
            <div
              key={approval.id}
              className={`approval-card ${isUnlimited(approval.amount) ? 'approval-unlimited' : ''}`}
            >
              <div className="approval-card-top">
                <div className="approval-card-left">
                  <span className="approval-token">{approval.token}</span>
                  <div className="approval-card-info">
                    <span className="approval-spender">{approval.spenderName}</span>
                    <span className="approval-spender-addr">
                      {approval.spender.slice(0, 6)}...{approval.spender.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="approval-card-right">
                  <span className={`approval-amount ${isUnlimited(approval.amount) ? 'approval-amount-unlimited' : ''}`}>
                    {isUnlimited(approval.amount) ? 'Unlimited' : `${approval.amount} ${approval.token}`}
                  </span>
                  <span className="approval-date">{approval.date}</span>
                </div>
              </div>

              {isUnlimited(approval.amount) && (
                <div className="approval-badge-unlimited">⚠️ Unlimited Access</div>
              )}

              <button
                className="approval-revoke-btn"
                onClick={() => handleRevoke(approval.id)}
                disabled={revoking === approval.id}
              >
                {revoking === approval.id ? (
                  <>
                    <span className="approval-spinner" />
                    Revoking...
                  </>
                ) : (
                  'Revoke'
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="approvals-footer">
        <p className="approvals-footer-text">
          Revoking an approval requires a small gas fee. Only revoke approvals you no longer use.
        </p>
      </div>
    </div>
  );
}
