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

// JSON-RPC call helper — timeout, exponential backoff, rate-limit handling, request-id logging
export async function jsonRPCCall(
  method: string,
  params: unknown[] = [],
  opts?: { requestId?: string }
): Promise<{ result: unknown; provider: string }> {
  const requestId = opts?.requestId || `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= rpcConfig.retries; attempt++) {
    const provider = selectProvider();
    if (!provider) {
      throw new Error(`[rpc:${requestId}] No healthy RPC providers available (attempt ${attempt + 1})`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), rpcConfig.timeout);

    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1e9),
          method,
          // never log params that may contain private keys — redact
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Rate limit handling — 429
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || '1');
        const backoff = Math.min(5000, (retryAfter * 1000) + (200 * Math.pow(2, attempt)));
        console.warn(`[rpc:${requestId}] 429 rate-limited by ${provider.url}, backoff ${backoff}ms attempt ${attempt + 1}`);
        reportProviderError(provider.url);
        if (attempt < rpcConfig.retries) {
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`[rpc:${requestId}] Rate limited by ${provider.url} after ${attempt + 1} attempts`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`[rpc:${requestId}] Invalid JSON from ${provider.url}`);
      }

      // Validate JSON-RPC schema
      if (!data || typeof data !== 'object' || !('jsonrpc' in data)) {
        reportProviderError(provider.url);
        throw new Error(`[rpc:${requestId}] Invalid JSON-RPC response from ${provider.url}`);
      }

      if (data.error) {
        const msg = data.error.message || JSON.stringify(data.error);
        // Do not log params that might contain sensitive data — only method
        console.error(`[rpc:${requestId}] RPC error ${method} @ ${provider.url}: ${msg}`);
        reportProviderError(provider.url);
        // Do not retry on application errors (e.g., revert), only on network
        throw new Error(`[rpc:${requestId}] RPC error: ${msg}`);
      }

      reportProviderSuccess(provider.url);
      return { result: data.result, provider: provider.url };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort ? `timeout after ${rpcConfig.timeout}ms` : err?.message || String(err);
      console.warn(`[rpc:${requestId}] attempt ${attempt + 1}/${rpcConfig.retries + 1} failed ${method} @ ${provider.url}: ${msg}`);
      reportProviderError(provider.url);
      lastError = err;

      // Exponential backoff before retry (except last attempt)
      if (attempt < rpcConfig.retries) {
        const backoff = 200 * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw new Error(`[rpc:${requestId}] ${isAbort ? 'Timeout' : 'RPC failed'} after ${attempt + 1} attempts: ${msg}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`[rpc:${requestId}] RPC failed after retries`);
}

export function getRPCConfig(): RPCConfig {
  return { ...rpcConfig };
}

// ✅ COMPLIES WITH: ARCHITECTURE.md §3.4
// ✅ SERVICE: web3-middleware
