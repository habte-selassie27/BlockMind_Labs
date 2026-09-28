import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRecentAddress,
  addToWatchlist,
  buildWatchLink,
  clearViewSession,
  getRecentAddresses,
  getWatchEntry,
  getWatchlist,
  loadViewSession,
  markWatchlistSeen,
  parseWatchParam,
  removeFromWatchlist,
  saveViewSession,
  updateWatchEntry,
} from '../watchlist';

const A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const B = '0x1111111111111111111111111111111111111111';

beforeEach(() => {
  localStorage.clear();
});

describe('watchlist', () => {
  it('adds and checksums entries', () => {
    addToWatchlist({ address: A.toLowerCase() });
    const list = getWatchlist();
    expect(list).toHaveLength(1);
    expect(list[0].address).toBe(A);
    expect(list[0].alerts).toBe(false);
    expect(list[0].addedAt).toBeGreaterThan(0);
  });

  it('dedupes case-insensitively and updates metadata', () => {
    addToWatchlist({ address: A });
    addToWatchlist({ address: A.toLowerCase(), ens: 'vitalik.eth', label: 'Vit' });
    const list = getWatchlist();
    expect(list).toHaveLength(1);
    expect(list[0].ens).toBe('vitalik.eth');
    expect(list[0].label).toBe('Vit');
  });

  it('removes by address regardless of case', () => {
    addToWatchlist({ address: A });
    addToWatchlist({ address: B });
    const next = removeFromWatchlist(A.toLowerCase());
    expect(next).toHaveLength(1);
    expect(next[0].address).toBe(B);
  });

  it('patches single entries', () => {
    addToWatchlist({ address: A });
    updateWatchEntry(A.toLowerCase(), { alerts: true });
    expect(getWatchEntry(A)?.alerts).toBe(true);
    expect(getWatchEntry(B)).toBeUndefined();
  });

  it('persists alert dedupe hashes', () => {
    addToWatchlist({ address: A });
    markWatchlistSeen(A, '0xdead');
    expect(getWatchEntry(A)?.lastSeenTx).toBe('0xdead');
  });

  it('ignores non-address junk', () => {
    addToWatchlist({ address: 'not-an-address' });
    expect(getWatchlist()).toHaveLength(0);
  });
});

describe('recent addresses', () => {
  it('prepends and dedupes, newest first', () => {
    addRecentAddress(A);
    addRecentAddress(B);
    addRecentAddress(A.toLowerCase());
    const recents = getRecentAddresses();
    expect(recents[0]).toBe(A);
    expect(recents).toHaveLength(2);
  });

  it('caps at 8 entries', () => {
    for (let i = 1; i <= 12; i++) {
      addRecentAddress(`0x${i.toString(16).padStart(2, '0').repeat(20)}`);
    }
    expect(getRecentAddresses()).toHaveLength(8);
  });

  it('rejects invalid addresses', () => {
    addRecentAddress('nope');
    expect(getRecentAddresses()).toHaveLength(0);
  });
});

describe('deep links', () => {
  it('parses ?watch= for addresses and ENS names', () => {
    expect(parseWatchParam(`?watch=${A}`)).toBe(A);
    expect(parseWatchParam('?watch=vitalik.eth')).toBe('vitalik.eth');
    expect(parseWatchParam('?other=1')).toBeNull();
    expect(parseWatchParam('')).toBeNull();
    expect(parseWatchParam('?watch=')).toBeNull();
  });

  it('survives malformed query strings', () => {
    expect(parseWatchParam('%%%')).toBeNull();
    expect(parseWatchParam('?watch=' + 'x'.repeat(500))).toBeNull();
  });

  it('builds a shareable /chat?watch= link with checksummed address', () => {
    const link = buildWatchLink(A.toLowerCase(), 'https://blockmind.xyz');
    expect(link).toBe(`https://blockmind.xyz/chat?watch=${A}`);
    expect(parseWatchParam(new URL(link).search)).toBe(A);
  });
});

describe('view-only session persistence', () => {
  it('round-trips an address and chain', () => {
    saveViewSession(A.toLowerCase(), 9134);
    const s = loadViewSession();
    expect(s).toEqual({ address: A, chainId: 9134 });
  });

  it('ignores invalid stored sessions', () => {
    localStorage.setItem('blockmind_view_session', JSON.stringify({ address: 'bogus' }));
    expect(loadViewSession()).toBeNull();
  });

  it('clears on disconnect', () => {
    saveViewSession(A);
    clearViewSession();
    expect(loadViewSession()).toBeNull();
  });
});

// ✅ COMPLIES WITH: AGENTS.md §12.5 (localStorage only, no key material)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
