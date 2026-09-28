const MIDDLEWARE = (import.meta as any).env.VITE_WEB3_MIDDLEWARE_URL || '/api';

export interface GiwaStats {
  chain_id: number;
  chain: string;
  latest_block: string;
  block_time_avg_sec: number;
  tps: number;
  tx_total: number;
  tx_today: number;
  active_accounts: number;
  gas_avg_gwei: string;
  gas_low: string;
  gas_high: string;
  congestion: 'low' | 'medium' | 'high';
  verified_contracts: number;
  aa_wallets: number;
  eip7702_activity_24h: number;
  success_rate_pct: number;
  bridge_volume_24h: string;
  timestamp: number;
}

export async function getGiwaNetworkStats(chainId = 91342): Promise<GiwaStats> {
  const res = await fetch(`${MIDDLEWARE}/giwa/stats?chain_id=${chainId}`);
  if (!res.ok) throw new Error('network stats failed');
  return res.json();
}

export function formatCongestion(c: string): { label: string; color: string } {
  switch (c) {
    case 'low': return { label: 'Low — Optimal', color: '#22c55e' };
    case 'medium': return { label: 'Medium', color: '#f59e0b' };
    case 'high': return { label: 'High — Congested', color: '#ef4444' };
    default: return { label: c, color: 'var(--color-text-secondary)' };
  }
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: chat-pwa
