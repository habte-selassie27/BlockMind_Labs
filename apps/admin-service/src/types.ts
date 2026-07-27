export interface User {
  id: string;
  wallet_address: string;
  tier: 'free' | 'pro' | 'premium' | 'sdk_starter' | 'sdk_team' | 'enterprise';
  email: string | null;
  created_at: number;
  last_active: number;
  total_txs: number;
  status: 'active' | 'suspended' | 'banned';
}

export interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  last_check: number;
}

export interface AdminStats {
  total_users: number;
  active_users_24h: number;
  total_txs_24h: number;
  total_tvl: string;
  services: SystemHealth[];
}

// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: admin-service
