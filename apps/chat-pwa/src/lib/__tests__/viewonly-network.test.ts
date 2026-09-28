import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS } from '../chains';
import type { TokenInfo } from '../giwa-rpc';

vi.mock('../price-feeds', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../price-feeds')>();
  return {
    ...mod,
    getTokenPrices: vi.fn<typeof mod.getTokenPrices>(),
  };
});

vi.mock('../giwa-rpc', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../giwa-rpc')>();
  return {
    ...mod,
    getTokenBalances: vi.fn<typeof mod.getTokenBalances>(),
  };
});

import { getFallbackPrice, getTokenPrices } from '../price-feeds';
import { getTokenBalances } from '../giwa-rpc';
import {
  fetchActivity,
  fetchBalanceSeries,
  fetchNativeBalances,
  fetchNfts,
  fetchRisk,
  fetchTokenRows,
} from '../viewonly';

const OWNER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const WEI_1ETH = '0xde0b6b3a7640000';

/** String argument encoded as a standard ABI `string` return value. */
function abiEncodeString(value: string): string {
  const bytes = Array.from(value)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  const offset = '0'.repeat(62) + '20';
  const length = value.length.toString(16).padStart(64, '0');
  const data = bytes.padEnd(64, '0');
  return `0x${offset}${length}${data}`;
}

type JsonRpcCall = { method: string; params: unknown[] };
type Route = { body: unknown; ok?: boolean };

/**
 * Installs a fake `fetch`:
 * - `/api/...` URLs are answered from `routes` (prefix match)
 * - anything else is treated as a JSON-RPC POST and handed to `rpc`
 */
function installFetch(rpc: (call: JsonRpcCall, url: string) => unknown, routes: Record<string, Route> = {}) {
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/')) {
      const key = Object.keys(routes).find((k) => url.startsWith(k));
      if (!key || routes[key].ok === false) {
        return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
      }
      return { ok: true, status: 200, json: async () => routes[key].body };
    }
    const call = JSON.parse(String(init?.body ?? '{}')) as JsonRpcCall;
    const result = rpc(call, url);
    return { ok: true, status: 200, json: async () => ({ result }) };
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
  );
  vi.mocked(getTokenPrices).mockReset();
  vi.mocked(getTokenPrices).mockResolvedValue(
    new Map([
      [
        'WETH',
        { symbol: 'WETH', price: 2000, change24h: 0, confidence: 1, source: 'test' },
      ],
    ]),
  );
  vi.mocked(getTokenBalances).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchNativeBalances', () => {
  it('returns an ok row per supported chain with USD values', async () => {
    installFetch(() => WEI_1ETH);

    const rows = await fetchNativeBalances(OWNER);

    expect(rows).toHaveLength(SUPPORTED_CHAINS.length);
    expect(rows.every((r) => r.ok)).toBe(true);

    const giwa = rows.find((r) => r.chainId === 91342);
    expect(giwa?.balance).toBe(1);
    expect(giwa?.usd).toBeCloseTo(getFallbackPrice('GIWA'), 6);

    const ethChain = rows.find((r) => r.symbol === 'ETH');
    expect(ethChain?.usd).toBeCloseTo(2000, 6);
  });

  it('marks chains as failed when the RPC rejects', async () => {
    let call = 0;
    installFetch(() => {
      call += 1;
      if (call === 1) throw new Error('rpc down');
      return WEI_1ETH;
    });

    const rows = await fetchNativeBalances(OWNER);

    expect(rows).toHaveLength(SUPPORTED_CHAINS.length);
    expect(rows[0].ok).toBe(false);
    expect(rows[0].balance).toBe(0);
    expect(rows.slice(1).every((r) => r.ok)).toBe(true);
  });
});

describe('fetchTokenRows', () => {
  it('returns native + ERC-20 rows and totals USD on GIWA Sepolia', async () => {
    installFetch(() => WEI_1ETH);
    vi.mocked(getTokenBalances).mockResolvedValue([
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        balance: '5.5',
        balanceRaw: 5_500_000n,
      },
    ] satisfies TokenInfo[]);

    const { rows, totalUsd } = await fetchTokenRows(OWNER, 91342);

    expect(rows[0]).toMatchObject({ symbol: 'GIWA', native: true, balance: 1 });
    expect(rows[0].usd).toBeCloseTo(getFallbackPrice('GIWA'), 6);

    const usdc = rows.find((r) => r.symbol === 'USDC');
    expect(usdc).toMatchObject({ balance: 5.5, native: false });
    expect(usdc?.usd).toBeCloseTo(5.5, 6);
    expect(totalUsd).toBeCloseTo(rows.reduce((s, r) => s + r.usd, 0), 6);
  });

  it('still returns the native row when token discovery fails', async () => {
    installFetch(() => WEI_1ETH);
    vi.mocked(getTokenBalances).mockRejectedValue(new Error('multicall down'));

    const { rows, totalUsd } = await fetchTokenRows(OWNER, 91342);

    expect(rows).toHaveLength(1);
    expect(rows[0].native).toBe(true);
    expect(totalUsd).toBeCloseTo(rows[0].usd, 6);
  });

  it('does not query ERC-20 balances on non-GIWA-Sepolia chains', async () => {
    installFetch(() => WEI_1ETH);

    const { rows } = await fetchTokenRows(OWNER, 421614);

    expect(rows).toHaveLength(1);
    expect(rows[0].native).toBe(true);
    expect(getTokenBalances).not.toHaveBeenCalled();
  });
});

describe('fetchNfts', () => {
  it('discovers ERC-721 holdings from transfer logs', async () => {
    const contract = '0x1111111111111111111111111111111111111111';
    installFetch((call) => {
      if (call.method === 'eth_blockNumber') return '0x2710';
      if (call.method === 'eth_getLogs') return [{ address: contract }];
      if (call.method === 'eth_call') {
        const data = (call.params[0] as { data: string }).data;
        if (data.startsWith('0x70a08231')) return '0x2';
        if (data.startsWith('0x06fdde03')) return abiEncodeString('Cool Cats');
      }
      throw new Error(`unexpected method ${call.method}`);
    });

    const items = await fetchNfts(OWNER, 91342);

    expect(items).toEqual([{ contract, balance: 2, name: 'Cool Cats' }]);
  });

  it('returns nothing when the log scan fails', async () => {
    installFetch((call) => {
      if (call.method === 'eth_blockNumber') return '0x2710';
      throw new Error('logs unavailable');
    });

    expect(await fetchNfts(OWNER, 91342)).toEqual([]);
  });

  it('returns nothing for an unknown chain', async () => {
    installFetch(() => '0x0');
    expect(await fetchNfts(OWNER, 999999)).toEqual([]);
  });
});

describe('fetchActivity', () => {
  it('normalises middleware transactions with direction', async () => {
    const txs = [
      {
        hash: '0xabc',
        from: '0x0000000000000000000000000000000000000001',
        to: OWNER,
        value: '1000000000000000000',
        status: 'ok',
        timestamp: 1700000000,
        method: 'transfer',
      },
    ];
    installFetch(() => '0x0', { '/api/giwa/recent-txs/': { body: { txs } } });

    const rows = await fetchActivity(OWNER, 91342, 10);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hash: '0xabc',
      direction: 'in',
      valueWei: '1000000000000000000',
      method: 'transfer',
    });
    expect(rows[0].timestamp).toBe(1700000000 * 1000);
  });

  it('returns an empty list when the endpoint fails', async () => {
    installFetch(() => '0x0', { '/api/giwa/recent-txs/': { body: {}, ok: false } });
    expect(await fetchActivity(OWNER, 91342)).toEqual([]);
  });

  it('returns an empty list on network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await fetchActivity(OWNER, 91342)).toEqual([]);
  });
});

describe('fetchRisk', () => {
  it('maps explorer risk fields into RiskInfo', async () => {
    installFetch(() => '0x0', {
      '/api/explorer/address/': {
        body: {
          risk: 'low',
          is_contract: true,
          is_verified: false,
          summary: 'No issues found',
          tx_count: 42,
        },
      },
    });

    const risk = await fetchRisk(OWNER, 91342);

    expect(risk).toEqual({
      risk: 'LOW',
      isContract: true,
      isVerified: false,
      summary: 'No issues found',
      txCount: 42,
      explorer: undefined,
    });
  });

  it('normalises out-of-range risk labels to UNKNOWN', async () => {
    installFetch(() => '0x0', {
      '/api/explorer/address/': { body: { risk: 'suspicious', summary: '' } },
    });

    expect((await fetchRisk(OWNER, 91342))?.risk).toBe('UNKNOWN');
  });

  it('returns null when the explorer errors', async () => {
    installFetch(() => '0x0', {
      '/api/explorer/address/': { body: { error: { code: 'X' } } },
    });
    expect(await fetchRisk(OWNER, 91342)).toBeNull();
  });
});

describe('fetchBalanceSeries', () => {
  it('samples historical blocks newest-last and descends', async () => {
    installFetch((call) => {
      if (call.method === 'eth_blockNumber') return '0x186a0'; // 100000
      if (call.method === 'eth_getBalance') {
        const block = Number(BigInt(String(call.params[1])));
        return `0x${(BigInt(block) * 10n ** 12n).toString(16)}`;
      }
      throw new Error(`unexpected method ${call.method}`);
    });

    const series = await fetchBalanceSeries(OWNER, 91342, 4);

    expect(series).toHaveLength(4);
    expect(series[0].block).toBeLessThan(series[3].block);
    for (const point of series) expect(point.balance).toBeGreaterThan(0);
  });

  it('drops blocks whose balance query fails', async () => {
    let call = 0;
    installFetch((c) => {
      if (c.method === 'eth_blockNumber') return '0x186a0';
      call += 1;
      if (call === 1) throw new Error('block pruned');
      return WEI_1ETH;
    });

    const series = await fetchBalanceSeries(OWNER, 91342, 4);

    expect(series).toHaveLength(3);
  });

  it('returns an empty series for an unknown chain', async () => {
    installFetch(() => '0x0');
    expect(await fetchBalanceSeries(OWNER, 999999)).toEqual([]);
  });
});

// ✅ COMPLIES WITH: AGENTS.md §11, §12.1 (read-only JSON-RPC + middleware mocks, no live network)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
