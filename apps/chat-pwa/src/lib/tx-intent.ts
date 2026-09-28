/**
 * Turns an agent confirmation into a transaction the connected wallet can actually sign.
 *
 * `agent-runtime` describes *what* the user asked for — an action plus its arguments — and
 * deliberately does not build calldata. The chat used to fill that gap with a hard-coded
 * `value: '0x0', data: '0x'`, so a connected wallet was always asked to sign an empty,
 * zero-value transfer. The wallet's own confirmation window then showed something
 * different from the summary the user had just approved in the chat, and nothing moved
 * on-chain.
 *
 * Calldata is encoded with viem's `erc20Abi` rather than by hand, so the encoder here and
 * the decoder inside the wallet cannot disagree about argument order or offsets.
 *
 * It returns `{ ok: false, reason }` instead of guessing. Signing a transaction that does
 * not match what the user approved is worse than signing nothing (§12.2).
 */
import { encodeFunctionData, erc20Abi, getAddress, isAddress, parseUnits } from 'viem';
import { GIWA_TOKENS, type KnownToken } from './giwa-rpc';

/** GIWA's native asset is represented by the zero address in `GIWA_TOKENS`. */
export const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000';

/**
 * A type alias (not an interface) so it stays assignable to `Record<string, unknown>`,
 * which is what `wallet.signAndSend` hands to the EIP-1193 provider.
 */
export type SignableTransaction = {
  from: string;
  to: string;
  value: `0x${string}`;
  data: `0x${string}`;
  chainId: `0x${string}`;
};

export type BuildResult = { ok: true; tx: SignableTransaction } | { ok: false; reason: string };

export interface BuildInput {
  from: string | null | undefined;
  chainId: number | null | undefined;
  summary: Record<string, unknown>;
}

/** Actions that send value to a recipient. */
const TRANSFER_ACTIONS = new Set(['transfer', 'transfer_tokens', 'transfer_token', 'send', 'send_tokens', 'send_token']);
/** Actions that grant an allowance. */
const APPROVE_ACTIONS = new Set(['approve', 'approve_token', 'increase_allowance']);

const NATIVE_SYMBOLS = new Set(['giwa', 'native', 'eth']);

const DEFAULT_CHAIN_ID = 91342;

interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Resolves a token symbol or address; null when the token's decimals are unknown. */
export function resolveToken(value: unknown): TokenInfo | null {
  const raw = text(value);
  const needle = raw.toLowerCase();

  if (!raw || needle === NATIVE_SENTINEL || NATIVE_SYMBOLS.has(needle)) {
    return { address: NATIVE_SENTINEL, symbol: 'GIWA', decimals: 18 };
  }

  const known: KnownToken | undefined = GIWA_TOKENS.find(
    (token) => token.symbol.toLowerCase() === needle || token.address.toLowerCase() === needle,
  );
  if (known) return { address: known.address, symbol: known.symbol, decimals: known.decimals };

  // An unknown token cannot be encoded: without its decimals, any amount we wrote would
  // be off by a power of ten and silently wrong.
  return null;
}

function amountToBaseUnits(amount: string, decimals: number): bigint | null {
  if (!amount) return null;

  // viem's parseUnits *rounds* digits beyond `decimals` instead of failing, so
  // "1.0000001" USDC would silently become 1.000000 USDC — a different amount than the
  // one the user approved. Reject the extra precision rather than rounding it away.
  const fraction = amount.split('.')[1] ?? '';
  if (fraction.length > decimals) return null;

  try {
    const value = parseUnits(amount, decimals);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

function hexQuantity(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

export function buildSignableTransaction(input: BuildInput): BuildResult {
  const { summary } = input;

  if (!input.from || !isAddress(input.from)) {
    return { ok: false, reason: 'Connect a wallet before approving a transaction.' };
  }

  const action = text(summary.action);
  const chainId = input.chainId ?? DEFAULT_CHAIN_ID;
  const from = getAddress(input.from);
  const base = { from, chainId: hexQuantity(BigInt(chainId)) } as const;

  if (TRANSFER_ACTIONS.has(action)) {
    const recipient = text(summary.to);
    if (!isAddress(recipient)) {
      return { ok: false, reason: 'This confirmation does not name a valid recipient address.' };
    }

    const token = resolveToken(summary.token);
    if (!token) {
      return { ok: false, reason: `Unknown token "${text(summary.token)}" — its decimals cannot be verified.` };
    }

    const amount = amountToBaseUnits(text(summary.amount), token.decimals);
    if (amount === null) {
      return { ok: false, reason: `"${text(summary.amount)}" is not a valid ${token.symbol} amount.` };
    }

    if (token.address === NATIVE_SENTINEL) {
      return { ok: true, tx: { ...base, to: getAddress(recipient), value: hexQuantity(amount), data: '0x' } };
    }

    return {
      ok: true,
      tx: {
        ...base,
        to: getAddress(token.address),
        value: '0x0',
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [getAddress(recipient), amount] }),
      },
    };
  }

  if (APPROVE_ACTIONS.has(action)) {
    const spender = text(summary.spender);
    if (!isAddress(spender)) {
      return { ok: false, reason: 'This approval does not name a valid spender address.' };
    }

    const token = resolveToken(summary.token);
    if (!token || token.address === NATIVE_SENTINEL) {
      return { ok: false, reason: 'Only ERC-20 tokens can be approved.' };
    }

    const amount = amountToBaseUnits(text(summary.amount), token.decimals);
    if (amount === null) {
      return { ok: false, reason: `"${text(summary.amount)}" is not a valid ${token.symbol} amount.` };
    }

    // §12.3 — the exact amount, never an unbounded allowance.
    return {
      ok: true,
      tx: {
        ...base,
        to: getAddress(token.address),
        value: '0x0',
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [getAddress(spender), amount] }),
      },
    };
  }

  return {
    ok: false,
    reason:
      action && action !== 'unknown'
        ? `"${action}" has no transaction this chat can build and verify. Use the tool that prepares calldata first.`
        : 'This confirmation did not include an action to execute.',
  };
}

// ✅ COMPLIES WITH: AGENTS.md §12.2, §12.3
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: P1-WALLET-03 agent confirmation wiring
