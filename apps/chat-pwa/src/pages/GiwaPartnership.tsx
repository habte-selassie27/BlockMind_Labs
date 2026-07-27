import { useNavigate } from 'react-router-dom';
import SeoBlockmind from '../components/SeoHead';

export default function GiwaPartnership() {
  const navigate = useNavigate();

  return (
    <div className="corp-page">
      <SeoBlockmind title="GIWA Partnership" description="Blockmind + GIWA: Powering AI-native blockchain infrastructure on Ethereum L2." path="/partnership/giwa" />
      {/* Nav */}
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
            <a onClick={() => navigate('/partnership/giwa')} className="corp-nav-link active">Partnership</a>
            <a onClick={() => navigate('/docs')} className="corp-nav-link">Docs</a>
          </div>
          <div className="corp-nav-right">
            <a onClick={() => navigate('/contact')} className="corp-nav-link">Contact</a>
            <a onClick={() => navigate('/chat')} className="corp-cta-btn">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <span className="corp-hero-tag">PARTNERSHIP</span>
          <h1 className="corp-hero-title">
            Building the AI intelligence layer<br />for GIWA.
          </h1>
          <p className="corp-hero-desc">
            Together, we are creating the foundational infrastructure for AI-powered
            blockchain applications — combining GIWA's high-performance L2 with
            BlockMind's autonomous agent technology.
          </p>
        </div>
      </section>

      {/* Why GIWA */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <span className="corp-section-tag">WHY GIWA</span>
          <div className="corp-split">
            <div className="corp-split-left">
              <h2 className="corp-section-title">
                The perfect foundation<br />for AI-powered Web3.
              </h2>
            </div>
            <div className="corp-split-right">
              <p className="corp-text">
                GIWA's Ethereum Layer 2 architecture provides the deterministic
                foundation that AI-powered infrastructure demands. With ~1-second
                block times, negligible transaction costs, and full EVM compatibility,
                GIWA enables real-time, high-frequency AI agent execution that would
                be economically and technically impossible on slower, congested chains.
              </p>
              <p className="corp-text">
                As a core ecosystem partner, BlockMind Labs is committed to building
                production-grade AI infrastructure that drives adoption across the
                entire GIWA developer and user ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="corp-section corp-section-alt">
        <div className="corp-section-inner">
          <span className="corp-section-tag">ARCHITECTURE</span>
          <h2 className="corp-section-title">Technical integration</h2>
          <div className="corp-arch">
            <div className="corp-arch-flow">
              <div className="corp-arch-node">
                <span className="corp-arch-icon">💬</span>
                <span className="corp-arch-label">User Input</span>
                <span className="corp-arch-sub">Natural Language</span>
              </div>
              <div className="corp-arch-arrow">→</div>
              <div className="corp-arch-node">
                <span className="corp-arch-icon">🧠</span>
                <span className="corp-arch-label">AI Agent</span>
                <span className="corp-arch-sub">Intent & Reasoning</span>
              </div>
              <div className="corp-arch-arrow">→</div>
              <div className="corp-arch-node">
                <span className="corp-arch-icon">🛡️</span>
                <span className="corp-arch-label">Security</span>
                <span className="corp-arch-sub">Simulate & Check</span>
              </div>
              <div className="corp-arch-arrow">→</div>
              <div className="corp-arch-node">
                <span className="corp-arch-icon">✍️</span>
                <span className="corp-arch-label">Wallet</span>
                <span className="corp-arch-sub">User Approval</span>
              </div>
              <div className="corp-arch-arrow">→</div>
              <div className="corp-arch-node corp-arch-node-accent">
                <span className="corp-arch-icon">⛓️</span>
                <span className="corp-arch-label">GIWA L2</span>
                <span className="corp-arch-sub">On-chain Execution</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <span className="corp-section-tag">BENEFITS</span>
          <h2 className="corp-section-title">Partnership advantages</h2>
          <div className="corp-benefits-grid">
            <div className="corp-benefit-card">
              <div className="corp-benefit-top">
                <span className="corp-benefit-icon">🔗</span>
                <span className="corp-benefit-category">Infrastructure</span>
              </div>
              <h3 className="corp-benefit-title">Native Integration</h3>
              <p className="corp-benefit-desc">
                Built specifically for GIWA L2 from day one. First-class support for
                GIWA RPC nodes, block explorers, and wallet APIs. No adapters or
                compatibility layers — direct, optimized integration.
              </p>
            </div>
            <div className="corp-benefit-card">
              <div className="corp-benefit-top">
                <span className="corp-benefit-icon">⚡</span>
                <span className="corp-benefit-category">Performance</span>
              </div>
              <h3 className="corp-benefit-title">Optimized for Speed</h3>
              <p className="corp-benefit-desc">
                Engineered to leverage GIWA's ~1-second finality. Real-time intent
                parsing, immediate simulation, and rapid transaction execution
                designed for modern application demands.
              </p>
            </div>
            <div className="corp-benefit-card">
              <div className="corp-benefit-top">
                <span className="corp-benefit-icon">🛡️</span>
                <span className="corp-benefit-category">Security</span>
              </div>
              <h3 className="corp-benefit-title">Aligned Standards</h3>
              <p className="corp-benefit-desc">
                Mandatory pre-execution simulation, Scam Shield risk analysis, and
                strict non-custodial architecture that matches GIWA's security
                requirements and ecosystem standards.
              </p>
            </div>
            <div className="corp-benefit-card">
              <div className="corp-benefit-top">
                <span className="corp-benefit-icon">🌐</span>
                <span className="corp-benefit-category">Ecosystem</span>
              </div>
              <h3 className="corp-benefit-title">Adoption Catalyst</h3>
              <p className="corp-benefit-desc">
                As a core infrastructure partner, BlockMind drives user adoption by
                lowering the barrier to entry for all GIWA dApps — making every
                application on the chain more accessible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="corp-section corp-section-alt">
        <div className="corp-section-inner">
          <span className="corp-section-tag">ROADMAP</span>
          <h2 className="corp-section-title">Strategic milestones</h2>
          <div className="corp-timeline">
            <div className="corp-timeline-item corp-timeline-done">
              <div className="corp-timeline-left">
                <div className="corp-timeline-dot" />
                <div className="corp-timeline-line" />
              </div>
              <div className="corp-timeline-content">
                <div className="corp-timeline-header">
                  <span className="corp-timeline-phase">Phase 1</span>
                  <span className="corp-timeline-badge corp-timeline-badge-done">Done</span>
                </div>
                <h3 className="corp-timeline-title">Foundation & Research</h3>
                <p className="corp-timeline-desc">
                  Deep-dive research into GIWA architecture, RPC endpoint optimization,
                  and prototype development. Established core partnership framework.
                </p>
                <span className="corp-timeline-date">2024–2025</span>
              </div>
            </div>
            <div className="corp-timeline-item corp-timeline-done">
              <div className="corp-timeline-left">
                <div className="corp-timeline-dot" />
                <div className="corp-timeline-line" />
              </div>
              <div className="corp-timeline-content">
                <div className="corp-timeline-header">
                  <span className="corp-timeline-phase">Phase 2</span>
                  <span className="corp-timeline-badge corp-timeline-badge-done">Done</span>
                </div>
                <h3 className="corp-timeline-title">Testnet Integration</h3>
                <p className="corp-timeline-desc">
                  Full AI agent deployment on GIWA Sepolia testnet with complete
                  functionality. Public Developer SDK v0.x release for early adopters.
                </p>
                <span className="corp-timeline-date">2025</span>
              </div>
            </div>
            <div className="corp-timeline-item corp-timeline-active">
              <div className="corp-timeline-left">
                <div className="corp-timeline-dot" />
                <div className="corp-timeline-line" />
              </div>
              <div className="corp-timeline-content">
                <div className="corp-timeline-header">
                  <span className="corp-timeline-phase">Phase 3</span>
                  <span className="corp-timeline-badge corp-timeline-badge-active">In Progress</span>
                </div>
                <h3 className="corp-timeline-title">Mainnet Infrastructure</h3>
                <p className="corp-timeline-desc">
                  Production deployment on GIWA mainnet with 99.9% uptime SLA.
                  Partner dApp integrations and enterprise SDK access.
                </p>
                <span className="corp-timeline-date">2025–2026</span>
              </div>
            </div>
            <div className="corp-timeline-item corp-timeline-upcoming">
              <div className="corp-timeline-left">
                <div className="corp-timeline-dot" />
              </div>
              <div className="corp-timeline-content">
                <div className="corp-timeline-header">
                  <span className="corp-timeline-phase">Phase 4</span>
                  <span className="corp-timeline-badge corp-timeline-badge-upcoming">Upcoming</span>
                </div>
                <h3 className="corp-timeline-title">Ecosystem Expansion</h3>
                <p className="corp-timeline-desc">
                  SDK v1.0, cross-chain expansion, advanced autonomous agent workflows,
                  and comprehensive developer ecosystem growth.
                </p>
                <span className="corp-timeline-date">2026+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="corp-section corp-section-cta">
        <div className="corp-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="corp-section-title">Interested in partnering?</h2>
          <p className="corp-text" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            We're always looking for ecosystem partners to build the future of
            AI-powered blockchain together.
          </p>
          <div className="corp-cta-group">
            <a onClick={() => navigate('/contact')} className="corp-btn-primary">Get in Touch →</a>
            <a onClick={() => navigate('/docs')} className="corp-btn-secondary">Read the Docs</a>
          </div>
        </div>
      </section>

      {/* Footer */}
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
