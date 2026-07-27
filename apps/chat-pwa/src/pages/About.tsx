import { useNavigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="corp-page">
      <SeoHead title="About" description="Blockmind Labs — Building the intelligence layer for Web3 from Addis Ababa, Ethiopia." path="/about" />
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
            <a onClick={() => navigate('/about')} className="corp-nav-link active">About</a>
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
          <span className="corp-hero-tag">ABOUT</span>
          <h1 className="corp-hero-title">
            Building the intelligence layer<br />for the decentralized future.
          </h1>
          <p className="corp-hero-desc">
            BlockMind Labs creates AI-native infrastructure that enables humans and
            applications to interact with blockchain networks using natural language.
            No complex wallets. No manual gas calculations. Just intent — verified
            and executed.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <span className="corp-section-tag">THE PROBLEM</span>
          <div className="corp-split">
            <div className="corp-split-left">
              <h2 className="corp-section-title">
                Blockchain was designed for everyone,<br />but built for experts.
              </h2>
            </div>
            <div className="corp-split-right">
              <p className="corp-text">
                Wallet pop-ups, seed phrases, gas fees, chain switching, and opaque
                network complexity create friction that causes the vast majority of
                mainstream users to abandon their first transaction before it ever
                reaches the chain.
              </p>
              <p className="corp-text">
                Despite billions in infrastructure investment, interacting with
                decentralized systems still requires technical knowledge that most
                people simply don't have — and shouldn't need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Opportunity → Solution → Future */}
      <section className="corp-section corp-section-alt">
        <div className="corp-section-inner">
          <div className="corp-trio">
            <div className="corp-trio-item">
              <span className="corp-trio-number">01</span>
              <h3>The Opportunity</h3>
              <p>
                Large Language Models and autonomous agents have reached a maturity
                where they can safely reason about deterministic systems. The
                technology to bridge human intent and machine execution now exists.
              </p>
            </div>
            <div className="corp-trio-item">
              <span className="corp-trio-number">02</span>
              <h3>The Solution</h3>
              <p>
                BlockMind removes complexity by embedding intelligent, non-custodial
                AI agents directly into the infrastructure layer — translating human
                intent into secure, simulated, and user-approved on-chain actions.
              </p>
            </div>
            <div className="corp-trio-item">
              <span className="corp-trio-number">03</span>
              <h3>The Future</h3>
              <p>
                A world where interacting with decentralized finance, governance,
                and digital ownership is as simple as sending a text message. Where
                AI handles the complexity, and users stay in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <div className="corp-mission-grid">
            <div className="corp-mission-card">
              <span className="corp-mission-label">Mission</span>
              <p className="corp-mission-text">
                To democratize access to decentralized technology through intelligent,
                secure, and non-custodial AI systems.
              </p>
            </div>
            <div className="corp-mission-card">
              <span className="corp-mission-label">Vision</span>
              <p className="corp-mission-text">
                A world where interacting with blockchain is as intuitive and
                frictionless as having a conversation.
              </p>
            </div>
            <div className="corp-mission-card">
              <span className="corp-mission-label">Purpose</span>
              <p className="corp-mission-text">
                To bridge the gap between human intent and machine execution,
                making Web3 truly accessible to the next billion users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="corp-section corp-section-alt">
        <div className="corp-section-inner">
          <span className="corp-section-tag">PRINCIPLES</span>
          <h2 className="corp-section-title">What we believe</h2>
          <div className="corp-values-grid">
            <div className="corp-value-card">
              <span className="corp-value-icon">🛡️</span>
              <h3 className="corp-value-title">Security First</h3>
              <p className="corp-value-desc">
                Non-custodial architecture. Users always control their assets.
                Every action is sandboxed, simulated, and requires explicit approval.
              </p>
            </div>
            <div className="corp-value-card">
              <span className="corp-value-icon">🤖</span>
              <h3 className="corp-value-title">Agent-Native</h3>
              <p className="corp-value-desc">
                AI agents are not a feature layer — they are fundamental, first-class
                infrastructure citizens designed into the core architecture.
              </p>
            </div>
            <div className="corp-value-card">
              <span className="corp-value-icon">🌍</span>
              <h3 className="corp-value-title">Open Ecosystem</h3>
              <p className="corp-value-desc">
                Built in deep partnership with GIWA, but designed with modular
                abstractions to work across Ethereum, Base, and all EVM chains.
              </p>
            </div>
            <div className="corp-value-card">
              <span className="corp-value-icon">💻</span>
              <h3 className="corp-value-title">Developer First</h3>
              <p className="corp-value-desc">
                We build for builders. Open APIs, comprehensive SDKs, and
                transparent documentation. No black boxes.
              </p>
            </div>
            <div className="corp-value-card">
              <span className="corp-value-icon">⚡</span>
              <h3 className="corp-value-title">Performance at Scale</h3>
              <p className="corp-value-desc">
                Sub-500ms intent parsing and real-time execution, optimized for
                modern application demands and high-frequency workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <span className="corp-section-tag">LEADERSHIP</span>
          <div className="corp-founder">
            <div className="corp-founder-header">
              <div className="corp-founder-avatar">HSF</div>
              <div>
                <h2 className="corp-founder-name">Habte Selassie Fitsum</h2>
                <p className="corp-founder-role">Founder & Lead Engineer</p>
              </div>
            </div>
            <p className="corp-founder-bio">
              Building AI-native Web3 infrastructure from Addis Ababa, Ethiopia.
              Full-stack engineer with a track record of shipping production-grade
              decentralized applications. Passionate about collapsing the complexity
              of Web3 through elegant, AI-driven abstractions.
            </p>
            <p className="corp-founder-bio">
              Built multiple Web3 projects from whiteboard concept to mainnet
              deployment. Focused on the intersection of Artificial Intelligence,
              Blockchain Infrastructure, Developer Tools, and Autonomous Agents.
            </p>
            <div className="corp-founder-focus">
              <span className="corp-focus-tag">Artificial Intelligence</span>
              <span className="corp-focus-tag">Blockchain Infrastructure</span>
              <span className="corp-focus-tag">Developer Tools</span>
              <span className="corp-focus-tag">Autonomous Agents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="corp-section corp-section-dark">
        <div className="corp-section-inner">
          <div className="corp-stats-grid">
            <div className="corp-stat">
              <span className="corp-stat-value">{'<'}500ms</span>
              <span className="corp-stat-label">Intent Parsing</span>
            </div>
            <div className="corp-stat">
              <span className="corp-stat-value">99.98%</span>
              <span className="corp-stat-label">API Uptime</span>
            </div>
            <div className="corp-stat">
              <span className="corp-stat-value">7</span>
              <span className="corp-stat-label">Core Services</span>
            </div>
            <div className="corp-stat">
              <span className="corp-stat-value">100%</span>
              <span className="corp-stat-label">Non-Custodial</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="corp-section corp-section-cta">
        <div className="corp-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="corp-section-title">Ready to build?</h2>
          <p className="corp-text" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            Start building AI-native Web3 applications with our SDK and documentation.
          </p>
          <div className="corp-cta-group">
            <a onClick={() => navigate('/docs')} className="corp-btn-primary">Read the Docs →</a>
            <a onClick={() => navigate('/contact')} className="corp-btn-secondary">Contact Us</a>
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
