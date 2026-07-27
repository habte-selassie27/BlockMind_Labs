import { ReactNode } from 'react';

type CalloutType = 'info' | 'warning' | 'success' | 'danger';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const icons: Record<CalloutType, string> = {
  info: 'ℹ',
  warning: '⚠',
  success: '✓',
  danger: '✕',
};

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    <div className={`callout callout-${type}`}>
      <span className="callout-icon">{icons[type]}</span>
      <div className="callout-content">
        {title && <div className="callout-title">{title}</div>}
        <div className="callout-body">{children}</div>
      </div>
    </div>
  );
}
