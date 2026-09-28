interface App {
  name: string;
  category: string;
  verified: boolean;
  tvl: string;
  desc: string;
  address: string;
  explorer: string;
}

interface Props {
  category: string;
  apps: App[];
  onSelect?: (app: App) => void;
}

export default function DiscoverCard({ category, apps, onSelect }: Props) {
  return (
    <div className="sim-card" style={{ borderLeft: '3px solid #D97A5C' }}>
      <div className="sim-header">
        <div className="sim-header-left">
          <div className="sim-header-icon" style={{ background: 'linear-gradient(135deg,#FAF9F5,#E5E3DC)', border: '1px solid #E5E3DC', color: '#141413' }}>🧭</div>
          <div>
            <div className="sim-header-title">GIWA Ecosystem Discovery</div>
            <div className="sim-header-subtitle">{apps.length} {category} {apps.length === 1 ? 'app' : 'apps'} · {apps.filter(a => a.verified).length} verified</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, margin: 'var(--space-3) 0' }}>
        {apps.map(app => (
          <div key={app.address} style={{
            border: '1px solid var(--color-border)', borderRadius: 12, padding: 12,
            background: app.verified ? '#fff' : '#FAF9F5',
            display: 'flex', justifyContent: 'space-between', gap: 12
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{app.name}</span>
                {app.verified ? (
                  <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontSize: 10, padding: '2px 6px', borderRadius: 9999 }}>✓ VERIFIED</span>
                ) : (
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, padding: '2px 6px', borderRadius: 9999 }}>UNVERIFIED</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{app.category}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{app.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{app.address.slice(0, 10)}… · TVL {app.tvl}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="sim-btn sim-btn-confirm" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => onSelect?.(app)}>Use →</button>
              <a href={app.explorer} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#D97A5C', textAlign: 'center' }}>Explorer</a>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: 12 }}>No apps found for “{category}”. Try defi, bridge, nft.</div>
        )}
      </div>

      <div className="sim-security">
        <span className="sim-security-icon">🔒</span>
        <span className="sim-security-text">Verified = source on sepolia-explorer.giwa.io · Scam Shield auto-checks before TX</span>
      </div>
    </div>
  );
}
// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: chat-pwa
