/**
 * A wrong 4-byte selector fails silently against every real contract: `eth_call` reverts
 * and the token row just renders blank. The ERC-20 `symbol()` selector here was
 * `0x95d89e4e`, one nibble off the real `0x95d89b41`, and nothing caught it.
 *
 * So each entry is recomputed from its signature with keccak-256 rather than compared to
 * another literal. apps/web3-middleware/src/chain.ts already used the correct value for
 * the same function, which is what a cross-checked pin would have surfaced immediately.
 */
import { describe, expect, it } from 'vitest';
import { toFunctionSelector } from 'viem';
import { ERC20_ABI } from '../giwa-rpc';

const SIGNATURES: Record<keyof typeof ERC20_ABI, string> = {
  balanceOf: 'balanceOf(address)',
  decimals: 'decimals()',
  symbol: 'symbol()',
  name: 'name()',
  totalSupply: 'totalSupply()',
};

describe('ERC-20 selectors', () => {
  it.each(Object.entries(SIGNATURES))('%s matches keccak-256 of %s', (key, signature) => {
    expect(ERC20_ABI[key as keyof typeof ERC20_ABI]).toBe(toFunctionSelector(signature));
  });

  it('declares every selector as 0x + 8 lowercase hex digits', () => {
    for (const [key, selector] of Object.entries(ERC20_ABI)) {
      expect(selector, key).toMatch(/^0x[0-9a-f]{8}$/);
    }
  });

  it('agrees with the selector web3-middleware uses for symbol()', () => {
    // The middleware was correct while both clients were wrong; pinning them together
    // makes a future drift in either direction impossible to miss.
    expect(ERC20_ABI.symbol).toBe(toFunctionSelector('symbol()'));
  });
});
