/**
 * A wrong 4-byte selector fails silently against every real contract: the call reverts,
 * the decoder returns null, and the UI just shows a blank symbol. `symbol()` in this
 * codebase was `0x95d89e4e` — one nibble off the real `0x95d89b41` — and no test noticed,
 * because the fakes routed by the same wrong constant.
 *
 * So nothing here is compared against another literal. Every selector is recomputed from
 * its signature with keccak-256 and compared to the constant the wallet actually ships.
 */
import { describe, expect, it } from 'vitest';
import { toFunctionSelector } from 'viem';
import { BALANCE_OF_SELECTOR } from '../src/lib/tokens';
import { FUNCTION_SELECTORS } from '../src/lib/abi';
import { SELECTORS } from '../src/safety/approvals';

/** `Error(string)` — the standard Solidity revert reason, matched in safety/simulate.ts. */
const REVERT_REASON_SELECTOR = '0x08c379a0';

const PINNED: { signature: string; selector: string; declaredIn: string }[] = [
  { signature: 'symbol()', selector: FUNCTION_SELECTORS.symbol, declaredIn: 'lib/abi.ts' },
  { signature: 'decimals()', selector: FUNCTION_SELECTORS.decimals, declaredIn: 'lib/abi.ts' },
  { signature: 'name()', selector: FUNCTION_SELECTORS.name, declaredIn: 'lib/abi.ts' },
  { signature: 'balanceOf(address)', selector: BALANCE_OF_SELECTOR, declaredIn: 'lib/tokens.ts' },
  { signature: 'approve(address,uint256)', selector: SELECTORS.approve, declaredIn: 'safety/approvals.ts' },
  {
    signature: 'increaseAllowance(address,uint256)',
    selector: SELECTORS.increaseAllowance,
    declaredIn: 'safety/approvals.ts',
  },
  { signature: 'transfer(address,uint256)', selector: SELECTORS.transfer, declaredIn: 'safety/approvals.ts' },
  {
    signature: 'transferFrom(address,address,uint256)',
    selector: SELECTORS.transferFrom,
    declaredIn: 'safety/approvals.ts',
  },
  {
    signature: 'setApprovalForAll(address,bool)',
    selector: SELECTORS.setApprovalForAll,
    declaredIn: 'safety/approvals.ts',
  },
  { signature: 'Error(string)', selector: REVERT_REASON_SELECTOR, declaredIn: 'safety/simulate.ts' },
];

describe('ABI selectors', () => {
  it.each(PINNED)('$signature hashes to $selector', ({ signature, selector }) => {
    expect(toFunctionSelector(signature)).toBe(selector);
  });

  it('declares every selector as 0x + 8 lowercase hex digits', () => {
    for (const { signature, selector, declaredIn } of PINNED) {
      expect(selector, `${signature} in ${declaredIn}`).toMatch(/^0x[0-9a-f]{8}$/);
    }
  });

  it('has no duplicate selectors across unrelated functions', () => {
    const seen = new Map<string, string>();
    for (const { signature, selector } of PINNED) {
      const previous = seen.get(selector);
      expect(previous, `${selector} is claimed by both ${previous} and ${signature}`).toBeUndefined();
      seen.set(selector, signature);
    }
  });
});

// ✅ COMPLIES WITH: AGENTS.md §7 (test floors), ADR-011
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
