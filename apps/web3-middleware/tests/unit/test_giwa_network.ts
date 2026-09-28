import { describe, it, expect, vi } from 'vitest';
import { getGiwaNetworkStats } from '../../src/giwa-network';
import * as rpc from '../../src/rpc';

describe('GIWA Network — live RPC', () => {
  it('throws if RPC unavailable', async () => {
    const spy = vi.spyOn(rpc, 'jsonRPCCall').mockRejectedValue(new Error('RPC down'));
    await expect(getGiwaNetworkStats(91342)).rejects.toThrow(/GIWA RPC unavailable/);
    spy.mockRestore();
  });

  it('returns live block and gas when RPC succeeds', async () => {
    const spy = vi.spyOn(rpc, 'jsonRPCCall').mockImplementation(async (method: string) => {
      if (method === 'eth_blockNumber') return { result: '0x1234', provider: 'mock' } as any;
      if (method === 'eth_gasPrice') return { result: '0x3b9aca00', provider: 'mock' } as any; // 1 gwei
      throw new Error('unknown');
    });
    // Mock explorer fetch to return null (no explorer data) — still should succeed with RPC data
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as any);

    const stats = await getGiwaNetworkStats(91342);
    expect(stats.latest_block).toBe((0x1234).toString());
    expect(stats.gas_avg_gwei).toBe('1.0000');
    expect(stats.chain_id).toBe(91342);

    spy.mockRestore();
    global.fetch = origFetch;
  });
});
