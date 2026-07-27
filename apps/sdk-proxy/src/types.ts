export interface SDKKey {
  id: string;
  name: string;
  key: string;
  environment: 'live' | 'test';
  allowed_chains: number[];
  allowed_tools: string[];
  monthly_call_limit: number;
  calls_this_month: number;
  created_at: number;
}

export interface UsageStats {
  key_id: string;
  period: string;
  total_calls: number;
  call_limit: number;
  calls_remaining: number;
  reset_at: number;
  by_tool: Record<string, number>;
  by_chain: Record<string, number>;
  error_count: number;
  error_rate_pct: number;
}

export interface ProxyConfig {
  upstream: string;
  timeout: number;
}

export const SDK_TIERS: Record<string, { monthly_limit: number; rate_limit: number }> = {
  sdk_starter: { monthly_limit: 10_000, rate_limit: 500 },
  sdk_team: { monthly_limit: 100_000, rate_limit: 5_000 },
  sdk_enterprise: { monthly_limit: Infinity, rate_limit: Infinity },
};

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: sdk-proxy
