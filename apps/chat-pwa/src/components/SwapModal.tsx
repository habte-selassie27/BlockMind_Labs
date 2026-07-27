import { useState, useEffect, useCallback } from 'react';
import { GIWA_TOKENS } from '../lib/giwa-rpc';
import { getSwapQuote, type SwapQuote } from '../lib/swap-service';
import { getFallbackPrice } from '../lib/price-feeds';
import { formatUsd } from '../lib/giwa-rpc';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  walletAddress: string;
}

export default function SwapModal({ open, onClose, onSubmit, walletAddress }: Props) {
  const [fromToken, setFromToken] = useState('GIWA');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || fromToken === toToken) {
      setQuote(null);
      return;
    }

    setLoadingQuote(true);
    setQuoteError('');

    try {
      const q = await getSwapQuote({
        tokenInSymbol: fromToken,
        tokenOutSymbol: toToken,
        amountIn: amount,
        slippage,
        userAddress: walletAddress,
      });
      setQuote(q);
    } catch (err: any) {
      setQuoteError(err.message || 'Could not get quote');
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [fromToken, toToken, amount, slippage, walletAddress]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!quote) return;
    const msg = `swap ${amount} ${fromToken} to ${toToken} (slippage ${slippage}%)`;
    onSubmit(msg);
    setAmount('');
    setQuote(null);
    onClose();
  };

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  };

  const fromPrice = getFallbackPrice(fromToken);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Swap Tokens</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="form-label">From Wallet</label>
          <div className="form-address">{walletAddress}</div>

          <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>From Token</label>
          <select
            className="form-select"
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value)}
          >
            {GIWA_TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-2) 0' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSwapTokens}
              style={{ fontSize: '18px', padding: '4px 12px' }}
            >
              ⇅
            </button>
          </div>

          <label className="form-label">To Token</label>
          <select
            className="form-select"
            value={toToken}
            onChange={(e) => setToToken(e.target.value)}
          >
            {GIWA_TOKENS.filter(t => t.symbol !== fromToken).map((t) => (
              <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
            ))}
          </select>

          <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>Amount</label>
          <input
            className="form-input"
            type="number"
            step="any"
            min="0"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amount && (
            <span className="form-hint">≈ {formatUsd(parseFloat(amount) * fromPrice)}</span>
          )}

          {/* Slippage Setting */}
          <div className="swap-slippage">
            <label className="form-label">Slippage Tolerance</label>
            <div className="swap-slippage-options">
              {[0.1, 0.5, 1.0].map(s => (
                <button
                  key={s}
                  className={`swap-slippage-btn ${slippage === s ? 'active' : ''}`}
                  onClick={() => setSlippage(s)}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Quote Display */}
          {loadingQuote && (
            <div className="swap-quote-loading">
              <span className="portfolio-spinner" />
              Fetching quote...
            </div>
          )}

          {quoteError && (
            <div className="form-error">{quoteError}</div>
          )}

          {quote && !loadingQuote && (
            <div className="swap-quote-card">
              <div className="swap-quote-row">
                <span className="swap-quote-label">You Receive</span>
                <span className="swap-quote-value">{quote.amountOut} {quote.tokenOut.symbol}</span>
              </div>
              <div className="swap-quote-row">
                <span className="swap-quote-label">Min Received</span>
                <span className="swap-quote-value">{quote.amountOutMin} {quote.tokenOut.symbol}</span>
              </div>
              <div className="swap-quote-row">
                <span className="swap-quote-label">Price Impact</span>
                <span className={`swap-quote-value ${quote.priceImpact > 1 ? 'negative' : ''}`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="swap-quote-row">
                <span className="swap-quote-label">Route</span>
                <span className="swap-quote-value">{quote.route.join(' → ')}</span>
              </div>
              <div className="swap-quote-row">
                <span className="swap-quote-label">Est. Gas</span>
                <span className="swap-quote-value">{quote.gasEstimate}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!quote || loadingQuote}
          >
            {loadingQuote ? 'Loading...' : 'Swap →'}
          </button>
        </div>
      </div>
    </div>
  );
}
