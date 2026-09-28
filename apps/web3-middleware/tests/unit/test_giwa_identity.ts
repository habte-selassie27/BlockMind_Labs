import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveUpId, createUpId, verifyDojang, listRegistry } from '../../src/giwa-identity';

describe('GIWA Identity — fail-loud', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves demo seed alice.up from registry', async () => {
    const r = await resolveUpId('alice.up');
    expect(r.address).toBe('0x1111111111111111111111111111111111111111');
    expect(r.source).toBe('registry');
    expect(r.resolved).toBe(true);
  });

  it('fails for unknown UP ID when playground unavailable', async () => {
    // Mock fetch to fail
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(resolveUpId('unknown123.up')).rejects.toThrow(/GIWA Playground unavailable/);
    global.fetch = origFetch;
  });

  it('create UP ID fails if already exists', async () => {
    await expect(createUpId('alice.up', '0x1234567890123456789012345678901234567890')).rejects.toThrow(/already registered/);
  });

  it('verify Dojang returns verified for .up', async () => {
    const r = await verifyDojang('alice.up');
    expect(r.is_verified).toBe(true);
    expect(r.dojang_issued).toBe(true);
  });

  it('listRegistry contains demo seeds', () => {
    const reg = listRegistry();
    expect(reg['alice.up']).toBeDefined();
    expect(reg['bob.up']).toBeDefined();
  });
});
