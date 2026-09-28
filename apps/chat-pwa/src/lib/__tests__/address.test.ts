import { describe, expect, it } from 'vitest';
import {
  checksumAddress,
  hashString,
  identiconGrid,
  identiconPalette,
  isAddress,
  isEnsName,
  parseWatchInput,
  resolveWatchInput,
  shortAddress,
} from '../address';

const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const LOWER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';

describe('isAddress', () => {
  it('accepts 0x + 40 hex chars in any case', () => {
    expect(isAddress(VITALIK)).toBe(true);
    expect(isAddress(LOWER)).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isAddress('0x123')).toBe(false);
    expect(isAddress('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false);
    expect(isAddress('vitalik.eth')).toBe(false);
    expect(isAddress('')).toBe(false);
  });
});

describe('checksumAddress', () => {
  it('produces the EIP-55 form from lowercase input', () => {
    expect(checksumAddress(LOWER)).toBe(VITALIK);
  });

  it('is idempotent for an already-checksummed address', () => {
    expect(checksumAddress(VITALIK)).toBe(VITALIK);
  });

  it('returns the input untouched when invalid', () => {
    expect(checksumAddress('nope')).toBe('nope');
  });
});

describe('shortAddress', () => {
  it('truncates in the middle', () => {
    expect(shortAddress(VITALIK)).toBe('0xd8dA...6045');
  });

  it('handles short / empty values', () => {
    expect(shortAddress('0xabc')).toBe('0xabc');
    expect(shortAddress('')).toBe('');
  });
});

describe('isEnsName', () => {
  it('accepts normal ENS names', () => {
    expect(isEnsName('vitalik.eth')).toBe(true);
    expect(isEnsName('sub.alice.eth')).toBe(true);
  });

  it('rejects addresses, hex and junk', () => {
    expect(isEnsName(VITALIK)).toBe(false);
    expect(isEnsName('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')).toBe(false);
    expect(isEnsName('not a name')).toBe(false);
  });
});

describe('parseWatchInput', () => {
  it('resolves addresses immediately without network', () => {
    const r = parseWatchInput(`  ${LOWER}  `);
    expect(r.address).toBe(VITALIK);
    expect(r.resolving).toBe(false);
    expect(r.error).toBeNull();
  });

  it('marks ENS names as resolving', () => {
    const r = parseWatchInput('vitalik.eth');
    expect(r.ens).toBe('vitalik.eth');
    expect(r.resolving).toBe(true);
    expect(r.address).toBeNull();
  });

  it('flags junk input', () => {
    const r = parseWatchInput('send me money');
    expect(r.error).toBeTruthy();
    expect(r.address).toBeNull();
  });

  it('treats empty input as neutral', () => {
    const r = parseWatchInput('   ');
    expect(r.error).toBeNull();
    expect(r.address).toBeNull();
    expect(r.resolving).toBe(false);
  });
});

describe('resolveWatchInput', () => {
  it('passes addresses straight through (no network)', async () => {
    const r = await resolveWatchInput(LOWER);
    expect(r.address).toBe(VITALIK);
  });

  it('returns an error for junk without hitting the network', async () => {
    const r = await resolveWatchInput('!!invalid!!');
    expect(r.address).toBeNull();
    expect(r.error).toBeTruthy();
  });
});

describe('identicon', () => {
  it('hashString is stable', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });

  it('grid is deterministic and mirrored', () => {
    const a = identiconGrid(LOWER);
    const b = identiconGrid(VITALIK);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    for (const row of a) {
      expect(row).toHaveLength(5);
      expect(row).toEqual([...row].reverse());
    }
  });

  it('palette is deterministic and usable as CSS colors', () => {
    const p1 = identiconPalette(LOWER);
    const p2 = identiconPalette(VITALIK);
    expect(p1).toEqual(p2);
    expect(p1.background).toMatch(/^hsl\(/);
    expect(p1.colors).toHaveLength(3);
    expect(p1.colors.every((c) => c.startsWith('hsl('))).toBe(true);
  });

  it('different addresses produce different grids', () => {
    const other = identiconGrid('0x1111111111111111111111111111111111111111');
    expect(identiconGrid(VITALIK)).not.toEqual(other);
  });
});

// ✅ COMPLIES WITH: AGENTS.md §11 (no invented schemas), §12.5
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
