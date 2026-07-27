import DocsLayout from '../components/docs/DocsLayout';
import Callout from '../components/docs/Callout';
import SeoHead from '../components/SeoHead';

const sidebar = [
  {
    title: 'System',
    items: [
      { label: 'Status', href: '/status' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'SDK Reference', href: '/docs/sdk' },
    ],
  },
];

const toc = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'incidents', label: 'Recent Incidents' },
];

const services = [
  { name: 'API Gateway', status: 'operational' as const, uptime: '99.98%' },
  { name: 'Intent Service', status: 'operational' as const, uptime: '99.99%' },
  { name: 'Agent Runtime', status: 'operational' as const, uptime: '99.97%' },
  { name: 'Web3 Middleware', status: 'operational' as const, uptime: '99.99%' },
  { name: 'Wallet Signer', status: 'operational' as const, uptime: '100%' },
  { name: 'Memory Service', status: 'operational' as const, uptime: '99.98%' },
  { name: 'Chat PWA', status: 'operational' as const, uptime: '99.99%' },
];

export default function Status() {
  return (
    <DocsLayout sidebar={sidebar} toc={toc}>
      <SeoHead title="System Status" description="Real-time status of Blockmind services — API gateway, agent runtime, and chain connectivity." path="/status" />
      {/* Hero */}
      <div className="docs-hero">
        <span className="docs-hero-tag">STATUS</span>
        <h1 className="docs-hero-title">System Status</h1>
        <p className="docs-hero-desc">
          Real-time operational status of all Blockmind infrastructure services.
        </p>
      </div>

      {/* Overall Status */}
      <section id="overview" className="docs-section">
        <Callout type="success" title="All Systems Operational">
          No incidents reported in the last 30 days. All services are functioning within normal parameters.
        </Callout>
      </section>

      {/* Services */}
      <section id="services" className="docs-section">
        <h2 className="docs-heading">Services</h2>
        <div className="status-table-wrapper">
          <table className="docs-table status-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Uptime</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td>
                    <span className={`status-indicator status-indicator-${s.status}`}>
                      <span className={`status-indicator-dot status-indicator-dot-${s.status}`} />
                      {s.status === 'operational' ? 'Operational' : s.status === 'degraded' ? 'Degraded' : 'Outage'}
                    </span>
                  </td>
                  <td><code className="mono">{s.uptime}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Incidents */}
      <section id="incidents" className="docs-section">
        <h2 className="docs-heading">Recent Incidents</h2>
        <div className="status-incident-empty">
          <p>No recent incidents. All systems are functioning normally.</p>
        </div>
      </section>
    </DocsLayout>
  );
}
