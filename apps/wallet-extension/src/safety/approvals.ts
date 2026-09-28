/**
 * AGENTS.md §12.3 — no MAX_UINT256 approvals.
 *
 * `approve_token` must always use the exact required amount. An unlimited approval is
 * allowed only when the request explicitly carries `allow_unlimited: true`, and the
 * user must still be shown a warning and acknowledge it.
 */

export const MAX_UINT256 = (1n << 256n) - 1n;

export const SELECTORS = {
  /** approve(address,uint256) */
  approve: '0x095ea7b3',
  /** increaseAllowance(address,uint256) */
  increaseAllowance: '0x39509351',
  /** transfer(address,uint256) */
  transfer: '0xa9059cbb',
  /** transferFrom(address,address,uint256) */
  transferFrom: '0x23b872dd',
  /** setApprovalForAll(address,bool) — NFT blanket approval, same class of risk */
  setApprovalForAll: '0xa22cb465',
} as const;

export const APPROVAL_SELECTORS: readonly string[] = [
  SELECTORS.approve,
  SELECTORS.increaseAllowance,
  SELECTORS.setApprovalForAll,
];

export function selectorOf(data: string | undefined): string | null {
  if (!data || data === '0x' || data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

/**
 * Arguments start after the `0x` prefix (2 chars) and the selector (8 chars), so the
 * first word begins at index 10 — not 8.
 */
const ARGS_OFFSET = 10;

/** Reads the i-th 32-byte word of ABI calldata (zero-indexed, after the selector). */
export function calldataWord(data: string, index: number): bigint {
  const start = ARGS_OFFSET + index * 64;
  const word = data.slice(start, start + 64);
  if (word.length !== 64) return 0n;
  return BigInt(`0x${word}`);
}

/** Reads the i-th address argument of ABI calldata. */
export function calldataAddress(data: string, index: number): string {
  const start = ARGS_OFFSET + index * 64;
  const word = data.slice(start, start + 64);
  if (word.length !== 64) return '0x';
  return `0x${word.slice(24)}`;
}

export function isApprovalSelector(selector: string | null): boolean {
  return selector !== null && APPROVAL_SELECTORS.includes(selector);
}

/**
 * True when calldata grants an unbounded allowance.
 * `setApprovalForAll(_, true)` is treated as unbounded too — it is strictly broader.
 */
export function isUnlimitedApproval(data: string | undefined): boolean {
  const selector = selectorOf(data);
  if (selector === null || !data) return false;

  if (selector === SELECTORS.setApprovalForAll) {
    return calldataWord(data, 1) === 1n;
  }
  if (selector === SELECTORS.approve || selector === SELECTORS.increaseAllowance) {
    return calldataWord(data, 1) === MAX_UINT256;
  }
  return false;
}

export function unlimitedApprovalWarning(spender: string): string {
  return (
    `This grants ${spender} unlimited access to your token balance. ` +
    'A malicious or compromised contract could drain that token at any time, without another prompt.'
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.3
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
