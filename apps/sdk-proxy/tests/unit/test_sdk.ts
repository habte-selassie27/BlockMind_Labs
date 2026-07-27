import { describe, it, expect } from 'vitest';
import { createKey, getKeyById, getKeyByValue, incrementCalls } from '../../src/keys';
import { getUsageStats, recordCall } from '../../src/metering';

describe('SDK Keys', () => {
  it('creates a key with correct format', () => {
    const key = createKey({
      name: 'Test App',
      environment: 'live',
      allowed_chains: [91342],
      allowed_tools: ['get_balance'],
      monthly_call_limit: 1000,
    });

    expect(key.id).toMatch(/^key_/);
    expect(key.key).toMatch(/^bm_live_sk_/);
    expect(key.name).toBe('Test App');
    expect(key.environment).toBe('live');
    expect(key.calls_this_month).toBe(0);
  });

  it('creates test key with correct prefix', () => {
    const key = createKey({
      name: 'Test',
      environment: 'test',
      allowed_chains: [91342],
      allowed_tools: [],
      monthly_call_limit: 100,
    });

    expect(key.key).toMatch(/^bm_test_sk_/);
  });

  it('retrieves key by id', () => {
    const key = createKey({
      name: 'Retrievable',
      environment: 'test',
      allowed_chains: [],
      allowed_tools: [],
      monthly_call_limit: 100,
    });

    const found = getKeyById(key.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Retrievable');
  });

  it('retrieves key by value', () => {
    const key = createKey({
      name: 'By Value',
      environment: 'test',
      allowed_chains: [],
      allowed_tools: [],
      monthly_call_limit: 100,
    });

    const found = getKeyByValue(key.key);
    expect(found).toBeDefined();
    expect(found!.name).toBe('By Value');
  });

  it('increments call count', () => {
    const key = createKey({
      name: 'Counter',
      environment: 'test',
      allowed_chains: [],
      allowed_tools: [],
      monthly_call_limit: 100,
    });

    incrementCalls(key.id);
    incrementCalls(key.id);
    incrementCalls(key.id);

    const found = getKeyById(key.id);
    expect(found!.calls_this_month).toBe(3);
  });
});

describe('SDK Metering', () => {
  it('tracks usage stats', () => {
    const key = createKey({
      name: 'Stats Test',
      environment: 'test',
      allowed_chains: [91342],
      allowed_tools: ['get_balance'],
      monthly_call_limit: 1000,
    });

    recordCall(key.id, '/sdk/v1/agent/execute', 91342);
    recordCall(key.id, '/sdk/v1/agent/execute', 91342);
    recordCall(key.id, '/sdk/v1/chain/balance', 91342);
    incrementCalls(key.id);
    incrementCalls(key.id);
    incrementCalls(key.id);

    const stats = getUsageStats(key);
    expect(stats.total_calls).toBe(3);
    expect(stats.call_limit).toBe(1000);
    expect(stats.calls_remaining).toBe(997);
    expect(stats.by_tool['/sdk/v1/agent/execute']).toBe(2);
  });
});
