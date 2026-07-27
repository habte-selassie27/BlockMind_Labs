import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import SeoHead from '../components/SeoHead';

function NetworkGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const W = 500;
    const H = 400;
    canvas.width = W;
    canvas.height = H;

    const nodes = [
      { x: 250, y: 200, r: 18, color: '#F59E0B', label: 'Agent' },
      { x: 120, y: 100, r: 12, color: '#8B5CF6', label: 'Wallet' },
      { x: 380, y: 100, r: 12, color: '#8B5CF6', label: 'Contract' },
      { x: 100, y: 280, r: 10, color: '#60A5FA', label: 'RPC' },
      { x: 400, y: 280, r: 10, color: '#60A5FA', label: 'Indexer' },
      { x: 250, y: 350, r: 10, color: '#34D399', label: 'Chain' },
      { x: 170, y: 180, r: 8, color: '#A78BFA', label: '' },
      { x: 330, y: 180, r: 8, color: '#A78BFA', label: '' },
      { x: 180, y: 300, r: 8, color: '#60A5FA', label: '' },
      { x: 320, y: 300, r: 8, color: '#60A5FA', label: '' },
    ];

    const edges = [
      [0, 1], [0, 2], [0, 6], [0, 7],
      [1, 6], [2, 7], [6, 3], [7, 4],
      [3, 8], [4, 9], [8, 5], [9, 5],
      [0, 5],
    ];

    let frame = 0;
    let animId: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Draw edges
      edges.forEach(([a, b]) => {
        const na = nodes[a];
        const nb = nodes[b];
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Animated particle along edge
        const t = ((frame * 0.005 + a * 0.3) % 1);
        const px = na.x + (nb.x - na.x) * t;
        const py = na.y + (nb.y - na.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((n, i) => {
        // Glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        glow.addColorStop(0, n.color + '30');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Pulse
        const pulse = Math.sin(frame * 0.03 + i) * 0.15 + 1;

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '20';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Label
        if (n.label) {
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = '#94A3B8';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + n.r + 16);
        }
      });

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', maxWidth: 500, height: 'auto' }}
    />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const problems = [
    {
      icon: '😰',
      title: 'Users Are Intimidated',
      desc: 'MetaMask popups, gas fees, chain switching — the average user abandons before their first transaction. Web3 UX is still stuck in 2017.',
    },
    {
      icon: '⏱️',
      title: 'Developers Burn Time',
      desc: 'Building for Web3 means wrestling with RPC nodes, wallet SDKs, and chain-specific quirks. Weeks of infra work before shipping a single feature.',
    },
    {
      icon: '🏢',
      title: 'Enterprises Stay Out',
      desc: 'Compliance, key management, and operational complexity make blockchain adoption a non-starter for most organizations.',
    },
    {
      icon: '🤖',
      title: 'AI & Web3 Don\'t Talk',
      desc: 'AI agents can write code and answer questions — but they can\'t sign transactions, read on-chain state, or interact with smart contracts.',
    },
    {
      icon: '📉',
      title: 'Adoption Has Stalled',
      desc: 'Despite billions in infrastructure investment, daily active wallets remain a fraction of total crypto accounts. The UX gap is the bottleneck.',
    },
  ];

  return (
    <div className="landing">
      <SeoHead title="Home" description="Natural language blockchain assistant. Check balances, send tokens, swap, and deploy contracts on GIWA — all with plain English." path="/" />
      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">⚡</span>
            <span className="landing-logo-text">Blockmind Labs</span>
          </div>
          <div className="landing-nav-links">
            <a href="#problem">Problem</a>
            <a href="#solution">Solution</a>
            <a href="#technology">Technology</a>
            <a href="#sdk">SDK</a>
            <a href="#market">Market</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#team">Team</a>
            <a onClick={() => navigate('/docs')} style={{ cursor: 'pointer' }}>Docs</a>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/chat')}>
              Launch App →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <div className="landing-tracker">
              <span className="landing-tracker-line" />
              <span className="landing-tracker-text">GIWA GASOK 2025 · TRACK: AI / WEB3</span>
            </div>

            <h1 className="landing-headline">
              The AI that lives on-chain<span className="amber">.</span>
            </h1>

            <p className="landing-sub">
              Blockmind Labs embeds autonomous AI agents directly into blockchain
              infrastructure — turning natural language into on-chain action for
              users, developers, and enterprises on GIWA.
            </p>

            <div className="landing-cta-row">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/chat')}>
                Start for free <span className="arrow">→</span>
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => navigate('/docs')}
              >
                Read the docs
              </button>
            </div>

            <div className="landing-checks">
              <span className="landing-check"><span className="check-icon">✓</span> Built for GIWA</span>
              <span className="landing-check"><span className="check-icon">✓</span> Zero-custody</span>
              <span className="landing-check"><span className="check-icon">✓</span> Agent-native</span>
            </div>
          </div>

          <div className="landing-hero-graphic">
            <NetworkGraphic />
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────── */}
      <section className="landing-section" id="problem">
        <div className="landing-section-inner">
          <div className="section-tag">THE PROBLEM</div>
          <h2 className="section-title">
            Web3 is powerful — but still locked behind complexity<span className="amber">.</span>
          </h2>

          <div className="problem-grid">
            {problems.map((p) => (
              <div className="problem-card" key={p.title}>
                <div className="problem-card-icon">{p.icon}</div>
                <h3 className="problem-card-title">{p.title}</h3>
                <p className="problem-card-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────── */}
      <section className="landing-section" id="solution">
        <div className="landing-section-inner">
          <div className="section-tag">OUR SOLUTION</div>
          <h2 className="section-title">
            Three pillars<span className="amber">.</span> One intelligence layer<span className="amber">.</span>
          </h2>

          <div className="solution-grid">
            {/* Card 1 */}
            <div className="solution-card">
              <div className="solution-card-header">
                <span className="solution-card-icon">💬</span>
                <div>
                  <h3 className="solution-card-title">Natural Language Interface</h3>
                  <p className="solution-card-sub">Speak to Web3 like you text a friend</p>
                </div>
              </div>
              <ul className="solution-card-list">
                <li><span className="arrow">▶</span> Plain-English transaction builder</li>
                <li><span className="arrow">▶</span> Multi-chain intent resolution engine</li>
                <li><span className="arrow">▶</span> Real-time gas optimization via LLM</li>
                <li><span className="arrow">▶</span> On-chain state summarization</li>
                <li><span className="arrow">▶</span> Failure recovery in plain language</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="solution-card">
              <div className="solution-card-header">
                <span className="solution-card-icon">⚙️</span>
                <div>
                  <h3 className="solution-card-title">Intelligent Automation Engine</h3>
                  <p className="solution-card-sub">Automate complex workflows end-to-end</p>
                </div>
              </div>
              <ul className="solution-card-list">
                <li><span className="arrow">▶</span> AI-orchestrated multi-step DeFi flows</li>
                <li><span className="arrow">▶</span> Trigger-based on-chain scheduling</li>
                <li><span className="arrow">▶</span> Cross-protocol arbitrage routing</li>
                <li><span className="arrow">▶</span> Automated smart contract pipelines</li>
                <li><span className="arrow">▶</span> Background monitoring & alerts</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="solution-card">
              <div className="solution-card-header">
                <span className="solution-card-icon">🛠️</span>
                <div>
                  <h3 className="solution-card-title">Developer Infrastructure SDK</h3>
                  <p className="solution-card-sub">Build AI-native dApps in hours</p>
                </div>
              </div>
              <ul className="solution-card-list">
                <li><span className="arrow">▶</span> Pre-built AI agent templates</li>
                <li><span className="arrow">▶</span> Agent-to-contract protocol</li>
                <li><span className="arrow">▶</span> LLM-ready RPC abstraction layer</li>
                <li><span className="arrow">▶</span> Sandbox with mock blockchain</li>
                <li><span className="arrow">▶</span> One-command GIWA deployment</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ───────────────────────────────────── */}
      <section className="landing-section" id="technology">
        <div className="landing-section-inner">
          <div className="section-tag">TECHNOLOGY</div>
          <h2 className="section-title">
            Five layers<span className="amber">.</span> One coherent AI<span className="amber">.</span>
          </h2>

          <div className="tech-stack">
            <div className="tech-layer" data-layer="5">
              <div className="tech-layer-left">
                <span className="tech-layer-num">LAYER 5</span>
                <span className="tech-layer-name">User Experience</span>
              </div>
              <div className="tech-layer-right">
                <span className="tech-pill violet">NL Chat UI</span>
                <span className="tech-pill violet">Mobile PWA</span>
                <span className="tech-pill violet">Wallet Plugin</span>
                <span className="tech-pill violet">Voice-to-TX</span>
              </div>
            </div>

            <div className="tech-layer" data-layer="4">
              <div className="tech-layer-left">
                <span className="tech-layer-num">LAYER 4</span>
                <span className="tech-layer-name">AI Agent Runtime</span>
              </div>
              <div className="tech-layer-right">
                <span className="tech-pill violet">LLM Reasoning</span>
                <span className="tech-pill violet">Intent Parser</span>
                <span className="tech-pill violet">Memory Store</span>
                <span className="tech-pill violet">Multi-Agent</span>
              </div>
            </div>

            <div className="tech-layer" data-layer="3">
              <div className="tech-layer-left">
                <span className="tech-layer-num">LAYER 3</span>
                <span className="tech-layer-name">Web3 Middleware</span>
              </div>
              <div className="tech-layer-right">
                <span className="tech-pill blue">RPC Abstraction</span>
                <span className="tech-pill blue">TX Builder</span>
                <span className="tech-pill blue">Gas Oracle</span>
                <span className="tech-pill blue">Chain Resolver</span>
              </div>
            </div>

            <div className="tech-layer" data-layer="2">
              <div className="tech-layer-left">
                <span className="tech-layer-num">LAYER 2</span>
                <span className="tech-layer-name">Blockchain Connectors</span>
              </div>
              <div className="tech-layer-right">
                <span className="tech-pill green">GIWA Adapter</span>
                <span className="tech-pill green">EVM Bridge</span>
                <span className="tech-pill green">Move VM</span>
                <span className="tech-pill green">EventListener</span>
              </div>
            </div>

            <div className="tech-layer" data-layer="1">
              <div className="tech-layer-left">
                <span className="tech-layer-num">LAYER 1</span>
                <span className="tech-layer-name">Infrastructure</span>
              </div>
              <div className="tech-layer-right">
                <span className="tech-pill amber">Node Network</span>
                <span className="tech-pill amber">HSM Key Vault</span>
                <span className="tech-pill amber">Event Bus</span>
                <span className="tech-pill amber">Observability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEVELOPER SDK ────────────────────────────────── */}
      <section className="landing-section" id="sdk">
        <div className="landing-section-inner">
          <div className="sdk-grid">
            {/* Left column */}
            <div className="sdk-content">
              <div className="section-tag">DEVELOPER SDK</div>
              <h2 className="section-title">
                Build AI-native dApps in hours, not months<span className="amber">.</span>
              </h2>
              <p className="sdk-desc">
                The <code className="inline-code">@blockmind/sdk</code> gives your dApp
                a natural language brain. Users type what they want — your app
                handles intent parsing, simulation, signing, and on-chain execution.
              </p>

              <div className="sdk-features">
                <div className="sdk-feature"><span className="check-icon">✓</span> Natural language execution with typed confirmations</div>
                <div className="sdk-feature"><span className="check-icon">✓</span> Simulation before every state-changing call</div>
                <div className="sdk-feature"><span className="check-icon">✓</span> Chain-agnostic: GIWA, EVM, Solana, Move VM</div>
                <div className="sdk-feature"><span className="check-icon">✓</span> Sandbox environment with mock blockchain</div>
                <div className="sdk-feature"><span className="check-icon">✓</span> Drop-in agent templates for DeFi, NFT, governance</div>
              </div>

              <div className="sdk-actions">
                <button className="btn btn-primary" onClick={() => navigate('/docs/sdk')}>
                  View SDK docs <span className="arrow">→</span>
                </button>
                <div className="sdk-install">
                  <span className="sdk-install-prompt">$</span>
                  <code>npm install @blockmind/sdk</code>
                </div>
              </div>
            </div>

            {/* Right column — code block */}
            <div className="sdk-code-window">
              <div className="code-window-header">
                <div className="code-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="code-window-lang">TYPESCRIPT</span>
              </div>
              <pre className="code-window-body">
                <code>
                  <span className="kw">import</span>{' '}{'{'} BlockmindClient {'}'} <span className="kw">from</span> <span className="str">'@blockmind/sdk'</span>{'\n\n'}
                  <span className="kw">const</span> client = <span className="kw">new</span> <span className="fn">BlockmindClient</span>{'{'}
                  {'\n'}  apiKey: process.env.<span className="var">BLOCKMIND_API_KEY</span>,
                  {'\n'}  chain: <span className="str">'giwa-sepolia'</span>,
                  {'\n'}{'}'};{'\n\n'}
                  <span className="kw">const</span> session = <span className="kw">await</span> client.<span className="fn">createSession</span>();{'\n\n'}
                  <span className="cmt">{'// Natural language → on-chain action'}</span>{'\n'}
                  <span className="kw">const</span> result = <span className="kw">await</span> session.<span className="fn">execute</span>(
                  {'\n'}  <span className="str">'Swap 100 GIWA for USDC'</span>,
                  {'\n'}  {'{'} wallet: <span className="str">'0x04e0...db1b'</span> {'}'}
                  {'\n'});{'\n\n'}
                  <span className="kw">if</span> (result.requiresConfirmation) {'{'}
                  {'\n'}  <span className="cmt">{'// User reviews typed TX summary'}</span>{'\n'}
                  {'\n'}  <span className="kw">await</span> client.<span className="fn">confirm</span>(result.token);
                  {'\n'}{'}'}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKET OPPORTUNITY ───────────────────────────── */}
      <section className="landing-section" id="market">
        <div className="landing-section-inner">
          <div className="section-tag">MARKET OPPORTUNITY</div>
          <h2 className="section-title">
            The AI x Web3 convergence<span className="amber">:</span> a $500B+ market<span className="amber">.</span>
          </h2>

          {/* Top row — large metric cards */}
          <div className="market-metrics">
            <div className="metric-card">
              <div className="metric-value">$241B</div>
              <div className="metric-label">Global Blockchain Market by 2030</div>
              <div className="metric-note">CAGR 42.8%</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">$407B</div>
              <div className="metric-label">AI Software Market by 2030</div>
              <div className="metric-note">CAGR 38.1%</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">420M+</div>
              <div className="metric-label">Crypto Users Worldwide</div>
              <div className="metric-note">Active on 50+ chains</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">3.4B</div>
              <div className="metric-label">Potential Web3 Onboarding Target</div>
              <div className="metric-note">Internet users not yet in Web3</div>
            </div>
          </div>

          {/* Bottom row — monetization cards */}
          <div className="market-business">
            <div className="biz-card">
              <div className="biz-card-header">
                <span className="biz-card-icon">🧠</span>
                <h3 className="biz-card-title">GIWA Wallet AI Layer</h3>
              </div>
              <p className="biz-card-desc">
                Consumer subscription model for AI-powered wallet features.
                Natural language TX, scam detection, portfolio insights.
              </p>
              <div className="biz-card-pricing">
                <span className="biz-price">$4.99<span className="biz-price-unit">/mo</span></span>
                <span className="biz-target">Year 1 ARR target: $2.4M</span>
              </div>
              <div className="biz-card-badge">TAM: $12B</div>
            </div>

            <div className="biz-card">
              <div className="biz-card-header">
                <span className="biz-card-icon">🛠️</span>
                <h3 className="biz-card-title">Developer SDK Licensing</h3>
              </div>
              <p className="biz-card-desc">
                API-metered pricing per agent call. Includes sandbox, templates,
                and production-grade infrastructure.
              </p>
              <div className="biz-card-pricing">
                <span className="biz-price">$0.005<span className="biz-price-unit">/call</span></span>
                <span className="biz-target">Year 1: 10M agent calls</span>
              </div>
              <div className="biz-card-badge">TAM: $8B</div>
            </div>

            <div className="biz-card">
              <div className="biz-card-header">
                <span className="biz-card-icon">🏢</span>
                <h3 className="biz-card-title">Enterprise & Protocol API</h3>
              </div>
              <p className="biz-card-desc">
                White-label AI agent infrastructure for protocols, DAOs, and
                enterprises. Custom deployments and SLAs.
              </p>
              <div className="biz-card-pricing">
                <span className="biz-price">$5K–$50K<span className="biz-price-unit">/mo</span></span>
                <span className="biz-target">10 partners by Year 2</span>
              </div>
              <div className="biz-card-badge">TAM: $22B</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ──────────────────────────────────────── */}
      <section className="landing-section" id="roadmap">
        <div className="landing-section-inner">
          <div className="section-tag">ROADMAP</div>
          <h2 className="section-title">
            From GIWA grant <span className="amber">→</span> production <span className="amber">→</span> global scale<span className="amber">.</span>
          </h2>

          <div className="roadmap-track">
            <div className="roadmap-line" />
            <div className="roadmap-dot" data-phase="1" />
            <div className="roadmap-dot" data-phase="2" />
            <div className="roadmap-dot" data-phase="3" />
            <div className="roadmap-dot" data-phase="4" />
          </div>

          <div className="roadmap-grid">
            <div className="roadmap-card">
              <div className="roadmap-phase">PHASE 1</div>
              <div className="roadmap-period">M1–M2</div>
              <h3 className="roadmap-title">Prototype & Foundation</h3>
              <ul className="roadmap-list">
                <li>AI agent architecture design</li>
                <li>GIWA chain research & integration</li>
                <li>NLP intent parsing module</li>
                <li>Developer sandbox setup</li>
                <li>GASOK tracking submission</li>
              </ul>
            </div>

            <div className="roadmap-card">
              <div className="roadmap-phase">PHASE 2</div>
              <div className="roadmap-period">M3–M5</div>
              <h3 className="roadmap-title">Testnet MVP</h3>
              <ul className="roadmap-list">
                <li>AI agent live on GIWA testnet</li>
                <li>Wallet plugin alpha release</li>
                <li>50 devs + 200 beta users</li>
                <li>Latency &lt;500ms target</li>
                <li>Security audit completed</li>
              </ul>
            </div>

            <div className="roadmap-card">
              <div className="roadmap-phase">PHASE 3</div>
              <div className="roadmap-period">M6–M9</div>
              <h3 className="roadmap-title">Mainnet Launch</h3>
              <ul className="roadmap-list">
                <li>Mainnet deployment (99.5% SLA)</li>
                <li>SDK v1.0 public release</li>
                <li>10 example dApps shipped</li>
                <li>First 5 enterprise partners</li>
                <li>Community marketing push</li>
              </ul>
            </div>

            <div className="roadmap-card">
              <div className="roadmap-phase">PHASE 4</div>
              <div className="roadmap-period">M10–M15</div>
              <h3 className="roadmap-title">Scale & Expansion</h3>
              <ul className="roadmap-list">
                <li>EVM + Solana + Move VM adapters</li>
                <li>White-label partner tools</li>
                <li>Series A prep ($2M–$5M)</li>
                <li>Developer ambassador programs</li>
                <li>Multi-chain protocol support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM & ASK ──────────────────────────────────── */}
      <section className="landing-section" id="team">
        <div className="landing-section-inner">
          <div className="section-tag">TEAM & ASK</div>
          <h2 className="section-title">
            The moment is now<span className="amber">.</span>
          </h2>

          <div className="team-grid">
            {/* Left — Founder Card */}
            <div className="founder-card">
              <div className="founder-header">
                <div className="founder-avatar">HSF</div>
                <div>
                  <h3 className="founder-name">Habte Selassie Fitsum</h3>
                  <p className="founder-role">Founder · AI & Blockchain Engineer</p>
                  <p className="founder-location">Addis Ababa, Ethiopia · <a href="https://github.com/habte-selassie27" target="_blank" rel="noreferrer">github.com/habte-selassie27</a></p>
                </div>
              </div>

              <div className="founder-skills">
                <div className="founder-skill-group">
                  <div className="founder-skill-label">Full-Stack Engineering</div>
                  <div className="founder-skill-tags">
                    <span>React 19</span><span>Node.js</span><span>Python</span><span>PostgreSQL</span><span>MongoDB</span>
                  </div>
                </div>
                <div className="founder-skill-group">
                  <div className="founder-skill-label">Blockchain Development</div>
                  <div className="founder-skill-tags">
                    <span>Solidity</span><span>Aptos Move</span><span>EVM</span><span>Wagmi</span><span>Viem</span><span>LayerZero</span>
                  </div>
                </div>
                <div className="founder-skill-group">
                  <div className="founder-skill-label">AI/ML Integration</div>
                  <div className="founder-skill-tags">
                    <span>LLM Orchestration</span><span>Agentic Pipelines</span><span>NLP</span><span>RAG</span>
                  </div>
                </div>
                <div className="founder-skill-group">
                  <div className="founder-skill-label">Rapid MVP Delivery</div>
                  <div className="founder-skill-tags">
                    <span>Multiple production dApps shipped solo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Ecosystem Ask */}
            <div className="ask-card">
              <h3 className="ask-headline">AI + Web3 convergence is happening now.</h3>
              <p className="ask-desc">
                Blockmind Labs is positioned to become the intelligence layer for
                the GIWA ecosystem — making blockchain accessible to everyone
                through natural language AI agents.
              </p>

              <div className="ask-benefits">
                <div className="ask-benefit">
                  <span className="ask-benefit-icon">🏆</span>
                  <div>
                    <div className="ask-benefit-title">GIWA GASOK Grant</div>
                    <div className="ask-benefit-desc">Seed funding to execute Phases 1 & 2</div>
                  </div>
                </div>
                <div className="ask-benefit">
                  <span className="ask-benefit-icon">🏆</span>
                  <div>
                    <div className="ask-benefit-title">Technical Mentorship</div>
                    <div className="ask-benefit-desc">Access to GIWA core team for early integration and wallet API access</div>
                  </div>
                </div>
                <div className="ask-benefit">
                  <span className="ask-benefit-icon">📢</span>
                  <div>
                    <div className="ask-benefit-title">Ecosystem Visibility</div>
                    <div className="ask-benefit-desc">Feature in GIWA developer newsletter and community channels</div>
                  </div>
                </div>
                <div className="ask-benefit">
                  <span className="ask-benefit-icon">🌐</span>
                  <div>
                    <div className="ask-benefit-title">Pilot Partnership</div>
                    <div className="ask-benefit-desc">GIWA Wallet AI plugin beta distribution</div>
                  </div>
                </div>
              </div>

              <div className="ask-actions">
                <a className="btn btn-primary" href="https://gasok.giwa.io" target="_blank" rel="noreferrer">
                  Apply via GASOK <span className="arrow">→</span>
                </a>
                <a className="btn btn-outline" href="https://docs.blockmind.xyz/pitch" target="_blank" rel="noreferrer">
                  View pitch deck
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <div className="landing-logo" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="landing-logo-icon">⚡</span>
                <span className="landing-logo-text">Blockmind</span>
              </div>
              <p className="footer-tagline">AI infrastructure for the next Web3 era.</p>
            </div>

            {/* Product */}
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="/chat">Blockmind Chat</a>
              <a href="#sdk">SDK</a>
              <a href="#technology">Analytics</a>
              <a href="#solution">Scam Shield</a>
            </div>

            {/* Developers */}
            <div className="footer-col">
              <div className="footer-col-title">Developers</div>
              <a href="/docs">Documentation</a>
              <a href="/docs/api">API Reference</a>
              <a href="/docs/sdk">SDK</a>
              <a href="/status">Status</a>
            </div>

            {/* Company */}
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a href="/about">About</a>
              <a href="/partnership/giwa">GIWA Partnership</a>
              <a href="/blog">Blog</a>
              <a href="/contact">Contact</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copyright">© 2025 Blockmind Labs — Addis Ababa, Ethiopia</span>
            <div className="footer-legal">
              <a href="https://blockmind.xyz/privacy" target="_blank" rel="noreferrer">Privacy</a>
              <span className="footer-dot">·</span>
              <a href="https://blockmind.xyz/terms" target="_blank" rel="n noreferrer">Terms</a>
              <span className="footer-dot">·</span>
              <a href="https://blockmind.xyz/security" target="_blank" rel="n noreferrer">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
