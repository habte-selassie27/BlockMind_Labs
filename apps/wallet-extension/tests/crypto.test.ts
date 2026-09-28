import { describe, expect, it } from 'vitest';
import { DEFAULT_ITERATIONS, VaultDecryptError, decryptJson, encryptJson, fromBase64, toBase64 } from '../src/vault/crypto';

// Real vaults use 600k iterations; tests use a small count so the suite stays fast.
const FAST = { iterations: 1_000 };

describe('vault sealing', () => {
  it('round-trips a secret', async () => {
    const secret = { kind: 'mnemonic', mnemonic: 'eleven words here', nextAccountIndex: 1 };
    const box = await encryptJson(secret, 'hunter2hunter2', FAST);
    await expect(decryptJson(box, 'hunter2hunter2')).resolves.toEqual(secret);
  });

  it('uses the OWASP-aligned iteration floor by default', () => {
    expect(DEFAULT_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it('never stores plaintext or the password', async () => {
    const box = await encryptJson({ mnemonic: 'super secret words' }, 'p@ssword123', FAST);
    const serialized = JSON.stringify(box);
    expect(serialized).not.toContain('super secret words');
    expect(serialized).not.toContain('p@ssword123');
    expect(box.ciphertext.length).toBeGreaterThan(0);
  });

  it('rejects a wrong password without leaking internals', async () => {
    const box = await encryptJson({ kind: 'privateKey' }, 'right-password', FAST);
    await expect(decryptJson(box, 'wrong-password')).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it('detects tampering with the ciphertext', async () => {
    const box = await encryptJson({ kind: 'mnemonic' }, 'password123', FAST);
    const mutated = { ...box, ciphertext: `${box.ciphertext.slice(0, -4)}AAAA` };
    await expect(decryptJson(mutated, 'password123')).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it('produces different ciphertext for identical inputs (random salt + iv)', async () => {
    const first = await encryptJson({ a: 1 }, 'password123', FAST);
    const second = await encryptJson({ a: 1 }, 'password123', FAST);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
    expect(first.kdf.salt).not.toEqual(second.kdf.salt);
    expect(first.cipher.iv).not.toEqual(second.cipher.iv);
  });

  it('rejects malformed vault records', async () => {
    const box = await encryptJson({ a: 1 }, 'password123', FAST);
    const malformed = { ...box, kdf: { ...box.kdf, name: 'scrypt' as 'PBKDF2' } };
    await expect(decryptJson(malformed, 'password123')).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it('requires a password', async () => {
    await expect(encryptJson({ a: 1 }, '')).rejects.toThrow(/password/i);
  });

  it('round-trips base64 helpers for binary data', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual([0, 1, 2, 250, 255]);
  });
});
