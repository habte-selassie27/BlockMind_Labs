import { createMemoryStore } from '../src/lib/storage';
import type { ChainClient } from '../src/runtime/dispatcher';
import { VaultStore } from '../src/runtime/vault-store';
import type { ContractRisk, ScamShield } from '../src/safety/scamshield';

/** ABI-encodes a uint256 — `decimals()` and `balanceOf()` return shapes. */
export function abiUint(value: number | bigint): `0x${string}` {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

/** ABI-encodes a dynamic `string` — the `symbol()` return shape. */
export function abiString(text: string): `0x${string}` {
  const hex = [...text].map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
  return `0x${(32).toString(16).padStart(64, '0')}${text.length.toString(16).padStart(64, '0')}${padded}`;
}

export const TEST_CHAIN_ID = 91342;
export const TEST_PASSWORD = 'correct horse battery';
export const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';
export const HARDHAT_ACCOUNT_0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const HARDHAT_ACCOUNT_1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const DEFAULT_RESULTS: Record<string, unknown> = {
  eth_call: '0x',
  eth_estimateGas: '0x5208',
  eth_getBlockByNumber: { baseFeePerGas: '0x3b9aca00' },
  eth_getBalance: '0x0',
  eth_blockNumber: '0x1',
  eth_gasPrice: '0x3b9aca00',
  eth_maxPriorityFeePerGas: '0x3b9aca00',
};

/** Records every chain call so tests can assert what the wallet actually asked the node. */
export class FakeChain implements ChainClient {
  readonly calls: { method: string; params: unknown[] }[] = [];
  readonly sentRaw: string[] = [];
  private readonly responses = new Map<string, unknown>();
  private readonly failures = new Map<string, string>();
  private readonly callRoutes = new Map<string, string>();

  set(method: string, result: unknown): this {
    this.responses.set(method, result);
    return this;
  }

  /**
   * Routes `eth_call` by its leading 4-byte selector.
   *
   * A single `set('eth_call', …)` cannot answer `symbol()`, `decimals()` and
   * `balanceOf()` at once, which is what ERC-20 support needs.
   */
  setCallRoute(selector: string, result: `0x${string}`): this {
    this.callRoutes.set(selector.toLowerCase(), result);
    return this;
  }

  fail(method: string, message: string): this {
    this.failures.set(method, message);
    return this;
  }

  wasCalled(method: string): boolean {
    return this.calls.some((call) => call.method === method);
  }

  private async respond<T>(method: string, params: unknown[], fallback: T): Promise<T> {
    this.calls.push({ method, params });
    const failure = this.failures.get(method);
    if (failure) throw new Error(failure);

    if (method === 'eth_call' && this.callRoutes.size > 0) {
      const data = (params[0] as { data?: string } | undefined)?.data;
      const routed = typeof data === 'string' ? this.callRoutes.get(data.slice(0, 10).toLowerCase()) : undefined;
      if (routed !== undefined) return routed as T;
    }

    if (this.responses.has(method)) return this.responses.get(method) as T;
    return fallback;
  }

  call<T>(chainId: number, method: string, params: unknown[]): Promise<T> {
    void chainId;
    return this.respond<T>(method, params, DEFAULT_RESULTS[method] as T);
  }

  getCode(chainId: number, address: string): Promise<`0x${string}`> {
    void chainId;
    return this.respond('eth_getCode', [address], '0x' as `0x${string}`);
  }

  getTransactionCount(chainId: number, address: string): Promise<`0x${string}`> {
    void chainId;
    // Records the block tag it was asked for (`pending`), which matters for nonces.
    return this.respond('eth_getTransactionCount', [address, 'pending'], '0x0' as `0x${string}`);
  }

  getGasPrice(chainId: number): Promise<`0x${string}`> {
    void chainId;
    return this.respond('eth_gasPrice', [], '0x3b9aca00' as `0x${string}`);
  }

  getMaxPriorityFeePerGas(chainId: number): Promise<`0x${string}`> {
    void chainId;
    return this.respond('eth_maxPriorityFeePerGas', [], '0x3b9aca00' as `0x${string}`);
  }

  sendRawTransaction(chainId: number, raw: `0x${string}`): Promise<`0x${string}`> {
    void chainId;
    this.sentRaw.push(raw);
    return this.respond('eth_sendRawTransaction', [raw], `0x${'ab'.repeat(32)}` as `0x${string}`);
  }
}

export interface TestVault {
  store: VaultStore;
  local: ReturnType<typeof createMemoryStore>;
  session: ReturnType<typeof createMemoryStore>;
  advance(ms: number): void;
}

export function createTestVault(startTime = 1_700_000_000_000): TestVault {
  const local = createMemoryStore();
  const session = createMemoryStore();
  let now = startTime;

  return {
    store: new VaultStore({ local, session, now: () => now }),
    local,
    session,
    advance(ms: number) {
      now += ms;
    },
  };
}

export interface FakeScamShield {
  shield: ScamShield;
  /** Addresses the wallet asked about. */
  checked: string[];
  /** Addresses skipped because the user already trusts them (§12.4). */
  trustedSkips: string[];
}

export function fakeScamShield(risk: ContractRisk): FakeScamShield {
  const checked: string[] = [];
  const trustedSkips: string[] = [];
  return {
    checked,
    trustedSkips,
    shield: {
      async check(address: string, _chainId: number, options): Promise<ContractRisk> {
        if (options?.trusted) {
          trustedSkips.push(address);
          return { status: 'trusted' };
        }
        checked.push(address);
        return risk;
      },
    },
  };
}
