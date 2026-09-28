import { describe, expect, it } from 'vitest';
import {
  detectIncoming,
  formatAmount,
  formatTimeAgo,
  formatUsd,
  normalizeActivity,
  seriesFromActivity,
  sparklinePath,
  weiHexToNumber,
  type ActivityTx,
} from '../viewonly';

const OWNER = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const OTHER = '0x1111111111111111111111111111111111111111';

function tx(partial: Partial<ActivityTx>): ActivityTx {
  return {
    hash: `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`,
    from: OTHER,
    to: OWNER,
    valueWei: '1000000000000000000',
    status: 'ok',
    timestamp: Date.now(),
    direction: 'in',
    ...partial,
  };
}

describe('weiHexToNumber', () => {
  it('converts hex wei to a native amount', () => {
    expect(weiHexToNumber('0xde0b6b3a7640000')).toBeCloseTo(1);
    expect(weiHexToNumber('0x0')).toBe(0);
    expect(weiHexToNumber('')).toBe(0);
  });
});

describe('normalizeActivity', () => {
  const raw = [
    { hash: '0xaaa', from: OTHER, to: OWNER, value: '1000000000000000000', status: 'ok', timestamp: 1700000000 },
    { hash: '0xbbb', from: OWNER, to: OTHER, value: '0', status: 'error', timestamp: '2024-01-01T00:00:00.000Z' },
    { hash: '0xccc', from: OWNER, to: OWNER, value: '5', status: 'ok', timestamp: 1700000100 },
    { not: 'a tx' },
    {},
  ];

  it('classifies direction and drops junk rows', () => {
    const rows = normalizeActivity(raw, OWNER);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.hash === '0xaaa')?.direction).toBe('in');
    expect(rows.find((r) => r.hash === '0xbbb')?.direction).toBe('out');
    expect(rows.find((r) => r.hash === '0xccc')?.direction).toBe('self');
  });

  it('sorts newest first and normalises timestamps to ms', () => {
    const rows = normalizeActivity(raw, OWNER);
    expect(rows[0].timestamp).toBeGreaterThanOrEqual(rows[1].timestamp);
    const seconds = rows.find((r) => r.hash === '0xaaa')!;
    expect(seconds.timestamp).toBe(1700000000 * 1000);
  });

  it('is case-insensitive about the owner address', () => {
    const rows = normalizeActivity([{ hash: '0xddd', from: OTHER, to: OWNER.toLowerCase(), value: '1' }], OWNER);
    expect(rows[0].direction).toBe('in');
  });
});

describe('detectIncoming', () => {
  it('reports incoming txs newer than lastSeenTx', () => {
    const seen = tx({ hash: '0xseen', timestamp: 1000 });
    const fresh = tx({ hash: '0xfresh', timestamp: 2000 });
    const outgoing = tx({ hash: '0xout', from: OWNER, to: OTHER, direction: 'out', timestamp: 3000 });
    const result = detectIncoming([outgoing, fresh, seen], OWNER, '0xseen');
    expect(result.incoming.map((t) => t.hash)).toEqual(['0xfresh']);
    expect(result.newestHash).toBe('0xout');
  });

  it('only reports the newest incoming tx on the first poll', () => {
    const a = tx({ hash: '0xa', timestamp: 1000 });
    const b = tx({ hash: '0xb', timestamp: 2000 });
    const result = detectIncoming([b, a], OWNER);
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0].hash).toBe('0xb');
    expect(result.newestHash).toBe('0xb');
  });

  it('returns nothing when the newest activity is already seen', () => {
    const seen = tx({ hash: '0xseen', timestamp: 1000 });
    const result = detectIncoming([seen], OWNER, '0xseen');
    expect(result.incoming).toHaveLength(0);
  });

  it('never reports outgoing transactions', () => {
    const outgoing = tx({ hash: '0xout', from: OWNER, to: OTHER, direction: 'out' });
    const result = detectIncoming([outgoing], OWNER);
    expect(result.incoming).toHaveLength(0);
  });
});

describe('sparklinePath', () => {
  it('returns empty for no values', () => {
    expect(sparklinePath([], 100, 40)).toBe('');
  });

  it('returns a flat mid-line for a single value', () => {
    expect(sparklinePath([5], 100, 40)).toContain('M 3 20');
  });

  it('emits one M + N-1 L segments within bounds', () => {
    const d = sparklinePath([1, 3, 2, 5], 100, 40);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/L /g)).toHaveLength(3);
    const coords = d.match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...coords.filter((_, i) => i % 2 === 0))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...coords.filter((_, i) => i % 2 === 0))).toBeLessThanOrEqual(100);
    expect(Math.max(...coords.filter((_, i) => i % 2 === 1))).toBeLessThanOrEqual(40);
  });

  it('handles a flat series without dividing by zero', () => {
    const d = sparklinePath([2, 2, 2], 100, 40);
    expect(d).not.toContain('NaN');
  });
});

describe('seriesFromActivity', () => {
  it('accumulates incoming and outgoing value over time', () => {
    const values = seriesFromActivity([
      tx({ hash: '0x1', direction: 'in', valueWei: '2000000000000000000', timestamp: 1000 }),
      tx({ hash: '0x2', direction: 'out', valueWei: '500000000000000000', timestamp: 2000 }),
    ]);
    expect(values).toEqual([2, 1.5]);
  });
});

describe('formatters', () => {
  it('formats amounts', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(1.23456789)).toBe('1.2346');
    expect(formatAmount(0.0000001)).toBe('<0.000001');
  });

  it('formats USD with 2 decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(NaN)).toBe('$0.00');
  });

  it('formats relative times', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 5000)).toBe('5s ago');
    expect(formatTimeAgo(now - 120000)).toBe('2m ago');
    expect(formatTimeAgo(now - 7200000)).toBe('2h ago');
    expect(formatTimeAgo(now - 3 * 86400000)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

// ✅ COMPLIES WITH: AGENTS.md §11, §12.1 (pure read-only helpers)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
