/**
 * ERC-20 token support.
 *
 * Three concerns live here so the popup and the dispatcher cannot drift apart:
 *   1. the persisted per-chain token list,
 *   2. on-chain metadata / balance reads,
 *   3. `transfer` calldata encoding.
 *
 * Nothing here signs or broadcasts. A token transfer is built as ordinary calldata and
 * then goes through the same §12 gate, simulation and confirmation window as any other
 * transaction — token support must not open a second, unchecked path to the signer.
 */
import { FUNCTION_SELECTORS, decodeAbiStringLoose, decodeAbiUint, encodeAddress, encodeUint } from './abi';
import { SELECTORS } from '../safety/approvals';

export interface TokenConfig {
  /** Lowercase contract address — normalised so lookups are case-insensitive. */
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

export interface TokenMetadata {
  symbol: string;
  decimals: number;
}

/** balanceOf(address) */
export const BALANCE_OF_SELECTOR = '0x70a08231';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT_RE = /^\d*\.?\d*$/;

export function isTokenAddress(value: string): boolean {
  return ADDRESS_RE.test(value.trim());
}

export function normalizeTokenAddress(value: string): string {
  return value.trim().toLowerCase();
}

/** `transfer(address,uint256)` calldata. */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  return `${SELECTORS.transfer}${encodeAddress(to)}${encodeUint(amount)}`;
}

/** `balanceOf(address)` calldata. */
export function encodeBalanceOf(owner: string): string {
  return `${BALANCE_OF_SELECTOR}${encodeAddress(owner)}`;
}

/**
 * Human decimal string → base units.
 * Returns null when the input is malformed, over-precise for the token, or not positive.
 */
export function parseTokenAmount(amount: string, decimals: number): bigint | null {
  const text = amount.trim();
  if (!text || text === '.' || !AMOUNT_RE.test(text)) return null;

  const [whole = '', fraction = ''] = text.split('.');
  if (fraction.length > decimals) return null;

  const padded = fraction.padEnd(decimals, '0');
  try {
    const value = BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

export function sameToken(a: TokenConfig, b: TokenConfig): boolean {
  return a.chainId === b.chainId && a.address === b.address;
}

/** Adds a token, replacing any existing entry for the same chain + address. */
export function upsertToken(list: TokenConfig[], token: TokenConfig): TokenConfig[] {
  return [...list.filter((existing) => !sameToken(existing, token)), token];
}

export function removeToken(list: TokenConfig[], chainId: number, address: string): TokenConfig[] {
  const target = normalizeTokenAddress(address);
  return list.filter((token) => !(token.chainId === chainId && token.address === target));
}

export function tokensForChain(list: TokenConfig[], chainId: number): TokenConfig[] {
  return list.filter((token) => token.chainId === chainId);
}

/** The slice of chain access token reads need. `RpcClient` satisfies it structurally. */
export interface TokenReader {
  call<T>(chainId: number, method: string, params: unknown[]): Promise<T>;
  getCode(chainId: number, address: string): Promise<`0x${string}`>;
}

/**
 * Reads `symbol` and `decimals`, or null when the address holds no contract.
 * A token without a readable symbol is still usable, so it falls back to `TOKEN`.
 */
export async function readTokenMetadata(
  rpc: TokenReader,
  chainId: number,
  address: string,
): Promise<TokenMetadata | null> {
  const token = normalizeTokenAddress(address);

  const code = await rpc.getCode(chainId, token).catch(() => '0x' as const);
  if (!code || code === '0x') return null;

  const [symbolHex, decimalsHex] = await Promise.all([
    rpc
      .call<`0x${string}`>(chainId, 'eth_call', [{ to: token, data: FUNCTION_SELECTORS.symbol }, 'latest'])
      .catch(() => undefined),
    rpc
      .call<`0x${string}`>(chainId, 'eth_call', [{ to: token, data: FUNCTION_SELECTORS.decimals }, 'latest'])
      .catch(() => undefined),
  ]);

  const parsed = Number(decodeAbiUint(decimalsHex) ?? 18n);
  return {
    symbol: decodeAbiStringLoose(symbolHex) ?? 'TOKEN',
    decimals: Number.isFinite(parsed) && parsed >= 0 && parsed <= 36 ? parsed : 18,
  };
}

/** `balanceOf(owner)` → base units, or null when the read fails. */
export async function readTokenBalance(
  rpc: TokenReader,
  chainId: number,
  token: string,
  owner: string,
): Promise<bigint | null> {
  try {
    const hex = await rpc.call<`0x${string}`>(chainId, 'eth_call', [
      { to: normalizeTokenAddress(token), data: encodeBalanceOf(owner) },
      'latest',
    ]);
    return decodeAbiUint(hex);
  } catch {
    return null;
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.1, §12.2, §12.3, ADR-011
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-02 ERC-20 token support
