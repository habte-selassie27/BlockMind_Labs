import { describe, expect, it } from 'vitest';
import {
  MAX_UINT256,
  SELECTORS,
  calldataAddress,
  calldataWord,
  isApprovalSelector,
  isUnlimitedApproval,
  selectorOf,
} from '../src/safety/approvals';

const SPENDER = '70997970c51812dc3a010c7d01b50e0d17dc79c8';
const other = 'f39fd6e51aad88f6f4ce6ab8827279cfffb92266';

function word(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function approveCalldata(spender: string, amount: bigint): string {
  return `${SELECTORS.approve}${spender.padStart(64, '0')}${word(amount)}`;
}

describe('calldata primitives', () => {
  it('reads selectors and words', () => {
    const data = approveCalldata(SPENDER, 1_000_000n);
    expect(selectorOf(data)).toBe(SELECTORS.approve);
    expect(calldataWord(data, 1)).toBe(1_000_000n);
    expect(calldataAddress(data, 0)).toBe(`0x${SPENDER}`);
  });

  it('returns null for empty or missing calldata', () => {
    expect(selectorOf(undefined)).toBeNull();
    expect(selectorOf('0x')).toBeNull();
    expect(selectorOf('0x1234')).toBeNull();
  });

  it('identifies approval selectors', () => {
    expect(isApprovalSelector(SELECTORS.approve)).toBe(true);
    expect(isApprovalSelector(SELECTORS.increaseAllowance)).toBe(true);
    expect(isApprovalSelector(SELECTORS.transfer)).toBe(false);
    expect(isApprovalSelector(null)).toBe(false);
  });
});

describe('§12.3 unlimited approval detection', () => {
  it('flags approve(address, MAX_UINT256)', () => {
    expect(isUnlimitedApproval(approveCalldata(SPENDER, MAX_UINT256))).toBe(true);
  });

  it('does not flag an exact-amount approval', () => {
    expect(isUnlimitedApproval(approveCalldata(SPENDER, 1_000_000n))).toBe(false);
    expect(isUnlimitedApproval(approveCalldata(SPENDER, MAX_UINT256 - 1n))).toBe(false);
  });

  it('flags increaseAllowance(address, MAX_UINT256)', () => {
    const data = `${SELECTORS.increaseAllowance}${SPENDER.padStart(64, '0')}${word(MAX_UINT256)}`;
    expect(isUnlimitedApproval(data)).toBe(true);
  });

  it('treats setApprovalForAll(_, true) as blanket approval and false as revocation', () => {
    const granted = `${SELECTORS.setApprovalForAll}${SPENDER.padStart(64, '0')}${word(1n)}`;
    const revoked = `${SELECTORS.setApprovalForAll}${SPENDER.padStart(64, '0')}${word(0n)}`;
    expect(isUnlimitedApproval(granted)).toBe(true);
    expect(isUnlimitedApproval(revoked)).toBe(false);
  });

  it('never flags a plain transfer', () => {
    const data = `${SELECTORS.transfer}${other.padStart(64, '0')}${word(MAX_UINT256)}`;
    expect(isUnlimitedApproval(data)).toBe(false);
  });

  it('ignores empty calldata (a native transfer)', () => {
    expect(isUnlimitedApproval(undefined)).toBe(false);
    expect(isUnlimitedApproval('0x')).toBe(false);
  });
});
