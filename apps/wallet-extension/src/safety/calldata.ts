/**
 * Calldata decoding for the confirmation screen (§12.2).
 *
 * The user must be told what they are approving in plain language, so an opaque
 * selector like 0xa9059cbb is never shown on its own.
 */
import { calldataAddress, calldataWord, isUnlimitedApproval, selectorOf, SELECTORS } from './approvals';

export type DecodedCall =
  | { kind: 'nativeTransfer'; to: string; value: bigint; summary: string }
  | { kind: 'contractDeploy'; summary: string }
  | { kind: 'transfer'; token: string | null; to: string; amount: bigint; decimals: number; symbol: string; summary: string }
  | {
      kind: 'transferFrom';
      token: string | null;
      from: string;
      to: string;
      amount: bigint;
      decimals: number;
      symbol: string;
      summary: string;
    }
  | {
      kind: 'approve' | 'increaseAllowance';
      token: string | null;
      spender: string;
      amount: bigint;
      unlimited: boolean;
      decimals: number;
      symbol: string;
      summary: string;
    }
  | { kind: 'setApprovalForAll'; token: string | null; operator: string; approved: boolean; summary: string }
  | { kind: 'contractCall'; token: string | null; selector: string; summary: string };

export interface DecodeInput {
  to?: string;
  data?: string;
  value?: bigint;
  /** Token metadata resolved on-chain by the caller, when the target is a token. */
  symbol?: string;
  decimals?: number;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address || 'unknown';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0';
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  if (fraction === 0n) return `${negative ? '-' : ''}${whole.toString()}`;

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  const trimmed = fractionText.length > 8 ? fractionText.slice(0, 8) : fractionText;
  return `${negative ? '-' : ''}${whole.toString()}.${trimmed}`;
}

export function formatNativeAmount(amount: bigint, decimals = 18): string {
  return `${formatTokenAmount(amount, decimals)} GIWA`;
}

/** Wei-scale value, trimmed for a non-technical reader. */
export function describeAmount(amount: bigint, symbol: string, decimals: number): string {
  return `${formatTokenAmount(amount, decimals)} ${symbol}`;
}

export function decodeCall(input: DecodeInput): DecodedCall {
  const value = input.value ?? 0n;
  const decimals = input.decimals ?? 18;
  const symbol = input.symbol ?? 'TOKEN';
  const token = input.to ?? null;
  const data = input.data;

  // No recipient means the transaction deploys a contract.
  if (!input.to) return { kind: 'contractDeploy', summary: 'Deploy a new contract' };

  if (!data || data === '0x' || data.length < 10) {
    return {
      kind: 'nativeTransfer',
      to: input.to,
      value,
      summary: `Send ${formatNativeAmount(value)} to ${shortAddress(input.to)}`,
    };
  }

  const selector = selectorOf(data);
  if (selector === null) {
    return { kind: 'contractCall', token, selector: '0x', summary: `Call contract ${shortAddress(token ?? '')}` };
  }

  switch (selector) {
    case SELECTORS.transfer: {
      const to = calldataAddress(data, 0);
      const amount = calldataWord(data, 1);
      return {
        kind: 'transfer',
        token,
        to,
        amount,
        decimals,
        symbol,
        summary: `Send ${describeAmount(amount, symbol, decimals)} to ${shortAddress(to)}`,
      };
    }
    case SELECTORS.transferFrom: {
      const from = calldataAddress(data, 0);
      const to = calldataAddress(data, 1);
      const amount = calldataWord(data, 2);
      return {
        kind: 'transferFrom',
        token,
        from,
        to,
        amount,
        decimals,
        symbol,
        summary: `Move ${describeAmount(amount, symbol, decimals)} from ${shortAddress(from)} to ${shortAddress(to)}`,
      };
    }
    case SELECTORS.approve:
    case SELECTORS.increaseAllowance: {
      const spender = calldataAddress(data, 0);
      const amount = calldataWord(data, 1);
      const unlimited = isUnlimitedApproval(data);
      return {
        kind: selector === SELECTORS.approve ? 'approve' : 'increaseAllowance',
        token,
        spender,
        amount,
        unlimited,
        decimals,
        symbol,
        summary: unlimited
          ? `Grant UNLIMITED ${symbol} access to ${shortAddress(spender)}`
          : `Allow ${shortAddress(spender)} to spend ${describeAmount(amount, symbol, decimals)}`,
      };
    }
    case SELECTORS.setApprovalForAll: {
      const operator = calldataAddress(data, 0);
      const approved = calldataWord(data, 1) === 1n;
      return {
        kind: 'setApprovalForAll',
        token,
        operator,
        approved,
        summary: approved
          ? `Grant ${shortAddress(operator)} control of ALL your items in this collection`
          : `Revoke ${shortAddress(operator)}'s control of this collection`,
      };
    }
    default:
      return {
        kind: 'contractCall',
        token,
        selector,
        summary: `Call function ${selector} on ${shortAddress(token ?? '')} — arguments cannot be decoded, review the raw data`,
      };
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.2, §12.3
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
