import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBalance, getBlockNumber, formatUsd } from '../lib/giwa-rpc';
import SeoHead from '../components/SeoHead';

interface TxRecord {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  action: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  chainId: number;
}

const GIWA_PRICE = 0.20;

function getStoredTxs(): TxRecord[] {
  try {
    const raw = localStorage.getItem('blockmind_tx_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getExplorerUrl(hash: string): string {
  return `https://sepolia-explorer.giwa.io/tx/${hash}`;
}

export default function TxHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [txs, setTxs] = useState<TxRecord[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('blockmind_wallet');
    if (stored) {
      try {
        const wallet = JSON.parse(stored);
        const addr = wallet.address || '';
        setWalletAddress(addr);

        if (addr) {
          getBalance(addr).then(setBalance).catch(() => {});
          getBlockNumber().then(setBlockNumber).catch(() => {});
        }
      } catch {}
    }

    setTxs(getStoredTxs());

    const interval = setInterval(() => {
      setTxs(getStoredTxs());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = txs.filter(tx => {
    if (filter !== 'all' && tx.status !== filter) return false;
    if (search && !tx.hash.toLowerCase().includes(search.toLowerCase()) &&
        !tx.action.toLowerCase().includes(search.toLowerCase()) &&
        !tx.token.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="corp-page">
      <nav className="corp-nav">
        <div className="corp-nav-inner">
          <div className="corp-nav-left">
            <div className="corp-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="corp-logo-icon">⚡</span>
              <span className="corp-logo-text">Blockmind</span>
            </div>
            <span className="corp-nav-divider" />
            <a onClick={() => navigate('/')} className="corp-nav-link">Home</a>
            <a onClick={() => navigate('/chat')} className="corp-nav-link">Chat</a>
            <a onClick={() => navigate('/portfolio')} className="corp-nav-link">Portfolio</a>
          </div>
          <div className="corp-nav-right">
            <a onClick={() => navigate('/status')} className="corp-nav-link">Status</a>
            <a onClick={() => navigate('/chat')} className="corp-cta-btn">Open Chat</a>
          </div>
        </div>
      </nav>

      <main className="portfolio-main">
        <div className="portfolio-inner">
          <SeoHead title="Transaction History" description="View your transaction history on GIWA Sepolia — transfers, swaps, and contract interactions." path="/history" />
          <div className="portfolio-header">
            <div className="portfolio-header-left">
              <span className="portfolio-tag">HISTORY</span>
              <h1 className="portfolio-title">Transaction History</h1>
              {walletAddress && (
                <span className="portfolio-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              )}
            </div>
          </div>

          {/* Wallet Summary */}
          {walletAddress && (
            <div className="tx-wallet-summary">
              <div className="tx-wallet-stat">
                <span className="tx-wallet-label">Balance</span>
                <span className="tx-wallet-value">{balance ? `${balance} GIWA` : 'Loading...'}</span>
              </div>
              <div className="tx-wallet-stat">
                <span className="tx-wallet-label">Balance (USD)</span>
                <span className="tx-wallet-value">{balance ? formatUsd(parseFloat(balance) * GIWA_PRICE) : '—'}</span>
              </div>
              <div className="tx-wallet-stat">
                <span className="tx-wallet-label">Latest Block</span>
                <span className="tx-wallet-value">#{blockNumber ?? '...'}</span>
              </div>
              <div className="tx-wallet-stat">
                <span className="tx-wallet-label">Network</span>
                <span className="tx-wallet-value">GIWA Sepolia</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="tx-filters">
            <div className="tx-filter-group">
              {(['all', 'confirmed', 'pending', 'failed'] as const).map(f => (
                <button
                  key={f}
                  className={`tx-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <input
              className="tx-search"
              placeholder="Search by hash, action, or token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* TX List */}
          <div className="tx-list">
            {filtered.length === 0 ? (
              <div className="tx-empty">
                <span className="tx-empty-icon">📭</span>
                <p>{txs.length === 0
                  ? 'No transactions yet. Send a transaction from the chat to see it here.'
                  : 'No transactions match your filter.'
                }</p>
                {txs.length === 0 && (
                  <button className="portfolio-btn-primary" onClick={() => navigate('/chat')}>
                    Go to Chat
                  </button>
                )}
              </div>
            ) : (
              filtered.map((tx) => (
                <div key={tx.hash} className={`tx-row tx-row-${tx.status}`}>
                  <div className="tx-row-left">
                    <span className={`tx-status-dot tx-status-${tx.status}`} />
                    <div className="tx-row-info">
                      <span className="tx-row-action">{tx.action}</span>
                      <span className="tx-row-hash">{tx.hash.length > 20 ? `${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}` : tx.hash}</span>
                    </div>
                  </div>
                  <div className="tx-row-center">
                    <span className="tx-row-amount">{tx.amount} {tx.token}</span>
                    <span className="tx-row-arrow">→</span>
                    <span className="tx-row-to">{tx.to.length > 10 ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : tx.to}</span>
                  </div>
                  <div className="tx-row-right">
                    <span className="tx-row-time">{formatDate(tx.timestamp)}</span>
                    <a
                      href={getExplorerUrl(tx.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="tx-row-link"
                    >
                      Explorer ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
