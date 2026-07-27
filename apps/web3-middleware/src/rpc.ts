export interface RPCProvider {
  url: string;
  weight: number;
  healthy: boolean;
  lastError?: string;
  errorCount: number;
}

export interface RPCConfig {
  providers: RPCProvider[];
  circuitBreaker: {
    threshold: number;
    resetTimeout: number;
  };
  timeout: number;
  retries: number;
}

// Simple circuit breaker per provider
class ProviderCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();

  recordFailure(url: string): void {
    const count = (this.failures.get(url) || 0) + 1;
    this.failures.set(url, count);
    this.lastFailure.set(url, Date.now());
  }

  reset(url: string): void {
    this.failures.set(url, 0);
  }

  isOpen(url: string, threshold: number, resetTimeout: number): boolean {
    const count = this.failures.get(url) || 0;
    if (count < threshold) return false;
    const lastFail = this.lastFailure.get(url) || 0;
    return Date.now() - lastFail < resetTimeout;
  }
}

const breakers = new ProviderCircuitBreaker();

let rpcConfig: RPCConfig = {
  providers: [
    { url: process.env.GIWA_RPC_URL || 'https://sepolia-rpc.giwa.io', weight: 10, healthy: true, errorCount: 0 },
  ],
  circuitBreaker: { threshold: 3, resetTimeout: 30_000 },
  timeout: 8_000,
  retries: 2,
};

export function configureRPC(config: Partial<RPCConfig>): void {
  rpcConfig = { ...rpcConfig, ...config };
}

export function getHealthyProviders(): RPCProvider[] {
  return rpcConfig.providers.filter(
    (p) => p.healthy && !breakers.isOpen(p.url, rpcConfig.circuitBreaker.threshold, rpcConfig.circuitBreaker.resetTimeout)
  );
}

export function selectProvider(): RPCProvider | null {
  const healthy = getHealthyProviders();
  if (healthy.length === 0) return null;

  // Weighted random selection
  const totalWeight = healthy.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  for (const provider of healthy) {
    random -= provider.weight;
    if (random <= 0) return provider;
  }
  return healthy[0];
}

export function reportProviderError(url: string): void {
  const provider = rpcConfig.providers.find((p) => p.url === url);
  if (provider) {
    provider.errorCount++;
    breakers.recordFailure(url);
    if (provider.errorCount >= rpcConfig.circuitBreaker.threshold) {
      provider.healthy = false;
    }
  }
}

export function reportProviderSuccess(url: string): void {
  const provider = rpcConfig.providers.find((p) => p.url === url);
  if (provider) {
    provider.errorCount = 0;
    provider.healthy = true;
    breakers.reset(url);
  }
}

// JSON-RPC call helper
export async function jsonRPCCall(
  method: string,
  params: unknown[] = []
): Promise<{ result: unknown; provider: string }> {
  const provider = selectProvider();
  if (!provider) {
    throw new Error('No healthy RPC providers available');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), rpcConfig.timeout);

    const response = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (data.error) {
      reportProviderError(provider.url);
      throw new Error(`RPC error: ${data.error.message}`);
    }

    reportProviderSuccess(provider.url);
    return { result: data.result, provider: provider.url };
  } catch (err) {
    reportProviderError(provider.url);
    throw err;
  }
}

export function getRPCConfig(): RPCConfig {
  return { ...rpcConfig };
}

// ✅ COMPLIES WITH: ARCHITECTURE.md §3.4
// ✅ SERVICE: web3-middleware
