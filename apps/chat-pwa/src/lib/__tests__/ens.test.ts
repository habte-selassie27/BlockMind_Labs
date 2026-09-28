import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ensMocks = vi.hoisted(() => ({
  getEnsAddress: vi.fn(),
  getEnsName: vi.fn(),
  getEnsAvatar: vi.fn(),
}));

vi.mock('viem', async (importOriginal) => {
  const mod = await importOriginal<typeof import('viem')>();
  return {
    ...mod,
    createPublicClient: () => ensMocks,
  };
});

import { getEnsAvatar, lookupEnsName, resolveEnsName, resolveWatchInput } from '../address';

const OWNER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const OWNER_CHECKSUM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

beforeEach(() => {
  ensMocks.getEnsAddress.mockReset();
  ensMocks.getEnsName.mockReset();
  ensMocks.getEnsAvatar.mockReset();
});

describe('resolveEnsName', () => {
  it('returns the checksummed address for a resolvable name', async () => {
    ensMocks.getEnsAddress.mockResolvedValue(OWNER);
    await expect(resolveEnsName('Vitalik.eth')).resolves.toBe(OWNER_CHECKSUM);
    expect(ensMocks.getEnsAddress).toHaveBeenCalledWith({ name: 'vitalik.eth' });
  });

  it('returns null when the name has no address', async () => {
    ensMocks.getEnsAddress.mockResolvedValue(null);
    await expect(resolveEnsName('nobody.eth')).resolves.toBeNull();
  });

  it('swallows RPC errors', async () => {
    ensMocks.getEnsAddress.mockRejectedValue(new Error('rpc down'));
    await expect(resolveEnsName('vitalik.eth')).resolves.toBeNull();
  });

  it('times out a hanging lookup', async () => {
    vi.useFakeTimers();
    ensMocks.getEnsAddress.mockImplementation(() => new Promise(() => {}));
    const pending = resolveEnsName('vitalik.eth');
    await vi.advanceTimersByTimeAsync(6000);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });
});

describe('lookupEnsName', () => {
  it('reverse-resolves an address to its primary name', async () => {
    ensMocks.getEnsName.mockResolvedValue('vitalik.eth');
    await expect(lookupEnsName(OWNER.toLowerCase())).resolves.toBe('vitalik.eth');
    expect(ensMocks.getEnsName).toHaveBeenCalledWith({ address: OWNER_CHECKSUM });
  });

  it('returns null for input that is not an address', async () => {
    await expect(lookupEnsName('not-an-address')).resolves.toBeNull();
    expect(ensMocks.getEnsName).not.toHaveBeenCalled();
  });

  it('swallows RPC errors', async () => {
    ensMocks.getEnsName.mockRejectedValue(new Error('rpc down'));
    await expect(lookupEnsName(OWNER)).resolves.toBeNull();
  });
});

describe('getEnsAvatar', () => {
  it('returns the text-record URL', async () => {
    ensMocks.getEnsAvatar.mockResolvedValue('https://example.org/a.png');
    await expect(getEnsAvatar('vitalik.eth')).resolves.toBe('https://example.org/a.png');
  });

  it('returns null when absent or failing', async () => {
    ensMocks.getEnsAvatar.mockResolvedValueOnce(null);
    await expect(getEnsAvatar('vitalik.eth')).resolves.toBeNull();
    ensMocks.getEnsAvatar.mockRejectedValueOnce(new Error('rpc down'));
    await expect(getEnsAvatar('vitalik.eth')).resolves.toBeNull();
  });
});

describe('resolveWatchInput', () => {
  it('passes addresses through without touching ENS', async () => {
    const result = await resolveWatchInput(OWNER.toLowerCase());
    expect(result).toEqual({ address: OWNER_CHECKSUM, ens: null, error: null, resolving: false });
    expect(ensMocks.getEnsAddress).not.toHaveBeenCalled();
  });

  it('surfaces validation errors untouched', async () => {
    const result = await resolveWatchInput('hello world');
    expect(result.error).toBe('Enter a 0x address or an ENS name');
    expect(result.address).toBeNull();
  });

  it('resolves an ENS name to an address', async () => {
    ensMocks.getEnsAddress.mockResolvedValue(OWNER);
    const result = await resolveWatchInput('vitalik.eth');
    expect(result).toEqual({ address: OWNER_CHECKSUM, ens: 'vitalik.eth', error: null, resolving: false });
  });

  it('reports an unresolvable ENS name', async () => {
    ensMocks.getEnsAddress.mockResolvedValue(null);
    const result = await resolveWatchInput('ghost.eth');
    expect(result).toEqual({ address: null, ens: 'ghost.eth', error: 'ENS name not found', resolving: false });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ✅ COMPLIES WITH: AGENTS.md §12.5 (no key material; ENS lookups are public reads)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
