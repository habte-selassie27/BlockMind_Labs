import type { SDKKey } from './types';

// In-memory store (production: PostgreSQL)
const keys = new Map<string, SDKKey>();

export function generateKeyId(): string {
  return `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateAPIKey(environment: 'live' | 'test'): string {
  const prefix = environment === 'live' ? 'bm_live' : 'bm_test';
  const random = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}_sk_${random}`;
}

export function createKey(params: {
  name: string;
  environment: 'live' | 'test';
  allowed_chains: number[];
  allowed_tools: string[];
  monthly_call_limit: number;
}): SDKKey {
  const id = generateKeyId();
  const key = generateAPIKey(params.environment);

  const sdkKey: SDKKey = {
    id,
    name: params.name,
    key,
    environment: params.environment,
    allowed_chains: params.allowed_chains,
    allowed_tools: params.allowed_tools,
    monthly_call_limit: params.monthly_call_limit,
    calls_this_month: 0,
    created_at: Math.floor(Date.now() / 1000),
  };

  keys.set(id, sdkKey);
  return sdkKey;
}

export function getKeyById(id: string): SDKKey | undefined {
  return keys.get(id);
}

export function getKeyByValue(keyValue: string): SDKKey | undefined {
  for (const sdkKey of keys.values()) {
    if (sdkKey.key === keyValue) return sdkKey;
  }
  return undefined;
}

export function incrementCalls(id: string): void {
  const sdkKey = keys.get(id);
  if (sdkKey) {
    sdkKey.calls_this_month++;
  }
}

export function resetMonthlyCalls(id: string): void {
  const sdkKey = keys.get(id);
  if (sdkKey) {
    sdkKey.calls_this_month = 0;
  }
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: sdk-proxy
