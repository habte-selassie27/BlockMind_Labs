import { useCallback, useEffect, useState } from 'react';
import { checksumAddress } from '../lib/address';
import { buildWatchLink, addToWatchlist, removeFromWatchlist, updateWatchEntry, getWatchEntry, WatchEntry } from '../lib/watchlist';
import { getChainById, getExplorerAddressUrl, getExplorerTxUrl, SUPPORTED_CHAINS } from '../lib/chains';
import {
  ActivityTx,
  BalancePoint,
  NativeBalanceRow,
  NftItem,
  RiskInfo,
  TokenRow,
  fetchActivity,
  fetchBalanceSeries,
  fetchNativeBalances,
  fetchNfts,
  fetchRisk,
  fetchTokenRows,
  formatAmount,
  formatTimeAgo,
  formatUsd,
  seriesFromActivity,
  sparklinePath,
} from '../lib/viewonly';
import Identicon from './Identicon';
import CopyButton from './CopyButton';
import QRCode from './QRCode';
import AddressField from './AddressField';

export interface ViewOnlyPanelProps {
  open: boolean;
  onClose: () => void;
  address: string | null;
  isViewOnly: boolean;
  chainId: number;
  watchlist: WatchEntry[];
  recents: string[];
  onWatchlistChange: () => void;
  onSwitchAddress: (address: string) => void;
  onExplainTx: (hash: string) => void;
  onOpenConnect: () => void;
}

type Tab = 'tokens' | 'nfts' | 'activity';

const RISK_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  LOW: { color: '#6BCB77', bg: 'rgba(107,203,119,0.10)', border: 'rgba(107,203,119,0.30)' },
  MEDIUM: { color: '#E8C07D', bg: 'rgba(232,192,125,0.10)', border: 'rgba(232,192,125,0.30)' },
  HIGH: { color: '#E57373', bg: 'rgba(229,115,115,0.10)', border: 'rgba(229,115,115,0.32)' },
  UNKNOWN: { color: '#A8A29E', bg: 'rgba(255,255,255,0.05)', border: 'var(--chat-border)' },
};

export default function ViewOnlyPanel({
  open,
  onClose,
  address,
  isViewOnly,
  chainId,
  watchlist,
  recents,
  onWatchlistChange,
  onSwitchAddress,
  onExplainTx,
  onOpenConnect,
}: ViewOnlyPanelProps) {
  const [activeChain, setActiveChain] = useState(chainId || 91342);
  const [tab, setTab] = useState<Tab>('tokens');
  const [chainBalances, setChainBalances] = useState<NativeBalanceRow[]>([]);
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [totalUsd, setTotalUsd] = useState(0);
  const [nfts, setNfts] = useState<NftItem[] | null>(null);
  const [activity, setActivity] = useState<ActivityTx[] | null>(null);
  const [risk, setRisk] = useState<RiskInfo | null>(null);
  const [series, setSeries] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [watchInput, setWatchInput] = useState('');
  const [watchResolved, setWatchResolved] = useState<{ address: string | null; error: string | null }>({ address: null, error: null });

  const chain = getChainById(activeChain);
  const activeEntry = address ? getWatchEntry(address) : undefined;
  const alertsOn = !!activeEntry?.alerts;

  const loadNfts = useCallback(async () => {
    if (!address) return;
    setNfts([]);
    const items = await fetchNfts(address, activeChain);
    setNfts(items);
  }, [address, activeChain]);

  const loadOverview = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const [balances, tokens, txs, riskInfo, balanceSeries] = await Promise.all([
      fetchNativeBalances(address),
      fetchTokenRows(address, activeChain),
      fetchActivity(address, activeChain),
      fetchRisk(address, activeChain),
      fetchBalanceSeries(address, activeChain),
    ]);
    setChainBalances(balances);
    setTokenRows(tokens.rows);
    setTotalUsd(tokens.totalUsd);
    setActivity(txs);
    setRisk(riskInfo);
    setSeries(balanceSeries);
    setLoading(false);
  }, [address, activeChain]);

  useEffect(() => {
    if (open && address) {
      void loadOverview();
      if (tab === 'nfts') void loadNfts();
      else setNfts(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address, activeChain]);

  useEffect(() => {
    if (open && tab === 'nfts' && nfts === null && address) void loadNfts();
  }, [open, tab, nfts, address, loadNfts]);

  if (!open) return null;

  const riskStyle = RISK_STYLES[risk?.risk || 'UNKNOWN'] || RISK_STYLES.UNKNOWN;
  const sparkValues = series.length >= 2 ? series.map((p) => p.balance) : seriesFromActivity(activity || []);
  const watchLink = address ? buildWatchLink(address) : '';

  const toggleAlerts = async () => {
    if (!address) return;
    if (!alertsOn) {
      if ('Notification' in window && Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch {}
      }
      if (!getWatchEntry(address)) addToWatchlist({ address, alerts: true });
      else updateWatchEntry(address, { alerts: true });
      const entry = getWatchEntry(address);
      if (entry && !entry.lastSeenTx && activity?.length) {
        updateWatchEntry(address, { lastSeenTx: activity[0].hash });
      }
    } else {
      updateWatchEntry(address, { alerts: false });
    }
    onWatchlistChange();
  };

  const addWatch = () => {
    if (!watchResolved.address) return;
    addToWatchlist({ address: watchResolved.address });
    setWatchInput('');
    setWatchResolved({ address: null, error: null });
    onWatchlistChange();
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 11px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 9999,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--chat-border)',
    color: 'var(--chat-text-secondary)',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Watch dashboard">
      <div
        className="modal-content vo-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="vo-header">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
            {address && <Identicon address={address} size={46} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--chat-text-primary)' }}>
                  {isViewOnly ? 'Watched address' : 'Your wallet'}
                </span>
                {isViewOnly && <span className="badge badge-warning">👁 WATCH · VIEW-ONLY</span>}
              </div>
              {address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12.5,
                      color: 'var(--chat-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={checksumAddress(address)}
                  >
                    {checksumAddress(address)}
                  </span>
                  <CopyButton value={checksumAddress(address)} />
                </div>
              )}
              {activeEntry?.ens && (
                <div style={{ fontSize: 12, color: 'var(--chat-brand)', marginTop: 3 }}>
                  {activeEntry.ens} ✓
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                <span
                  className="vo-risk-badge"
                  style={{ color: riskStyle.color, background: riskStyle.bg, borderColor: riskStyle.border }}
                  title={risk?.summary || 'Scam Shield check'}
                >
                  🛡 Scam Shield: {risk ? risk.risk : '…'}
                </span>
                {risk?.isContract && (
                  <span className="vo-risk-badge" style={{ color: '#7EB8E8', background: 'rgba(126,184,232,0.10)', borderColor: 'rgba(126,184,232,0.30)' }}>
                    {risk.isVerified ? 'Verified contract' : 'Unverified contract'}
                  </span>
                )}
                {risk?.summary && (
                  <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', alignSelf: 'center' }}>{risk.summary}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn btn-primary btn-sm" onClick={onOpenConnect} title={isViewOnly ? 'Connect a wallet to enable signing' : 'Wallet connected'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
              {isViewOnly ? 'Connect wallet' : 'Signing enabled'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Action row ─────────────────────────────────────── */}
        <div className="vo-actions">
          <button style={{ ...btnStyle, ...(showQr ? { borderColor: 'rgba(217,122,92,0.4)', color: 'var(--chat-brand)' } : {}) }} onClick={() => setShowQr(!showQr)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3z" /></svg>
            {showQr ? 'Hide QR' : 'Share QR'}
          </button>
          <CopyButton value={watchLink} label="Copy watch link" />
          <button
            style={{
              ...btnStyle,
              ...(alertsOn ? { borderColor: 'rgba(217,122,92,0.4)', color: 'var(--chat-brand)', background: 'var(--chat-brand-soft)' } : {}),
            }}
            onClick={toggleAlerts}
            title="Notify me when this address receives funds"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7-6 11-6 11S6 15 6 8z" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {alertsOn ? 'Alerts on' : 'Alert me'}
          </button>
          {address && (
            <a
              className="vo-btn"
              style={{ ...btnStyle, textDecoration: 'none' }}
              href={getExplorerAddressUrl(activeChain, address)}
              target="_blank"
              rel="noreferrer"
            >
              Explorer ↗
            </a>
          )}
        </div>

        {showQr && address && (
          <div className="vo-qr-row">
            <QRCode value={watchLink} size={148} dark />
            <div style={{ fontSize: 12, color: 'var(--chat-text-tertiary)', lineHeight: 1.6, maxWidth: 320 }}>
              <div style={{ color: 'var(--chat-text-primary)', fontWeight: 600, marginBottom: 2 }}>Read-only watch link</div>
              Anyone with this link can view balances and activity — never signing access.
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginTop: 6, wordBreak: 'break-all', color: 'var(--chat-text-faint)' }}>
                {watchLink}
              </div>
            </div>
          </div>
        )}

        {/* ── Multi-chain toggle ─────────────────────────────── */}
        <div className="vo-chains" role="tablist" aria-label="Chain balances">
          {chainBalances.length === 0 && loading && SUPPORTED_CHAINS.map((c) => (
            <div key={c.id} className="skeleton" style={{ width: 118, height: 52, borderRadius: 12 }} />
          ))}
          {chainBalances.map((row) => {
            const selected = row.chainId === activeChain;
            return (
              <button
                key={row.chainId}
                role="tab"
                aria-selected={selected}
                className={`vo-chain ${selected ? 'active' : ''}`}
                onClick={() => setActiveChain(row.chainId)}
                title={`${row.name} — ${formatAmount(row.balance)} ${row.symbol}`}
              >
                <span className="vo-chain-top">
                  <span style={{ width: 7, height: 7, borderRadius: 9999, background: row.color, boxShadow: `0 0 6px ${row.color}66` }} />
                  <span>{row.name}</span>
                </span>
                <span className="vo-chain-amount">
                  {row.ok ? `${formatAmount(row.balance)} ${row.symbol}` : 'unavailable'}
                </span>
                <span className="vo-chain-usd">{row.ok ? formatUsd(row.usd) : '—'}</span>
              </button>
            );
          })}
        </div>

        {/* ── Sparkline ──────────────────────────────────────── */}
        <div className="vo-spark">
          <div>
            <div className="vo-section-label">Portfolio value</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--chat-text-primary)', marginTop: 2 }}>
              {formatUsd(tab === 'tokens' ? totalUsd : chainBalances.find((c) => c.chainId === activeChain)?.usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', marginTop: 2 }}>
              {series.length >= 2 ? `Balance · last ${series.length} sample blocks` : activity?.length ? 'Value moved, recent activity' : 'Sampling balance history…'}
            </div>
          </div>
          <svg viewBox="0 0 260 56" preserveAspectRatio="none" style={{ width: '100%', maxWidth: 300, height: 56 }} aria-hidden>
            <defs>
              <linearGradient id="vo-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(217,122,92,0.35)" />
                <stop offset="100%" stopColor="rgba(217,122,92,0)" />
              </linearGradient>
            </defs>
            {sparkValues.length > 1 && (
              <>
                <path d={`${sparklinePath(sparkValues, 260, 56)} L 257 53 L 3 53 Z`} fill="url(#vo-spark-fill)" />
                <path d={sparklinePath(sparkValues, 260, 56)} fill="none" stroke="var(--chat-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="vo-tabs" role="tablist">
          {(['tokens', 'nfts', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`vo-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'tokens' ? 'Tokens' : t === 'nfts' ? 'NFTs' : `Activity${activity ? ` (${activity.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="vo-tab-body">
          {tab === 'tokens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading && tokenRows.length === 0 && [0, 1].map((i) => (
                <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
              ))}
              {tokenRows.map((row) => (
                <div key={row.address + row.symbol} className="vo-row">
                  <div className="vo-token-icon" style={{ background: `${row.color}22`, borderColor: `${row.color}55`, color: row.color }}>
                    {row.symbol.slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--chat-text-primary)' }}>{row.symbol}</span>
                      {row.native && <span className="vo-mini-badge">NATIVE</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--chat-text-tertiary)' }}>{row.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--chat-text-primary)' }}>
                      {formatAmount(row.balance)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatUsd(row.usd)}
                    </div>
                  </div>
                </div>
              ))}
              {tokenRows.length > 0 && (
                <div className="vo-row" style={{ background: 'rgba(217,122,92,0.06)', borderColor: 'rgba(217,122,92,0.18)' }}>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--chat-text-secondary)' }}>Total</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--chat-brand)' }}>
                    {formatUsd(totalUsd)}
                  </div>
                </div>
              )}
              {!loading && tokenRows.length === 0 && (
                <div className="vo-empty">No balances found for this chain.</div>
              )}
            </div>
          )}

          {tab === 'nfts' && (
            <div>
              {nfts === null ? (
                <div className="skeleton" style={{ height: 84, borderRadius: 12 }} />
              ) : nfts.length === 0 ? (
                <div className="vo-empty">
                  No NFTs detected on {chain?.name || 'this chain'} in the last 5,000 blocks.
                  <div style={{ fontSize: 11, color: 'var(--chat-text-faint)', marginTop: 4 }}>
                    Discovery scans ERC-721 transfer logs — older holdings may not appear.
                  </div>
                </div>
              ) : (
                <div className="vo-nft-grid">
                  {nfts.map((nft) => (
                    <div key={nft.contract} className="vo-nft" title={nft.contract}>
                      <div className="vo-nft-art">{(nft.name || 'NFT').slice(0, 2).toUpperCase()}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--chat-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nft.name || 'Unnamed collection'}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--chat-text-tertiary)' }}>
                        {nft.balance} · {nft.contract.slice(0, 6)}…{nft.contract.slice(-4)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity === null ? (
                [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 12 }} />)
              ) : activity.length === 0 ? (
                <div className="vo-empty">No recent transactions on {chain?.name || 'this chain'}.</div>
              ) : (
                activity.map((tx) => (
                  <div key={tx.hash} className="vo-row" style={{ alignItems: 'center' }}>
                    <div
                      className="vo-dir"
                      style={{
                        color: tx.direction === 'in' ? 'var(--chat-success)' : 'var(--chat-text-tertiary)',
                        background: tx.direction === 'in' ? 'rgba(107,203,119,0.10)' : 'rgba(255,255,255,0.05)',
                      }}
                      title={tx.direction === 'in' ? 'Incoming' : 'Outgoing'}
                    >
                      {tx.direction === 'in' ? '↓' : '↑'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--chat-text-primary)' }}>
                          {tx.direction === 'in' ? 'Received' : tx.direction === 'self' ? 'Self transfer' : 'Sent'}
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--chat-text-secondary)' }}>
                          {formatAmount(Number(tx.valueWei) / 1e18)} {chain?.nativeCurrency.symbol}
                        </span>
                        {tx.status !== 'ok' && <span className="badge badge-error" style={{ fontSize: 10 }}>failed</span>}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--chat-text-tertiary)', marginTop: 2 }}>
                        {tx.hash.slice(0, 12)}…{tx.hash.slice(-6)} · {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="vo-btn"
                        onClick={() => onExplainTx(tx.hash)}
                        title="Explain this transaction in chat"
                      >
                        Explain
                      </button>
                      <a
                        className="vo-btn"
                        href={getExplorerTxUrl(activeChain, tx.hash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Watchlist ──────────────────────────────────────── */}
        <div className="vo-watchlist">
          <div className="vo-section-label">
            Watchlist
            <span style={{ marginLeft: 6, color: 'var(--chat-text-faint)' }}>{watchlist.length}/20</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {watchlist.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--chat-text-tertiary)', padding: '4px 2px' }}>
                No saved addresses yet — add one below to switch between watched wallets.
              </div>
            )}
            {watchlist.map((entry) => {
              const isActive = !!address && entry.address.toLowerCase() === address.toLowerCase();
              return (
                <div
                  key={entry.address}
                  className={`vo-watch-row ${isActive ? 'active' : ''}`}
                  onClick={() => onSwitchAddress(entry.address)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSwitchAddress(entry.address)}
                >
                  <Identicon address={entry.address} size={26} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--chat-text-primary)' }}>
                      {entry.address.slice(0, 8)}…{entry.address.slice(-6)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>
                      {entry.ens || entry.label || 'watched'}
                      {entry.alerts && ' · 🔔 alerts'}
                    </div>
                  </div>
                  {isActive && <span className="badge badge-success" style={{ fontSize: 10 }}>active</span>}
                  <button
                    className="vo-remove"
                    title="Remove from watchlist"
                    aria-label={`Remove ${entry.address}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(entry.address);
                      onWatchlistChange();
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10 }}>
            <AddressField
              value={watchInput}
              onChange={(v) => { setWatchInput(v); setWatchResolved({ address: null, error: null }); }}
              onResolved={(r) => setWatchResolved({ address: r.address, error: r.error })}
              recents={recents}
              onPick={(addr) => setWatchInput(addr)}
            />
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={!watchResolved.address}
              onClick={addWatch}
            >
              + Add to watchlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.1 (read-only), §12.4 (Scam Shield shown before interaction)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
