import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SeoHead from '../components/SeoHead';

export default function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    reason: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="corp-page">
      <SeoHead title="Contact" description="Get in touch with Blockmind Labs — partnerships, enterprise inquiries, and support." path="/contact" />
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
            <a onClick={() => navigate('/about')} className="corp-nav-link">About</a>
            <a onClick={() => navigate('/docs')} className="corp-nav-link">Docs</a>
          </div>
          <div className="corp-nav-right">
            <a onClick={() => navigate('/contact')} className="corp-nav-link active">Contact</a>
            <a onClick={() => navigate('/chat')} className="corp-cta-btn">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <span className="corp-hero-tag">CONTACT</span>
          <h1 className="corp-hero-title">
            Let's build the future<br />of AI-powered blockchain.
          </h1>
          <p className="corp-hero-desc">
            Have a question, a partnership proposal, or a technical challenge?
            We'd love to hear from you. Our team typically responds within 24 hours.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="corp-section">
        <div className="corp-section-inner">
          <div className="corp-contact-grid">
            {/* Channels */}
            <div className="corp-contact-channels">
              <h2 className="corp-contact-channels-title">Direct channels</h2>
              <p className="corp-contact-channels-desc">
                Reach us through any of these channels. For urgent technical issues,
                email is the fastest way to get a response.
              </p>

              <div className="corp-contact-items">
                <div className="corp-contact-item">
                  <div className="corp-contact-item-left">
                    <span className="corp-contact-item-icon">📧</span>
                    <div>
                      <h3 className="corp-contact-item-title">Email</h3>
                      <a href="mailto:hello@blockmind.xyz" className="corp-contact-item-link">hello@blockmind.xyz</a>
                    </div>
                  </div>
                </div>
                <div className="corp-contact-item">
                  <div className="corp-contact-item-left">
                    <span className="corp-contact-item-icon">💬</span>
                    <div>
                      <h3 className="corp-contact-item-title">Discord</h3>
                      <a href="#" className="corp-contact-item-link">Join our server</a>
                    </div>
                  </div>
                </div>
                <div className="corp-contact-item">
                  <div className="corp-contact-item-left">
                    <span className="corp-contact-item-icon">🐦</span>
                    <div>
                      <h3 className="corp-contact-item-title">Twitter</h3>
                      <a href="#" className="corp-contact-item-link">@blockmindxyz</a>
                    </div>
                  </div>
                </div>
                <div className="corp-contact-item">
                  <div className="corp-contact-item-left">
                    <span className="corp-contact-item-icon">🐙</span>
                    <div>
                      <h3 className="corp-contact-item-title">GitHub</h3>
                      <a href="#" className="corp-contact-item-link">github.com/blockmind-labs</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="corp-contact-form-wrapper">
              {submitted ? (
                <div className="corp-contact-success">
                  <div className="corp-contact-success-icon">✓</div>
                  <h3 className="corp-contact-success-title">Message sent</h3>
                  <p className="corp-contact-success-desc">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form className="corp-contact-form" onSubmit={handleSubmit}>
                  <h2 className="corp-contact-form-title">Send us a message</h2>

                  <div className="corp-form-row">
                    <div className="corp-form-group">
                      <label className="corp-form-label">Name *</label>
                      <input
                        type="text"
                        className="corp-form-input"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="corp-form-group">
                      <label className="corp-form-label">Work Email *</label>
                      <input
                        type="email"
                        className="corp-form-input"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="corp-form-group">
                    <label className="corp-form-label">Company / Project</label>
                    <input
                      type="text"
                      className="corp-form-input"
                      placeholder="Optional"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>

                  <div className="corp-form-group">
                    <label className="corp-form-label">Reason for Contacting *</label>
                    <select
                      className="corp-form-select"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      required
                    >
                      <option value="">Select a topic</option>
                      <option value="partnership">Partnership / Ecosystem Integration</option>
                      <option value="technical">Technical Support</option>
                      <option value="developer">Developer Question</option>
                      <option value="media">Media Inquiry</option>
                      <option value="investor">Investor Relations</option>
                      <option value="general">General Question</option>
                    </select>
                  </div>

                  <div className="corp-form-group">
                    <label className="corp-form-label">Message *</label>
                    <textarea
                      className="corp-form-textarea"
                      placeholder="Tell us how we can help..."
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      minLength={20}
                    />
                  </div>

                  <button type="submit" className="corp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Send Message →
                  </button>
                </form>
              )}
            </div>
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
