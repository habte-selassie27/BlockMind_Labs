interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'outage';
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const labels = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' };
  return (
    <span className={`status-badge status-badge-${status}`}>
      <span className={`status-badge-dot status-badge-dot-${status}`} />
      {label || labels[status]}
    </span>
  );
}

interface ApiMethodProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export function ApiMethodBadge({ method }: ApiMethodProps) {
  return <span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span>;
}
