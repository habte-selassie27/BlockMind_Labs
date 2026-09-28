interface Wallet {
  address: string;
  owner: string;
  chainId: number;
  isDeployed: boolean;
  spendingLimit?: string;
  sessionPermissions?: Array<{ tool: string; limit: string; expiry: number }>;
  recoveryAddresses?: string[];
}

interface Props {
  wallet: Wallet;
  onAddContact?: () => void;
}

export default function SmartWalletCard({ wallet, onAddContact }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #8B5CF6' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#8B5CF6,#D97A5C)' }}>🔐</div>
          <div>
            <div className="sim-header-title">GIWA AA Smart Wallet</div>
            <div className="sim-header-subtitle" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)} · {wallet.chainId === 91342 ? 'Sepolia' : 'Mainnet'}</div>
          </div>
        </div>
        <div className={`sim-status ${wallet.isDeployed ? 'sim-status-success' : 'sim-status-warning'}`}>
          <span className="sim-status-dot" /> {wallet.isDeployed ? 'Deployed' : 'Pending'}
        </div>
      </div>

      <div className="sim-info-row">
        <div className="sim-info-item">
          <span className="sim-info-label">Owner</span>
          <span className="sim-info-value sim-info-mono">{wallet.owner.slice(0, 6)}…{wallet.owner.slice(-4)}</span>
        </div>
        <div className="sim-info-item">
          <span className="sim-info-label">Spending Limit</span>
          <span className="sim-info-value">{wallet.spendingLimit || '1000 GIWA / day'}</span>
        </div>
      </div>

      {wallet.sessionPermissions && wallet.sessionPermissions.length > 0 && (
        <div style={{ margin: 'var(--space-3) 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--chat-text-faint)', marginBottom: 6 }}>Session Permissions</div>
          {wallet.sessionPermissions.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.tool}</span>
              <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>{p.limit} · {new Date(p.expiry * 1000).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sim-security">
        <span className="sim-security-icon">🛡️</span>
        <span className="sim-security-text">EIP-7702 · One-click approval · Recovery via {wallet.recoveryAddresses?.[0]?.slice(0, 6)}…</span>
      </div>

      <div className="sim-cost-grid">
        <div className="sim-cost-item">
          <span className="sim-cost-label">Type</span>
          <span className="sim-cost-value">Smart Account</span>
          <span className="sim-cost-sub">AA wallet 8923 on GIWA</span>
        </div>
        <div className="sim-cost-item">
          <span className="sim-cost-label">Explorer</span>
          <a href={`https://sepolia-explorer.giwa.io/address/${wallet.address}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#D97A5C' }}>View →</a>
        </div>
      </div>

      {onAddContact && (
        <div className="sim-actions">
          <button className="sim-btn sim-btn-confirm" style={{ width: '100%' }} onClick={onAddContact}>Manage Wallet →</button>
        </div>
      )}
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
