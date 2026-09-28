/**
 * These tests pin the two defects that made the original wallet unusable:
 *   1. a readiness broadcast that a late listener always missed, and
 *   2. responses that omitted `method`, so the dApp's matcher never fired.
 */
import { describe, expect, it } from 'vitest';
import {
  CONTENT_CHANNEL,
  INPAGE_CHANNEL,
  LEGACY_READY,
  LEGACY_REQUEST,
  LEGACY_RESPONSE,
  PROVIDER_INFO,
  errorResponse,
  fromLegacyRequest,
  isContentMessage,
  isProviderRequest,
  legacyReady,
  newRequestId,
  successResponse,
  toLegacyResponse,
} from '../src/lib/messages';

describe('legacy compatibility', () => {
  it('normalizes a BLOCKMIND_REQUEST into the current protocol', () => {
    const normalized = fromLegacyRequest({ type: LEGACY_REQUEST, method: 'eth_requestAccounts', id: 42 });
    expect(normalized).toMatchObject({
      channel: INPAGE_CHANNEL,
      method: 'eth_requestAccounts',
      id: '42',
    });
  });

  it('generates an id when the legacy caller omitted one', () => {
    const normalized = fromLegacyRequest({ type: LEGACY_REQUEST, method: 'eth_chainId' });
    expect(typeof normalized?.id).toBe('string');
    expect(normalized?.id.length).toBeGreaterThan(0);
  });

  it('ignores unrelated or malformed messages', () => {
    expect(fromLegacyRequest(null)).toBeNull();
    expect(fromLegacyRequest({ type: 'SOMETHING_ELSE', method: 'eth_accounts' })).toBeNull();
    expect(fromLegacyRequest({ type: LEGACY_REQUEST })).toBeNull();
  });

  it('re-announces readiness so a late listener still detects the wallet', () => {
    expect(legacyReady('1.0.0')).toEqual({ type: LEGACY_READY, version: '1.0.0' });
  });

  it('always echoes `method` back on a legacy response (regression)', () => {
    const legacy = toLegacyResponse(successResponse('abc', ['0x1234']), 'eth_requestAccounts');
    expect(legacy).toEqual({
      type: LEGACY_RESPONSE,
      id: 'abc',
      method: 'eth_requestAccounts',
      result: ['0x1234'],
    });
  });

  it('carries errors through the legacy shape', () => {
    const legacy = toLegacyResponse(errorResponse('abc', { code: 4001, message: 'User rejected' }), 'personal_sign');
    expect(legacy.method).toBe('personal_sign');
    expect(legacy.error).toEqual({ code: 4001, message: 'User rejected' });
    expect(legacy.result).toBeUndefined();
  });
});

describe('channel discrimination', () => {
  it('accepts well-formed provider requests', () => {
    expect(isProviderRequest({ channel: INPAGE_CHANNEL, id: '1', method: 'eth_chainId' })).toBe(true);
  });

  it('rejects requests from other channels or without a method', () => {
    expect(isProviderRequest({ channel: CONTENT_CHANNEL, id: '1', method: 'eth_chainId' })).toBe(false);
    expect(isProviderRequest({ channel: INPAGE_CHANNEL, id: '1' })).toBe(false);
    expect(isProviderRequest({ channel: INPAGE_CHANNEL, method: 'eth_chainId' })).toBe(false);
    expect(isProviderRequest(null)).toBe(false);
    expect(isProviderRequest('nope')).toBe(false);
  });

  it('accepts responses and events from the content relay', () => {
    expect(isContentMessage(successResponse('1', '0x1'))).toBe(true);
    expect(isContentMessage({ channel: CONTENT_CHANNEL, event: 'accountsChanged', data: [] })).toBe(true);
    expect(isContentMessage({ channel: INPAGE_CHANNEL, id: '1', method: 'eth_chainId' })).toBe(false);
  });

  it('builds responses that never leak `undefined` results', () => {
    expect(successResponse('1', null)).toEqual({ channel: CONTENT_CHANNEL, id: '1', result: null });
    expect(errorResponse('1', { code: -32603, message: 'boom' })).toEqual({
      channel: CONTENT_CHANNEL,
      id: '1',
      error: { code: -32603, message: 'boom' },
    });
  });
});

describe('request ids', () => {
  it('are unique across many calls in the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1_000 }, () => newRequestId()));
    expect(ids.size).toBe(1_000);
  });
});

describe('EIP-6963 provider info', () => {
  it('announces a stable identity so dApps can discover the wallet without a race', () => {
    expect(PROVIDER_INFO.name).toBe('Blockmind Wallet');
    expect(PROVIDER_INFO.rdns).toBe('io.blockmind.wallet');
    expect(PROVIDER_INFO.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(PROVIDER_INFO.icon.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
});
