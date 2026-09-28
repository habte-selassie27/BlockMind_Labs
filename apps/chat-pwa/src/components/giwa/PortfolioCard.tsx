interface Token {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: string;
  valueUsd?: string;
}

interface Props {
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  tokens: Token[];
  totalValueUsd: string;
  insights: string[];
  onAction?: (prompt: string) => void;
}

export default function PortfolioCard({ address, nativeBalance: _nativeBalance, tokens, totalValueUsd, insights, onAction }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #D97A5C' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#D97A5C,#C15F3C)' }}>💼</div>
          <div>
            <div className="sim-header-title">GIWA Portfolio</div>
            <div className="sim-header-subtitle" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{address.slice(0, 6)}…{address.slice(-4)} · ${totalValueUsd}</div>
          </div>
        </div>
        <div className="sim-status sim-status-success"><span className="sim-status-dot" /> Live</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 'var(--space-3) 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, fontSize: 11, color: 'var(--chat-text-faint)', fontFamily: 'JetBrains Mono', padding: '0 2px' }}>
          <span>Asset</span><span>Balance · Value</span>
        </div>
        {tokens.map(t => (
          <div key={t.address} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="token-icon" style={{ width: 32, height: 32, fontSize: 11, background: t.symbol === 'GIWA' ? '#D97A5C' : '#627EEA', color: '#fff' }}>{t.symbol[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.symbol}</div>
                <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>{t.name}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{t.balance}</div>
              <div style={{ fontSize: 11, color: 'var(--chat-text-tertiary)' }}>{t.valueUsd ? `$${t.valueUsd}` : '—'}</div>
            </div>
          </div>
        ))}
        {tokens.length === 0 && <div style={{ fontSize: 12, color: 'var(--chat-text-tertiary)', textAlign: 'center', padding: 12 }}>No tokens — try bridging from Sepolia</div>}
      </div>

      {insights.length > 0 && (
        <div style={{ background: 'rgba(217,122,92,0.06)', border: '1px solid rgba(217,122,92,0.12)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C15F3C', marginBottom: 6 }}>AI Insight</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--chat-text-muted)', lineHeight: 1.5 }}>• {ins}</div>
          ))}
        </div>
      )}

      <div className="sim-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="sim-btn sim-btn-cancel" onClick={() => onAction?.(`Bridge 0.1 ETH from Sepolia to GIWA`)}>Bridge In →</button>
        <button className="sim-btn sim-btn-confirm" onClick={() => onAction?.(`What's my GIWA portfolio? explain options`)}>Explain Options →</button>
      </div>
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
