import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';

interface SidebarItem {
  label: string;
  href: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface DocsLayoutProps {
  children: ReactNode;
  sidebar: SidebarSection[];
  toc?: { id: string; label: string }[];
  title?: string;
}

export default function DocsLayout({ children, sidebar, toc = [] }: DocsLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const headings = toc.map(t => document.getElementById(t.id)).filter(Boolean);
      let current = '';
      for (const el of headings) {
        if (el && el.getBoundingClientRect().top <= 120) {
          current = el.id;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  return (
    <div className="docs-layout">
      {/* Top Nav */}
      <header className="docs-topnav">
        <div className="docs-topnav-inner">
          <div className="docs-topnav-left">
            <button
              className="docs-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <Link to="/" className="docs-logo">
              <span className="docs-logo-icon">⚡</span>
              <span className="docs-logo-text">Blockmind</span>
            </Link>
            <span className="docs-logo-divider" />
            <Link to="/docs" className={`docs-topnav-link ${location.pathname.startsWith('/docs') ? 'active' : ''}`}>Docs</Link>
            <Link to="/docs/api" className={`docs-topnav-link ${location.pathname === '/docs/api' ? 'active' : ''}`}>API</Link>
            <Link to="/docs/sdk" className={`docs-topnav-link ${location.pathname === '/docs/sdk' ? 'active' : ''}`}>SDK</Link>
            <Link to="/status" className={`docs-topnav-link ${location.pathname === '/status' ? 'active' : ''}`}>Status</Link>
          </div>
          <div className="docs-topnav-right">
            <a href="https://github.com/blockmind-labs" target="_blank" rel="noreferrer" className="docs-topnav-link">GitHub</a>
          </div>
        </div>
      </header>

      <div className="docs-body">
        {/* Left Sidebar */}
        <aside className={`docs-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="docs-sidebar-nav">
            {sidebar.map((section) => (
              <div key={section.title} className="docs-sidebar-section">
                <div className="docs-sidebar-section-title">{section.title}</div>
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`docs-sidebar-link ${location.pathname === item.href ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {mobileMenuOpen && (
          <div className="docs-sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Main Content */}
        <main className="docs-main">
          <div className="docs-main-inner">
            {children}
          </div>
        </main>

        {/* Right TOC */}
        {toc.length > 0 && (
          <nav className="docs-toc">
            <div className="docs-toc-title">On this page</div>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`docs-toc-link ${activeSection === item.id ? 'active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
