import { useState } from 'react';

interface Token {
  symbol: string;
  name: string;
  amount: string;
  usd: string;
  change: string;
  up: boolean;
}

interface TxRecord {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
}

interface Props {
  walletAddress?: string;
  balance?: string | null;
  tokens?: Token[];
  txHistory?: TxRecord[];
  onToolClick?: (tool: string) => void;
}

export default function ContextPanel({ walletAddress, balance, tokens: _tokens = [], txHistory = [], onToolClick }: Props) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'tools' | 'history'>('portfolio');

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Not connected';

  const tools = [
    { name: 'balance', label: 'Check Balance', icon: '💰', needsConfirm: false },
    { name: 'transfer', label: 'Transfer Tokens', icon: '📤', needsConfirm: true },
    { name: 'swap', label: 'Swap Tokens', icon: '🔄', needsConfirm: true },
    { name: 'risk', label: 'Contract Risk', icon: '🛡️', needsConfirm: false },
    { name: 'monitor', label: 'Monitor Address', icon: '👁', needsConfirm: false },
  ];

  return (
    <div className="context-panel">
      <div className="context-tabs">
        {(['portfolio', 'tools', 'history'] as const).map((tab) => (
          <button
            key={tab}
            className={`context-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="context-content">
        {activeTab === 'portfolio' && (
          <>
            <div className="sidebar-label" style={{ marginBottom: 'var(--space-3)' }}>Wallet</div>
            <div className="address" style={{ marginBottom: 'var(--space-4)' }}>
              <span>{shortAddress}</span>
              {walletAddress && (
                <button
                  className="address-copy"
                  aria-label="Copy address"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                  }}
                >
                  📋
                </button>
              )}
            </div>

            <div className="sidebar-label" style={{ marginBottom: 'var(--space-3)' }}>Tokens</div>
            {!walletAddress ? (
              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                Connect wallet to view tokens
              </div>
            ) : balance ? (
              <div className="token-row">
                <div className="token-icon">G</div>
                <div>
                  <div className="token-name">GIWA</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>GIWA Sepolia</div>
                </div>
                <span className="token-amount">{balance}</span>
                <span className="token-usd">≈ $0.2</span>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                Loading balance...
              </div>
            )}
          </>
        )}

        {activeTab === 'tools' && (
          <>
            <div className="sidebar-label" style={{ marginBottom: 'var(--space-3)' }}>Available Tools</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="tool-card clickable"
                  style={{ flexDirection: 'row', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => onToolClick?.(tool.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onToolClick?.(tool.name)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span>{tool.icon}</span>
                    <span>{tool.label}</span>
                  </span>
                  {tool.needsConfirm && <span className="badge badge-warning">Form</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="sidebar-label" style={{ marginBottom: 'var(--space-3)' }}>Recent Transactions</div>
            {txHistory.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-8) 0' }}>
                No transactions yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {txHistory.map((tx) => (
                  <div
                    key={tx.hash}
                    className="tool-card"
                    style={{ flexDirection: 'column', gap: 'var(--space-1)', cursor: 'pointer' }}
                    onClick={() => window.open(`https://sepolia-explorer.giwa.io/tx/${tx.hash}`, '_blank')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {tx.amount} {tx.token}
                      </span>
                      <span className={`badge badge-${tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}`}>
                        {tx.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
