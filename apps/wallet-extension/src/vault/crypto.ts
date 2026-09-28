/**
 * Vault sealing: PBKDF2-SHA256 → AES-256-GCM.
 *
 * At rest the vault is a `SealedBox`; the user's password is never stored.
 * ADR-011 invariant 2.
 */

export interface KdfParams {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string;
}

export interface SealedBox {
  kdf: KdfParams;
  cipher: { name: 'AES-GCM'; iv: string };
  ciphertext: string;
}

/** OWASP-aligned floor for PBKDF2-SHA256 as of 2026. */
export const DEFAULT_ITERATIONS = 600_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptOptions {
  iterations?: number;
  salt?: Uint8Array<ArrayBuffer>;
  iv?: Uint8Array<ArrayBuffer>;
}

export async function encryptJson(
  value: unknown,
  password: string,
  options: EncryptOptions = {},
): Promise<SealedBox> {
  if (!password) throw new Error('A vault password is required');

  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const iv = options.iv ?? crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt, iterations);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value))),
  );

  return {
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    ciphertext: toBase64(ciphertext),
  };
}

export class VaultDecryptError extends Error {
  constructor(message = 'Incorrect password, or the vault is corrupted') {
    super(message);
    this.name = 'VaultDecryptError';
  }
}

export async function decryptJson<T>(box: SealedBox, password: string): Promise<T> {
  if (!password) throw new VaultDecryptError();
  if (box?.kdf?.name !== 'PBKDF2' || box?.cipher?.name !== 'AES-GCM') {
    throw new VaultDecryptError('Unsupported vault format');
  }

  try {
    const key = await deriveAesKey(password, fromBase64(box.kdf.salt), box.kdf.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(box.cipher.iv) },
      key,
      fromBase64(box.ciphertext),
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    // Never echo password material or crypto internals back to a caller.
    throw new VaultDecryptError();
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (see ADR-011 invariant 2)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
