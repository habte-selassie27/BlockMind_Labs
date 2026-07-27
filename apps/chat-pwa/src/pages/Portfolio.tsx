import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBalance, GIWA_TOKENS, formatUsd, formatTokenAmount, rpcCall } from '../lib/giwa-rpc';
import { getTokenPrices, getFallbackPrice } from '../lib/price-feeds';
import SeoHead from '../components/SeoHead';

interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  usdValue: number;
  change24h: number;
  price: number;
  color: string;
  address: string;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('blockmind_wallet');
    if (stored) {
      try {
        const wallet = JSON.parse(stored);
        setWalletAddress(wallet.address || '');
      } catch {}
    }

    const loadPortfolio = async () => {
      setLoading(true);
      setError(null);

      try {
        let address = walletAddress;
        if (!address && stored) {
          try { address = JSON.parse(stored).address; } catch {}
        }

        if (!address) {
          setTokens([]);
          setTotalUsd(0);
          setLoading(false);
          return;
        }

        // Fetch native balance + ERC-20 balances + prices in parallel
        const tokenList = GIWA_TOKENS.filter(t => t.address !== '0x0000000000000000000000000000000000000000');

        const [nativeBalance, priceData] = await Promise.all([
          getBalance(address),
          getTokenPrices().catch(() => new Map()),
        ]);

        // Build token list starting with native
        const allTokens: TokenBalance[] = [];

        // Native GIWA token
        const giwaPrice = priceData.get('GIWA')?.price || getFallbackPrice('GIWA');
        const giwaChange = priceData.get('GIWA')?.change24h || 0;
        allTokens.push({
          symbol: 'GIWA',
          name: 'GIWA',
          amount: nativeBalance,
          usdValue: parseFloat(nativeBalance) * giwaPrice,
          change24h: giwaChange,
          price: giwaPrice,
          color: '#D97A5C',
          address: '0x0000000000000000000000000000000000000000',
        });

        // ERC-20 tokens — query on-chain balances
        const erc20Results = await Promise.allSettled(
          tokenList.map(async (token) => {
            try {
              const encoded = token.address.toLowerCase().replace('0x', '').padStart(64, '0');
              const balanceHex: string = await rpcCall('eth_call', [
                { to: token.address, data: '0x70a08231' + encoded },
                'latest',
              ]);
              const balanceRaw = BigInt(balanceHex);
              const balance = Number(balanceRaw) / 10 ** token.decimals;
              return { token, balance, balanceRaw };
            } catch {
              return { token, balance: 0, balanceRaw: 0n };
            }
          })
        );

        for (const result of erc20Results) {
          if (result.status === 'fulfilled' && result.value.balance > 0) {
            const { token, balance } = result.value;
            const price = priceData.get(token.symbol)?.price || getFallbackPrice(token.symbol);
            const change = priceData.get(token.symbol)?.change24h || 0;

            allTokens.push({
              symbol: token.symbol,
              name: token.name,
              amount: formatTokenAmount(balance.toString()),
              usdValue: balance * price,
              change24h: change,
              price,
              color: token.color,
              address: token.address,
            });
          }
        }

        // Sort by USD value descending
        allTokens.sort((a, b) => b.usdValue - a.usdValue);

        setTokens(allTokens);
        const total = allTokens.reduce((sum, t) => sum + t.usdValue, 0);
        setTotalUsd(total);
        const weightedChange = total > 0
          ? allTokens.reduce((sum, t) => sum + (t.change24h * t.usdValue / total), 0)
          : 0;
        setTotalChange(weightedChange);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Portfolio fetch error:', err);
        setError('Could not fetch chain data. Retrying...');
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
    const interval = setInterval(loadPortfolio, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="portfolio-page">
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
            <a onClick={() => navigate('/portfolio')} className="corp-nav-link active">Portfolio</a>
            <a onClick={() => navigate('/docs')} className="corp-nav-link">Docs</a>
          </div>
          <div className="corp-nav-right">
            <a onClick={() => navigate('/status')} className="corp-nav-link">Status</a>
            <a onClick={() => navigate('/chat')} className="corp-cta-btn">Open Chat</a>
          </div>
        </div>
      </nav>

      <main className="portfolio-main">
        <div className="portfolio-inner">
          <SeoHead title="Portfolio" description="Your on-chain portfolio — real-time GIWA balance and token holdings." path="/portfolio" />
          <div className="portfolio-header">
            <div className="portfolio-header-left">
              <span className="portfolio-tag">PORTFOLIO</span>
              <h1 className="portfolio-title">Your Portfolio</h1>
              {walletAddress && (
                <span className="portfolio-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              )}
            </div>
            <div className="portfolio-header-actions">
              {lastUpdated && (
                <span className="portfolio-updated">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button className="portfolio-btn-secondary" onClick={() => navigate('/chat')}>
                💬 Chat
              </button>
              <button className="portfolio-btn-primary" onClick={() => navigate('/chat')}>
                ↗️ Send
              </button>
            </div>
          </div>

          {error && (
            <div className="portfolio-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="portfolio-total-card">
            {loading ? (
              <div className="portfolio-loading">
                <span className="portfolio-spinner" />
                Fetching balances from GIWA...
              </div>
            ) : (
              <>
                <span className="portfolio-total-label">Total Value</span>
                <div className="portfolio-total-row">
                  <span className="portfolio-total-usd">{formatUsd(totalUsd)}</span>
                  <span className={`portfolio-total-change ${totalChange >= 0 ? 'positive' : 'negative'}`}>
                    {totalChange >= 0 ? '↑' : '↓'} {Math.abs(totalChange).toFixed(2)}% (24h)
                  </span>
                </div>
                <div className="portfolio-total-chart">
                  {tokens.map((token) => (
                    <div
                      key={token.symbol}
                      className="portfolio-bar"
                      style={{
                        width: `${(token.usdValue / (totalUsd || 1)) * 100}%`,
                        backgroundColor: token.color,
                      }}
                      title={`${token.symbol}: ${formatUsd(token.usdValue)} (${((token.usdValue / (totalUsd || 1)) * 100).toFixed(1)}%)`}
                    />
                  ))}
                </div>
                <div className="portfolio-legend">
                  {tokens.map((token) => (
                    <span key={token.symbol} className="portfolio-legend-item">
                      <span className="portfolio-legend-dot" style={{ backgroundColor: token.color }} />
                      {token.symbol} {((token.usdValue / (totalUsd || 1)) * 100).toFixed(1)}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="portfolio-tokens-section">
            <h2 className="portfolio-section-title">Assets</h2>
            {loading ? (
              <div className="portfolio-loading">
                <span className="portfolio-spinner" />
                Loading tokens...
              </div>
            ) : tokens.length === 0 ? (
              <div className="portfolio-empty">
                <span className="portfolio-empty-icon">📭</span>
                <p>{walletAddress ? 'No tokens found for this address.' : 'Connect your wallet to view assets.'}</p>
                {!walletAddress && (
                  <button className="portfolio-btn-primary" onClick={() => navigate('/chat')}>
                    Connect Wallet
                  </button>
                )}
              </div>
            ) : (
              <div className="portfolio-token-list">
                <div className="portfolio-token-header">
                  <span>Asset</span>
                  <span>Price</span>
                  <span>Balance</span>
                  <span>Value</span>
                  <span>24h</span>
                </div>
                {tokens.map((token) => (
                  <div key={token.symbol} className="portfolio-token-row">
                    <div className="portfolio-token-info">
                      <span className="portfolio-token-icon" style={{ backgroundColor: token.color }}>
                        {token.symbol[0]}
                      </span>
                      <div>
                        <span className="portfolio-token-symbol">{token.symbol}</span>
                        <span className="portfolio-token-name">{token.name}</span>
                      </div>
                    </div>
                    <span className="portfolio-token-price">{formatUsd(token.price)}</span>
                    <span className="portfolio-token-balance">{token.amount}</span>
                    <span className="portfolio-token-value">{formatUsd(token.usdValue)}</span>
                    <span className={`portfolio-token-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="portfolio-actions-section">
            <h2 className="portfolio-section-title">Quick Actions</h2>
            <div className="portfolio-actions-grid">
              <button className="portfolio-action-card" onClick={() => navigate('/chat')}>
                <span className="portfolio-action-icon">🔄</span>
                <span className="portfolio-action-label">Swap Tokens</span>
              </button>
              <button className="portfolio-action-card" onClick={() => navigate('/chat')}>
                <span className="portfolio-action-icon">📤</span>
                <span className="portfolio-action-label">Send Tokens</span>
              </button>
              <button className="portfolio-action-card" onClick={() => navigate('/chat')}>
                <span className="portfolio-action-icon">📥</span>
                <span className="portfolio-action-label">Receive</span>
              </button>
              <button className="portfolio-action-card" onClick={() => navigate('/chat')}>
                <span className="portfolio-action-icon">🔐</span>
                <span className="portfolio-action-label">Approvals</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="corp-footer">
        <div className="corp-footer-inner">
          <div className="corp-footer-brand">
            <span className="corp-logo-icon">⚡</span>
            <span className="corp-logo-text">Blockmind</span>
            <p className="corp-footer-tagline">AI infrastructure for Web3.</p>
          </div>
          <div className="corp-footer-links">
            <div className="corp-footer-col">
              <span className="corp-footer-col-title">Product</span>
              <a onClick={() => navigate('/docs')}>Documentation</a>
              <a onClick={() => navigate('/docs/api')}>API Reference</a>
              <a onClick={() => navigate('/docs/sdk')}>SDK</a>
            </div>
            <div className="corp-footer-col">
              <span className="corp-footer-col-title">Company</span>
              <a onClick={() => navigate('/about')}>About</a>
              <a onClick={() => navigate('/partnership/giwa')}>GIWA Partnership</a>
              <a onClick={() => navigate('/blog')}>Blog</a>
              <a onClick={() => navigate('/contact')}>Contact</a>
            </div>
          </div>
        </div>
        <div className="corp-footer-bottom">
          <span>© 2025 Blockmind Labs — Addis Ababa, Ethiopia</span>
        </div>
      </footer>
    </div>
  );
}
