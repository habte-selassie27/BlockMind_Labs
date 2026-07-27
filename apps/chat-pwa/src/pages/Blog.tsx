import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SeoHead from '../components/SeoHead';

const categories = ['All', 'Engineering', 'Research', 'Security', 'Ecosystem', 'Company'];

const articles = [
  {
    id: 1,
    category: 'Company',
    date: 'July 20, 2025',
    readTime: '5 min read',
    title: 'Introducing BlockMind Labs: The Intelligence Layer for Web3',
    excerpt: 'Our vision for making blockchain accessible to everyone through natural language AI agents, and the roadmap ahead for AI-native Web3 infrastructure.',
    author: 'Habte Selassie Fitsum',
    featured: true,
  },
  {
    id: 2,
    category: 'Engineering',
    date: 'July 22, 2025',
    readTime: '8 min read',
    title: 'Under the Hood: How Our NLP Intent Parser Works',
    excerpt: 'A technical deep dive into transforming unstructured natural language into structured, deterministic blockchain execution plans.',
    author: 'Habte Selassie Fitsum',
    featured: true,
  },
  {
    id: 3,
    category: 'Security',
    date: 'July 24, 2025',
    readTime: '6 min read',
    title: 'Non-Custodial by Design: Securing User Assets in AI Agents',
    excerpt: 'Why we architected BlockMind to never hold private keys, and how our simulation-first approach protects users from malicious contracts.',
    author: 'Habte Selassie Fitsum',
    featured: false,
  },
  {
    id: 4,
    category: 'Ecosystem',
    date: 'July 25, 2025',
    readTime: '4 min read',
    title: 'Why GIWA L2 is the Perfect Foundation for AI Web3',
    excerpt: 'Analyzing the technical requirements for AI agents on-chain, and why GIWA\'s speed and EVM compatibility make it the ideal partner.',
    author: 'Habte Selassie Fitsum',
    featured: false,
  },
  {
    id: 5,
    category: 'Engineering',
    date: 'July 28, 2025',
    readTime: '10 min read',
    title: 'Building a Production Agent Runtime: Lessons from the Trenches',
    excerpt: 'The engineering decisions behind our agent execution environment — from tool calling architecture to memory management and error recovery.',
    author: 'Habte Selassie Fitsum',
    featured: false,
  },
  {
    id: 6,
    category: 'Research',
    date: 'July 30, 2025',
    readTime: '12 min read',
    title: 'The Case for Agent-Native Blockchain Infrastructure',
    excerpt: 'Why AI agents should be first-class citizens in blockchain architecture, not an afterthought. A research perspective on the future of Web3.',
    author: 'Habte Selassie Fitsum',
    featured: false,
  },
];

const categoryColors: Record<string, string> = {
  Company: '#c15f3c',
  Engineering: '#4a7fb5',
  Security: '#c44b3f',
  Ecosystem: '#3d7a45',
  Research: '#8b5cf6',
};

export default function Blog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  return (
    <div className="corp-page">
      <SeoHead title="Blog" description="Engineering insights, research updates, and announcements from Blockmind Labs." path="/blog" />
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
            <a onClick={() => navigate('/blog')} className="corp-nav-link active">Blog</a>
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
          <span className="corp-hero-tag">BLOG</span>
          <h1 className="corp-hero-title">
            Engineering the future<br />of AI-powered blockchain.
          </h1>
          <p className="corp-hero-desc">
            Technical deep dives, security research, and ecosystem updates from
            the BlockMind Labs engineering team.
          </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="corp-section" style={{ paddingTop: 0 }}>
        <div className="corp-section-inner">
          <div className="corp-blog-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`corp-blog-filter ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Featured Article */}
          {filtered.length > 0 && filtered[0].featured && (
            <div className="corp-blog-featured" onClick={() => {}}>
              <div className="corp-blog-featured-badge">Featured</div>
              <div className="corp-blog-featured-meta">
                <span className="corp-blog-category" style={{ color: categoryColors[filtered[0].category] }}>
                  {filtered[0].category}
                </span>
                <span className="corp-blog-date">{filtered[0].date}</span>
                <span className="corp-blog-read">{filtered[0].readTime}</span>
              </div>
              <h2 className="corp-blog-featured-title">{filtered[0].title}</h2>
              <p className="corp-blog-featured-excerpt">{filtered[0].excerpt}</p>
              <div className="corp-blog-featured-footer">
                <span className="corp-blog-author">By {filtered[0].author}</span>
                <span className="corp-blog-readmore">Read article →</span>
              </div>
            </div>
          )}

          {/* Article Grid */}
          <div className="corp-blog-grid">
            {filtered.slice(filtered[0]?.featured ? 1 : 0).map(article => (
              <article key={article.id} className="corp-blog-card">
                <div className="corp-blog-card-meta">
                  <span className="corp-blog-category" style={{ color: categoryColors[article.category] }}>
                    {article.category}
                  </span>
                  <span className="corp-blog-date">{article.date}</span>
                </div>
                <h3 className="corp-blog-card-title">{article.title}</h3>
                <p className="corp-blog-card-excerpt">{article.excerpt}</p>
                <div className="corp-blog-card-footer">
                  <span className="corp-blog-read">{article.readTime}</span>
                  <span className="corp-blog-readmore">Read →</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="corp-section corp-section-cta">
        <div className="corp-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="corp-section-title">Stay updated</h2>
          <p className="corp-text" style={{ maxWidth: 450, margin: '0 auto 24px' }}>
            Follow us for the latest engineering insights, security research,
            and ecosystem updates.
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
