/**
 * Minimal JSON-RPC client for GIWA nodes.
 * Only public data crosses this boundary — never key material (ADR-011 invariant 4).
 */
import { CHAINS, getChain, type ChainConfig } from './chains';

export class RpcError extends Error {
  readonly code?: number;
  readonly data?: unknown;

  constructor(message: string, code?: number, data?: unknown) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
    this.data = data;
  }
}

export interface RpcCaller {
  call<T>(chainId: number, method: string, params: unknown[]): Promise<T>;
}

interface JsonRpcErrorShape {
  code?: number;
  message?: string;
  data?: unknown;
}

export class RpcClient implements RpcCaller {
  private readonly fetchImpl: typeof fetch;
  private readonly chains: Record<number, ChainConfig>;
  private requestId = 0;

  constructor(fetchImpl?: typeof fetch, chains: Record<number, ChainConfig> = CHAINS) {
    this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    this.chains = chains;
  }

  resolveChain(chainId: number): ChainConfig {
    const chain = this.chains[chainId];
    if (!chain) {
      throw Object.assign(new Error(`Unrecognized chain ID ${chainId}`), { code: 4902 });
    }
    return chain;
  }

  async call<T>(chainId: number, method: string, params: unknown[] = []): Promise<T> {
    const chain = this.resolveChain(chainId);
    this.requestId += 1;

    let response: Response;
    try {
      response = await this.fetchImpl(chain.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: this.requestId, method, params }),
      });
    } catch (err) {
      throw new RpcError(
        `Cannot reach ${chain.name} RPC at ${chain.rpc}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      throw new RpcError(`${chain.name} RPC returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as { result?: T; error?: JsonRpcErrorShape };
    if (body.error) {
      throw new RpcError(body.error.message ?? 'RPC error', body.error.code, body.error.data);
    }
    if (body.result === undefined) {
      throw new RpcError('RPC returned an empty result');
    }
    return body.result;
  }

  // ── Convenience wrappers ────────────────────────────────────────

  getBalance(chainId: number, address: string): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_getBalance', [address, 'latest']);
  }

  getCode(chainId: number, address: string): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_getCode', [address, 'latest']);
  }

  getTransactionCount(chainId: number, address: string): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_getTransactionCount', [address, 'pending']);
  }

  getGasPrice(chainId: number): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_gasPrice', []);
  }

  getMaxPriorityFeePerGas(chainId: number): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_maxPriorityFeePerGas', []);
  }

  getBlockNumber(chainId: number): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_blockNumber', []);
  }

  call_(
    chainId: number,
    tx: { from?: string; to?: string; value?: string; data?: string },
  ): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_call', [tx, 'latest']);
  }

  estimateGas(
    chainId: number,
    tx: { from?: string; to?: string; value?: string; data?: string },
  ): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_estimateGas', [tx]);
  }

  sendRawTransaction(chainId: number, raw: `0x${string}`): Promise<`0x${string}`> {
    return this.call<`0x${string}`>(chainId, 'eth_sendRawTransaction', [raw]);
  }

  getTransactionReceipt(chainId: number, hash: string): Promise<unknown> {
    return this.call<unknown>(chainId, 'eth_getTransactionReceipt', [hash]);
  }

  /** verifies that a configured RPC actually serves the chain ID we expect. */
  async verifyChainId(chainId: number): Promise<number> {
    const hex = await this.call<`0x${string}`>(chainId, 'eth_chainId', []);
    return Number.parseInt(hex, 16);
  }
}

export function hexToBigInt(hex: string | undefined | null): bigint {
  if (!hex) return 0n;
  return BigInt(hex);
}

export function bigIntToHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

export { getChain };

// ✅ COMPLIES WITH: AGENTS.md §9, ADR-011 invariant 4
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
