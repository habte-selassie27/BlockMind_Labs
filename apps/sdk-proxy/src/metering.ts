import type { SDKKey, UsageStats } from './types';

// In-memory usage tracking (production: PostgreSQL + Redis)
const usage = new Map<string, {
  by_tool: Record<string, number>;
  by_chain: Record<string, number>;
  errors: number;
}>();

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonthTimestamp(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
}

export function recordCall(keyId: string, tool: string, chainId: number): void {
  if (!usage.has(keyId)) {
    usage.set(keyId, { by_tool: {}, by_chain: {}, errors: 0 });
  }
  const stats = usage.get(keyId)!;
  stats.by_tool[tool] = (stats.by_tool[tool] || 0) + 1;
  stats.by_chain[String(chainId)] = (stats.by_chain[String(chainId)] || 0) + 1;
}

export function recordError(keyId: string): void {
  if (!usage.has(keyId)) {
    usage.set(keyId, { by_tool: {}, by_chain: {}, errors: 0 });
  }
  usage.get(keyId)!.errors++;
}

export function getUsageStats(key: SDKKey): UsageStats {
  const stats = usage.get(key.id) || { by_tool: {}, by_chain: {}, errors: 0 };
  const totalCalls = key.calls_this_month;
  const errors = stats.errors;
  const errorRate = totalCalls > 0 ? (errors / totalCalls) * 100 : 0;

  return {
    key_id: key.id,
    period: getCurrentPeriod(),
    total_calls: totalCalls,
    call_limit: key.monthly_call_limit,
    calls_remaining: Math.max(0, key.monthly_call_limit - totalCalls),
    reset_at: getNextMonthTimestamp(),
    by_tool: stats.by_tool,
    by_chain: stats.by_chain,
    error_count: errors,
    error_rate_pct: Math.round(errorRate * 100) / 100,
  };
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: sdk-proxy
