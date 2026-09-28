/**
 * Key management and local signing (ADR-011).
 *
 * Every function here either produces a secret in memory or uses one to sign.
 * Nothing in this module performs I/O: callers decide where secrets live, and the
 * only legal destinations are service-worker memory and `chrome.storage.session`.
 *
 * Signing uses viem (ADR-004) — no hand-rolled cryptography.
 */
import { validateMnemonic as checkMnemonic } from '@scure/bip39';
import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts';
import type { HDAccount } from 'viem/accounts';
import type { TransactionSerializable } from 'viem';
import type { VaultSecret } from './types';

export type VaultAccountHandle = HDAccount | PrivateKeyAccount;

export interface TransactionLike {
  chainId: number;
  to?: string;
  value?: bigint;
  data?: `0x${string}`;
  nonce?: number;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  type?: 'legacy' | 'eip2930' | 'eip1559';
}

export const MNEMONIC_WORD_COUNTS = [12, 15, 18, 21, 24] as const;
export type MnemonicWordCount = 12 | 24;

export function createSecret(words: MnemonicWordCount = 12): VaultSecret {
  const mnemonic = generateMnemonic(english, words === 24 ? 256 : 128);
  // A fresh vault starts with account 0 only; more are derived on demand.
  return { kind: 'mnemonic', mnemonic, nextAccountIndex: 1 };
}

/** Throws a friendly error for malformed or checksum-invalid mnemonics. */
export function validateMnemonic(input: string): string {
  const mnemonic = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const parts = mnemonic.split(' ');
  if (!(MNEMONIC_WORD_COUNTS as readonly number[]).includes(parts.length)) {
    throw new Error(`A recovery phrase must be 12, 15, 18, 21 or 24 words (received ${parts.length})`);
  }
  const unknown = parts.filter((word) => !english.includes(word));
  if (unknown.length > 0) {
    // Never echo the whole phrase back; only the offending words.
    throw new Error(`Unrecognized word${unknown.length > 1 ? 's' : ''} in recovery phrase: ${unknown.join(', ')}`);
  }
  // viem will happily derive from a mistyped phrase, so the checksum must be verified
  // explicitly — otherwise a typo silently creates a wallet the user cannot recover.
  // Note: @scure/bip39 takes (mnemonic, wordlist), the opposite of viem's wrapper.
  if (!checkMnemonic(mnemonic, english)) {
    throw new Error('That recovery phrase failed its checksum — please re-check the words and their order');
  }
  return mnemonic;
}

export function secretFromMnemonic(input: string, nextAccountIndex = 1): VaultSecret {
  return { kind: 'mnemonic', mnemonic: validateMnemonic(input), nextAccountIndex };
}

function normalizePrivateKey(input: string): `0x${string}` {
  const trimmed = input.trim();
  const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('A private key must be 32 bytes of hex (64 characters)');
  }
  return `0x${hex.toLowerCase()}`;
}

export function secretFromPrivateKey(input: string): VaultSecret {
  const privateKey = normalizePrivateKey(input);
  // Validates that the scalar is in range before we ever persist it.
  privateKeyToAccount(privateKey);
  return { kind: 'privateKey', privateKey, nextAccountIndex: 1 };
}

export function accountHandle(secret: VaultSecret, index: number): VaultAccountHandle {
  if (secret.kind === 'privateKey') {
    if (index !== 0) throw new Error('A single-key vault has only account 0');
    if (!secret.privateKey) throw new Error('Vault is missing its private key');
    return privateKeyToAccount(secret.privateKey);
  }
  if (!secret.mnemonic) throw new Error('Vault is missing its recovery phrase');
  return mnemonicToAccount(secret.mnemonic, { addressIndex: index });
}

export function deriveAddress(secret: VaultSecret, index: number): string {
  return accountHandle(secret, index).address;
}

export function canDeriveAccount(secret: VaultSecret, index: number): boolean {
  return secret.kind === 'mnemonic' || index === 0;
}

export function exportSecret(secret: VaultSecret): { mnemonic?: string; privateKey?: `0x${string}` } {
  return secret.kind === 'mnemonic' ? { mnemonic: secret.mnemonic } : { privateKey: secret.privateKey };
}

// ── Signing ──────────────────────────────────────────────────────

export async function signTransaction(
  secret: VaultSecret,
  index: number,
  tx: TransactionLike,
): Promise<`0x${string}`> {
  const account = accountHandle(secret, index);
  const payload: Record<string, unknown> = { chainId: tx.chainId };

  if (tx.to !== undefined) payload.to = tx.to;
  if (tx.value !== undefined) payload.value = tx.value;
  if (tx.data !== undefined) payload.data = tx.data;
  if (tx.nonce !== undefined) payload.nonce = tx.nonce;
  if (tx.gas !== undefined) payload.gas = tx.gas;
  if (tx.maxFeePerGas !== undefined) payload.maxFeePerGas = tx.maxFeePerGas;
  if (tx.maxPriorityFeePerGas !== undefined) payload.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
  if (tx.gasPrice !== undefined) payload.gasPrice = tx.gasPrice;
  if (tx.type !== undefined) payload.type = tx.type;

  return account.signTransaction(payload as TransactionSerializable);
}

export interface MessageInput {
  /** Plain UTF-8 text, signed with the EIP-191 personal-message prefix. */
  text?: string;
  /** Pre-encoded bytes, signed as-is (`personal_sign` with a hex payload). */
  raw?: `0x${string}`;
}

export async function signMessage(
  secret: VaultSecret,
  index: number,
  input: MessageInput,
): Promise<`0x${string}`> {
  const account = accountHandle(secret, index);
  if (input.raw !== undefined) {
    return account.signMessage({ message: { raw: input.raw } });
  }
  if (input.text === undefined) throw new Error('Nothing to sign');
  return account.signMessage({ message: input.text });
}

export type TypedDataPayload = Parameters<VaultAccountHandle['signTypedData']>[0];

export async function signTypedData(
  secret: VaultSecret,
  index: number,
  payload: TypedDataPayload,
): Promise<`0x${string}`> {
  const account = accountHandle(secret, index);
  return account.signTypedData(payload);
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (see ADR-011), ADR-004
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
