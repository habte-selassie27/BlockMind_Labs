import { describe, it, expect } from 'vitest';
import { RATE_LIMITS, TIMEOUTS } from '../../src/config';

describe('API Gateway Config', () => {
  it('has rate limits for all tiers', () => {
    expect(RATE_LIMITS.free).toBeDefined();
    expect(RATE_LIMITS.pro).toBeDefined();
    expect(RATE_LIMITS.sdk_starter).toBeDefined();
    expect(RATE_LIMITS.sdk_team).toBeDefined();
    expect(RATE_LIMITS.premium).toBeDefined();
    expect(RATE_LIMITS.enterprise).toBeDefined();
  });

  it('free tier has 50 chat limit', () => {
    expect(RATE_LIMITS.free.chat).toBe(50);
  });

  it('pro tier has unlimited chat', () => {
    expect(RATE_LIMITS.pro.chat).toBe(Infinity);
  });

  it('sdk_starter has 10k sdk calls', () => {
    expect(RATE_LIMITS.sdk_starter.sdk).toBe(10_000);
  });

  it('has timeouts for all services', () => {
    expect(TIMEOUTS.intent_service).toBe(5000);
    expect(TIMEOUTS.agent_runtime).toBe(30000);
    expect(TIMEOUTS.web3_middleware).toBe(10000);
    expect(TIMEOUTS.wallet_signer).toBe(5000);
    expect(TIMEOUTS.memory_service).toBe(5000);
  });
});
