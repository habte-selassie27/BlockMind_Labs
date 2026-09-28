import { describe, expect, it } from 'vitest';
import { recoverMessageAddress } from 'viem';
import {
  accountHandle,
  canDeriveAccount,
  createSecret,
  deriveAddress,
  secretFromMnemonic,
  secretFromPrivateKey,
  signMessage,
  signTransaction,
  validateMnemonic,
} from '../src/vault/vault';
import { HARDHAT_ACCOUNT_0, HARDHAT_ACCOUNT_1, HARDHAT_MNEMONIC } from './helpers';

describe('secret creation and import', () => {
  it('generates a 12-word mnemonic by default and a 24-word on request', () => {
    expect(createSecret(12).mnemonic?.split(' ')).toHaveLength(12);
    expect(createSecret(24).mnemonic?.split(' ')).toHaveLength(24);
  });

  it('generates distinct secrets each time', () => {
    expect(createSecret().mnemonic).not.toEqual(createSecret().mnemonic);
  });

  it('derives the standard BIP-44 addresses from a known phrase', () => {
    const secret = secretFromMnemonic(HARDHAT_MNEMONIC);
    expect(deriveAddress(secret, 0)).toBe(HARDHAT_ACCOUNT_0);
    expect(deriveAddress(secret, 1)).toBe(HARDHAT_ACCOUNT_1);
  });

  it('normalizes whitespace and casing on import', () => {
    const secret = secretFromMnemonic(`  ${HARDHAT_MNEMONIC.toUpperCase().replace(/ /g, '   ')}  `);
    expect(deriveAddress(secret, 0)).toBe(HARDHAT_ACCOUNT_0);
  });

  it('rejects a phrase with the wrong word count', () => {
    expect(() => validateMnemonic('one two three')).toThrow(/12, 15, 18, 21 or 24 words/);
  });

  it('rejects unknown words', () => {
    const words = HARDHAT_MNEMONIC.split(' ');
    const withUnknown = [...words.slice(0, 11), 'zzzznotaword'].join(' ');
    expect(() => validateMnemonic(withUnknown)).toThrow(/Unrecognized word/);
  });

  it('rejects a phrase that fails its checksum', () => {
    // Swapping two words keeps the word count and the vocabulary valid, so only the
    // BIP-39 checksum can catch it. viem alone would derive an unrecoverable wallet.
    const words = HARDHAT_MNEMONIC.split(' ');
    const swapped = [...words.slice(0, 10), words[11], words[10]].join(' ');
    expect(() => validateMnemonic(swapped)).toThrow(/checksum/i);
  });

  it('accepts a private key with or without the 0x prefix and rejects bad input', () => {
    const withPrefix = secretFromPrivateKey(`0x${'01'.repeat(32)}`);
    const withoutPrefix = secretFromPrivateKey('01'.repeat(32));
    expect(withPrefix.privateKey).toBe(`0x${'01'.repeat(32)}`);
    expect(withoutPrefix.privateKey).toBe(withPrefix.privateKey);
    expect(() => secretFromPrivateKey('0x1234')).toThrow(/32 bytes of hex/);
  });

  it('refuses to derive extra accounts from a single-key vault', () => {
    const secret = secretFromPrivateKey(`0x${'01'.repeat(32)}`);
    expect(canDeriveAccount(secret, 0)).toBe(true);
    expect(canDeriveAccount(secret, 1)).toBe(false);
    expect(() => accountHandle(secret, 1)).toThrow(/only account 0/);
  });
});

describe('local signing', () => {
  const secret = secretFromMnemonic(HARDHAT_MNEMONIC);

  it('signs a transaction as EIP-1559 for the requested chain', async () => {
    const raw = await signTransaction(secret, 0, {
      chainId: 91342,
      to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      value: 1_000_000_000_000_000n,
      gas: 21_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      nonce: 0,
    });

    expect(raw.startsWith('0x02')).toBe(true);
    // 91342 === 0x164ce must be encoded in the transaction body.
    expect(raw).toContain('0164ce');
  });

  it('produces different transactions for different accounts', async () => {
    const tx = {
      chainId: 91342,
      to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const,
      value: 1n,
      gas: 21_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      nonce: 0,
    };
    expect(await signTransaction(secret, 0, tx)).not.toBe(await signTransaction(secret, 1, tx));
  });

  it('signs a text message that recovers to the signing account', async () => {
    const signature = await signMessage(secret, 0, { text: 'Blockmind says hello' });
    await expect(
      recoverMessageAddress({ message: 'Blockmind says hello', signature }),
    ).resolves.toBe(HARDHAT_ACCOUNT_0);
  });

  it('signs raw bytes for personal_sign', async () => {
    const signature = await signMessage(secret, 0, { raw: '0xdeadbeef' });
    await expect(recoverMessageAddress({ message: { raw: '0xdeadbeef' }, signature })).resolves.toBe(
      HARDHAT_ACCOUNT_0,
    );
  });

  it('refuses to sign with no payload', async () => {
    await expect(signMessage(secret, 0, {})).rejects.toThrow(/Nothing to sign/);
  });
});
