/**
 * Just enough ABI plumbing for a wallet: encode an address argument and decode
 * `string` / `uint256` return values. Anything larger belongs in viem.
 */

// Selectors are keccak-256 of the canonical signature, first 4 bytes. A wrong value
// here fails silently against every real contract, so tests/selectors.test.ts pins each
// one to a freshly computed keccak rather than to a literal.
export const FUNCTION_SELECTORS = {
  symbol: '0x95d89b41', // symbol()
  decimals: '0x313ce567', // decimals()
  name: '0x06fdde03', // name()
} as const;

export function encodeAddress(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

export function encodeUint(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

/** Decodes a dynamic `string` return value; returns null when malformed. */
export function decodeAbiString(hex: string | undefined): string | null {
  if (!hex || !hex.startsWith('0x') || hex.length < 130) return null;

  try {
    const body = hex.slice(2);
    const offset = Number.parseInt(body.slice(0, 64), 16) * 2;
    const length = Number.parseInt(body.slice(offset, offset + 64), 16);
    if (!Number.isFinite(length) || length <= 0 || length > 64) return null;

    const data = body.slice(offset + 64, offset + 64 + length * 2);
    let text = '';
    for (let i = 0; i + 1 < data.length; i += 2) {
      const code = Number.parseInt(data.slice(i, i + 2), 16);
      if (code === 0) break;
      if (code < 32 || code > 126) return null; // not printable — treat as unsupported
      text += String.fromCharCode(code);
    }
    return text || null;
  } catch {
    return null;
  }
}

/** Also handles short strings packed into a single 32-byte word (legacy tokens). */
export function decodeAbiStringLoose(hex: string | undefined): string | null {
  const decoded = decodeAbiString(hex);
  if (decoded) return decoded;
  if (!hex || !hex.startsWith('0x') || hex.length < 66) return null;

  const body = hex.slice(2, 66);
  let text = '';
  for (let i = 0; i + 1 < body.length; i += 2) {
    const code = Number.parseInt(body.slice(i, i + 2), 16);
    if (code === 0) break;
    if (code < 32 || code > 126) return null;
    text += String.fromCharCode(code);
  }
  return text || null;
}

export function decodeAbiUint(hex: string | undefined): bigint | null {
  if (!hex || !hex.startsWith('0x')) return null;
  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
