import { describe, it, expect } from 'vitest';
import {
  configureRPC,
  getHealthyProviders,
  selectProvider,
  reportProviderError,
  reportProviderSuccess,
  getRPCConfig,
} from '../../src/rpc';

describe('RPC Router', () => {
  it('configures RPC providers', () => {
    configureRPC({
      providers: [
        { url: 'https://rpc1.example.com', weight: 10, healthy: true, errorCount: 0 },
        { url: 'https://rpc2.example.com', weight: 5, healthy: true, errorCount: 0 },
      ],
    });

    const config = getRPCConfig();
    expect(config.providers).toHaveLength(2);
  });

  it('returns healthy providers', () => {
    configureRPC({
      providers: [
        { url: 'https://healthy.example.com', weight: 10, healthy: true, errorCount: 0 },
        { url: 'https://unhealthy.example.com', weight: 10, healthy: false, errorCount: 5 },
      ],
    });

    const healthy = getHealthyProviders();
    expect(healthy).toHaveLength(1);
    expect(healthy[0].url).toBe('https://healthy.example.com');
  });

  it('selects a provider', () => {
    configureRPC({
      providers: [
        { url: 'https://rpc.example.com', weight: 10, healthy: true, errorCount: 0 },
      ],
    });

    const provider = selectProvider();
    expect(provider).toBeDefined();
    expect(provider?.url).toBe('https://rpc.example.com');
  });

  it('returns null when no healthy providers', () => {
    configureRPC({
      providers: [
        { url: 'https://down.example.com', weight: 10, healthy: false, errorCount: 10 },
      ],
    });

    expect(selectProvider()).toBeNull();
  });

  it('marks provider unhealthy after threshold errors', () => {
    configureRPC({
      providers: [
        { url: 'https://flaky.example.com', weight: 10, healthy: true, errorCount: 0 },
      ],
      circuitBreaker: { threshold: 3, resetTimeout: 30000 },
    });

    reportProviderError('https://flaky.example.com');
    reportProviderError('https://flaky.example.com');
    reportProviderError('https://flaky.example.com');

    const healthy = getHealthyProviders();
    expect(healthy).toHaveLength(0);
  });

  it('resets provider health on success', () => {
    configureRPC({
      providers: [
        { url: 'https://recovered.example.com', weight: 10, healthy: true, errorCount: 2 },
      ],
      circuitBreaker: { threshold: 3, resetTimeout: 30000 },
    });

    reportProviderSuccess('https://recovered.example.com');
    const healthy = getHealthyProviders();
    expect(healthy).toHaveLength(1);
  });
});
