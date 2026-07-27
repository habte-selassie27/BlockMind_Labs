import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = 'typescript', title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      {title && (
        <div className="code-block-header">
          <span className="code-block-title">{title}</span>
          <span className="code-block-lang">{language}</span>
        </div>
      )}
      <div className="code-block-body">
        <button className="code-block-copy" onClick={handleCopy} aria-label="Copy code">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <pre className="code-block-pre">
          <code className={`code-block-code language-${language}`}>
            {showLineNumbers
              ? code.split('\n').map((line, i) => (
                  <span key={i} className="code-line">
                    <span className="code-line-number">{i + 1}</span>
                    <span className="code-line-content">{line}</span>
                  </span>
                ))
              : code
            }
          </code>
        </pre>
      </div>
    </div>
  );
}

interface CodeTabsProps {
  tabs: { label: string; code: string; language?: string }[];
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tabs[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-tabs">
      <div className="code-tabs-header">
        <div className="code-tabs-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              className={`code-tabs-tab ${i === active ? 'active' : ''}`}
              onClick={() => { setActive(i); setCopied(false); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="code-tabs-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="code-tabs-body">
        <pre className="code-block-pre">
          <code className={`code-block-code language-${tabs[active].language || 'typescript'}`}>
            {tabs[active].code}
          </code>
        </pre>
      </div>
    </div>
  );
}
