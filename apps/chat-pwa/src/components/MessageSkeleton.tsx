export default function MessageSkeleton() {
  return (
    <div className="msg-group assistant" style={{ animation: 'fadeIn 200ms var(--ease-out) both' }}>
      <div className="msg-avatar assistant">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="8" width="16" height="12" rx="2" /><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" /><path d="M9 16c1.2 1 2.8 1 4 0" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <div className="skeleton skeleton-line lg" />
        <div className="skeleton skeleton-line md" />
        <div className="skeleton skeleton-line sm" />
      </div>
    </div>
  );
}

export function ThinkingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' }}>
      <div className="skeleton skeleton-avatar" style={{ width: 28, height: 28 }} />
      <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 9999 }} />
    </div>
  );
}
