export interface GatewayConfig {
  jwtSecret: string;
  redisUrl: string;
  services: {
    intentService: string;
    agentRuntime: string;
    web3Middleware: string;
    memoryService: string;
  };
}

export interface JWTPayload {
  sub: string;
  wallet: string;
  chain_id: number;
  tier: 'free' | 'pro' | 'premium' | 'sdk_starter' | 'sdk_team' | 'enterprise';
  permissions: string[];
  iat: number;
  exp: number;
}

export interface RateLimitConfig {
  chat: number;
  sdk: number;
  reads: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free:        { chat: 50,          sdk: 0,         reads: 100 },
  pro:         { chat: Infinity,    sdk: 0,         reads: 1000 },
  sdk_starter: { chat: 0,           sdk: 10_000,    reads: 500 },
  sdk_team:    { chat: 0,           sdk: 100_000,   reads: 5000 },
  premium:     { chat: Infinity,    sdk: 50_000,    reads: 2000 },
  enterprise:  { chat: Infinity,    sdk: Infinity,  reads: Infinity },
};

export const TIMEOUTS = {
  intent_service: 5_000,
  agent_runtime: 30_000,
  web3_middleware: 10_000,
  wallet_signer: 5_000,
  memory_service: 5_000,
};

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: api-gateway
