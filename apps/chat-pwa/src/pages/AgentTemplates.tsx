import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SeoHead from '../components/SeoHead';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  prompt: string;
  tags: string[];
}

const templates: AgentTemplate[] = [
  {
    id: 'dca',
    name: 'DCA (Dollar-Cost Average)',
    description: 'Automatically buy a fixed amount of a token at regular intervals. Reduce volatility risk by spreading purchases over time.',
    category: 'Strategy',
    icon: '📊',
    prompt: 'Set up a DCA plan: buy $50 of GIWA every week',
    tags: ['auto', 'strategy', 'low-risk'],
  },
  {
    id: 'rebalance',
    name: 'Portfolio Rebalance',
    description: 'Rebalance your portfolio to target allocations. The agent will calculate needed swaps and execute them.',
    category: 'Strategy',
    icon: '⚖️',
    prompt: 'Rebalance my portfolio to 50% GIWA, 30% USDC, 20% WETH',
    tags: ['auto', 'portfolio'],
  },
  {
    id: 'yield',
    name: 'Yield Finder',
    description: 'Scan available yield opportunities across GIWA DeFi protocols and recommend the best options for your holdings.',
    category: 'DeFi',
    icon: '🌾',
    prompt: 'Find the best yield opportunities for my GIWA tokens',
    tags: ['defi', 'yield'],
  },
  {
    id: 'send',
    name: 'Quick Send',
    description: 'Send tokens to any address with natural language. Just say who and how much.',
    category: 'Transfer',
    icon: '📤',
    prompt: 'Send 10 GIWA to 0x1234...abcd',
    tags: ['transfer', 'simple'],
  },
  {
    id: 'swap',
    name: 'Smart Swap',
    description: 'Find the best swap rate across DEXes. Compares prices and suggests optimal routing.',
    category: 'Trading',
    icon: '🔄',
    prompt: 'Swap 100 USDC for GIWA at the best rate',
    tags: ['swap', 'trading'],
  },
  {
    id: 'monitor',
    name: 'Wallet Monitor',
    description: 'Monitor any wallet address for incoming/outgoing transactions. Get notified of activity.',
    category: 'Security',
    icon: '👁️',
    prompt: 'Monitor address 0x1234...abcd for any transactions',
    tags: ['monitor', 'security'],
  },
  {
    id: 'risk-check',
    name: 'Contract Risk Check',
    description: 'Analyze a smart contract for potential risks before interacting. Checks for common vulnerabilities.',
    category: 'Security',
    icon: '🛡️',
    prompt: 'Check the risk level for contract 0x1234...abcd',
    tags: ['security', 'audit'],
  },
  {
    id: 'gas-optimizer',
    name: 'Gas Optimizer',
    description: 'Analyze current gas prices and suggest the optimal time to transact. Set up gas alerts.',
    category: 'Utility',
    icon: '⛽',
    prompt: 'What are current gas prices and when should I transact?',
    tags: ['gas', 'utility'],
  },
  {
    id: 'multi-send',
    name: 'Batch Transfer',
    description: 'Send tokens to multiple recipients in one go. Perfect for payroll, airdrops, or splitting bills.',
    category: 'Transfer',
    icon: '📦',
    prompt: 'Send 5 GIWA each to 0xaaa, 0xbbb, 0xccc',
    tags: ['batch', 'transfer'],
  },
];

const categories = ['All', 'Strategy', 'DeFi', 'Trading', 'Transfer', 'Security', 'Utility'];

export default function AgentTemplates() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = templates.filter(t => {
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUseTemplate = (template: AgentTemplate) => {
    // Store the prompt and navigate to chat
    sessionStorage.setItem('blockmind_pending_prompt', template.prompt);
    navigate('/chat');
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
          <SeoHead title="Agent Templates" description="Pre-built AI agent workflows — DCA, rebalance, yield farming, and more." path="/templates" />

          <div className="portfolio-header">
            <div className="portfolio-header-left">
              <span className="portfolio-tag">TEMPLATES</span>
              <h1 className="portfolio-title">Agent Templates</h1>
              <p style={{ color: '#777169', fontSize: '0.9rem', marginTop: 4 }}>
                Pre-built workflows. Click a template to start using it in chat.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="tx-filters">
            <div className="tx-filter-group">
              {categories.map(c => (
                <button
                  key={c}
                  className={`tx-filter-btn ${selectedCategory === c ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="tx-search"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Template Grid */}
          <div className="template-grid">
            {filtered.map(template => (
              <div key={template.id} className="template-card" onClick={() => handleUseTemplate(template)}>
                <div className="template-card-header">
                  <span className="template-icon">{template.icon}</span>
                  <span className="template-category">{template.category}</span>
                </div>
                <h3 className="template-name">{template.name}</h3>
                <p className="template-desc">{template.description}</p>
                <div className="template-tags">
                  {template.tags.map(tag => (
                    <span key={tag} className="template-tag">{tag}</span>
                  ))}
                </div>
                <div className="template-prompt">
                  <code>{template.prompt}</code>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="portfolio-empty">
              <span className="portfolio-empty-icon">🔍</span>
              <p>No templates match your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
