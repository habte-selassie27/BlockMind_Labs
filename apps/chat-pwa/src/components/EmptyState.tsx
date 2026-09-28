interface Props {
  walletConnected: boolean;
  onConnect: () => void;
  onPrompt: (text: string) => void;
}

const prompts = [
  { icon: 'balance', label: 'Resolve UP ID', prompt: 'Resolve alice.up', desc: 'GIWA identity → address' },
  { icon: 'swap', label: 'Bridge 0.1 ETH to GIWA', prompt: 'Bridge 0.1 ETH from Sepolia to GIWA', desc: '~2.3 min via OP Stack' },
  { icon: 'transfer', label: 'GIWA Network Pulse', prompt: 'How is GIWA doing right now?', desc: 'Blocks, gas, AA wallets' },
  { icon: 'analyze', label: 'Discover DeFi on GIWA', prompt: 'Find me a verified DeFi app on GIWA where I can stake', desc: 'Verified contracts only' },
  { icon: 'analyze', label: 'Explain a contract', prompt: 'Explain address 0x1111111111111111111111111111111111111111', desc: 'Blockscout + Scam Shield' },
  { icon: 'transfer', label: 'Batch DeFi Prep', prompt: 'Prepare my GIWA wallet for DeFi: approve 100 USDC, deposit and stake', desc: 'One confirmation' },
];

function PromptIcon({ name }: { name: string }) {
  const p = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'balance': return <svg {...p} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case 'swap': return <svg {...p} viewBox="0 0 24 24"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
    case 'transfer': return <svg {...p} viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
    case 'analyze': return <svg {...p} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
    default: return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
  }
}

export default function EmptyState({ walletConnected, onConnect, onPrompt }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center', padding: '12px 0' }}>
      {/* Hero */}
      <div className="welcome-card" style={{ maxWidth: '100%' }}>
        <div className="welcome-card-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--chat-brand)' }}>
            <path d="M12 8V4H8" />
            <rect x="4" y="8" width="16" height="12" rx="2" />
            <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
            <path d="M9 16c1.2 1 2.8 1 4 0" />
          </svg>
        </div>
        <h3>How can I help you today?</h3>
        <p>
          I’m Blockmind — your AI assistant for the GIWA chain. Check balances, send tokens, swap, analyze contracts — just ask in plain English.
        </p>
        {!walletConnected ? (
          <button className="btn btn-primary" onClick={onConnect} style={{ marginTop: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
            Connect Wallet to start
          </button>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--chat-success-bg)', border: '1px solid var(--chat-success-border)', borderRadius: 9999, fontSize: 12, color: 'var(--chat-success)', fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--chat-success)' }} />
            Wallet connected — try a prompt below
          </div>
        )}
      </div>

      {/* Prompt grid */}
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--chat-text-faint)', marginBottom: 10, paddingLeft: 2 }}>
          Try these
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {prompts.map((p) => (
            <button
              key={p.label}
              onClick={() => walletConnected ? onPrompt(p.prompt) : onConnect()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                padding: '14px 14px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid var(--chat-border)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 160ms var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(217,122,92,0.22)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.14)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--chat-border)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-brand)' }}>
                <PromptIcon name={p.icon} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--chat-text-primary)', lineHeight: 1.2 }}>{p.label}</span>
                <span style={{ fontSize: 11, color: 'var(--chat-text-tertiary)', lineHeight: 1.4 }}>{p.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Assurance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--chat-border-soft)', marginTop: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Simulated first
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          Scam Shield
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--chat-text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          You confirm
        </span>
      </div>
    </div>
  );
}
