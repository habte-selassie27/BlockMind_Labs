import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';

interface UserPreferences {
  defaultSlippage: number;
  defaultChain: number;
  preferredTokens: string[];
  notificationsEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'dark' | 'light' | 'system';
  gasPreference: 'slow' | 'standard' | 'fast';
}

const DEFAULT_PREFS: UserPreferences = {
  defaultSlippage: 0.5,
  defaultChain: 91342,
  preferredTokens: ['GIWA', 'USDC', 'WETH'],
  notificationsEnabled: true,
  autoRefresh: true,
  refreshInterval: 30,
  theme: 'dark',
  gasPreference: 'standard',
};

const CHAINS = [
  { id: 91342, name: 'GIWA Sepolia', symbol: 'GIWA' },
  { id: 9134, name: 'GIWA Mainnet', symbol: 'GIWA' },
  { id: 421614, name: 'Arbitrum Sepolia', symbol: 'ETH' },
  { id: 11155420, name: 'OP Sepolia', symbol: 'ETH' },
  { id: 84532, name: 'Base Sepolia', symbol: 'ETH' },
];

const AVAILABLE_TOKENS = ['GIWA', 'USDC', 'USDT', 'WETH', 'DAI'];

export default function Preferences() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('blockmind_preferences');
    if (stored) {
      try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem('blockmind_preferences', JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const toggleToken = (symbol: string) => {
    setPrefs(prev => ({
      ...prev,
      preferredTokens: prev.preferredTokens.includes(symbol)
        ? prev.preferredTokens.filter(t => t !== symbol)
        : [...prev.preferredTokens, symbol],
    }));
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
          <SeoHead title="Preferences" description="Customize your Blockmind experience — slippage, chains, notifications, and more." path="/preferences" />

          <div className="portfolio-header">
            <div className="portfolio-header-left">
              <span className="portfolio-tag">SETTINGS</span>
              <h1 className="portfolio-title">Preferences</h1>
            </div>
            <div className="portfolio-header-actions">
              <button className="portfolio-btn-primary" onClick={save}>
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Default Chain */}
          <div className="pref-section">
            <h2 className="portfolio-section-title">Default Network</h2>
            <div className="pref-grid">
              {CHAINS.map(chain => (
                <button
                  key={chain.id}
                  className={`pref-card ${prefs.defaultChain === chain.id ? 'pref-card-active' : ''}`}
                  onClick={() => update('defaultChain', chain.id)}
                >
                  <span className="pref-card-title">{chain.name}</span>
                  <span className="pref-card-desc">Native: {chain.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trading */}
          <div className="pref-section">
            <h2 className="portfolio-section-title">Trading Defaults</h2>
            <div className="pref-row">
              <div className="pref-field">
                <label className="form-label">Default Slippage</label>
                <div className="pref-slippage">
                  {[0.1, 0.3, 0.5, 1.0].map(s => (
                    <button
                      key={s}
                      className={`swap-slippage-btn ${prefs.defaultSlippage === s ? 'active' : ''}`}
                      onClick={() => update('defaultSlippage', s)}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="pref-field">
                <label className="form-label">Gas Preference</label>
                <div className="pref-slippage">
                  {(['slow', 'standard', 'fast'] as const).map(g => (
                    <button
                      key={g}
                      className={`swap-slippage-btn ${prefs.gasPreference === g ? 'active' : ''}`}
                      onClick={() => update('gasPreference', g)}
                    >
                      {g === 'slow' ? '🐢' : g === 'standard' ? '⚡' : '🚀'} {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferred Tokens */}
          <div className="pref-section">
            <h2 className="portfolio-section-title">Watchlist Tokens</h2>
            <p className="pref-desc">Select tokens to display in your portfolio and swap panels.</p>
            <div className="pref-tokens">
              {AVAILABLE_TOKENS.map(symbol => (
                <button
                  key={symbol}
                  className={`pref-token-btn ${prefs.preferredTokens.includes(symbol) ? 'active' : ''}`}
                  onClick={() => toggleToken(symbol)}
                >
                  {prefs.preferredTokens.includes(symbol) ? '✓' : '+'} {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications & Refresh */}
          <div className="pref-section">
            <h2 className="portfolio-section-title">Notifications & Data</h2>
            <div className="pref-toggles">
              <label className="pref-toggle">
                <span>Transaction Notifications</span>
                <input
                  type="checkbox"
                  checked={prefs.notificationsEnabled}
                  onChange={(e) => update('notificationsEnabled', e.target.checked)}
                />
                <span className="pref-toggle-slider" />
              </label>
              <label className="pref-toggle">
                <span>Auto-Refresh Portfolio</span>
                <input
                  type="checkbox"
                  checked={prefs.autoRefresh}
                  onChange={(e) => update('autoRefresh', e.target.checked)}
                />
                <span className="pref-toggle-slider" />
              </label>
              {prefs.autoRefresh && (
                <div className="pref-field" style={{ marginTop: 12 }}>
                  <label className="form-label">Refresh Interval (seconds)</label>
                  <select
                    className="form-select"
                    value={prefs.refreshInterval}
                    onChange={(e) => update('refreshInterval', Number(e.target.value))}
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Theme */}
          <div className="pref-section">
            <h2 className="portfolio-section-title">Appearance</h2>
            <div className="pref-slippage">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  className={`swap-slippage-btn ${prefs.theme === t ? 'active' : ''}`}
                  onClick={() => { update('theme', t); document.documentElement.setAttribute('data-theme', t); }}
                >
                  {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '💻'} {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
