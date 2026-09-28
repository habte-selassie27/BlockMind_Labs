import { checksumAddress, isAddress } from './address';

export interface WatchEntry {
  /** EIP-55 checksummed */
  address: string;
  ens?: string | null;
  label?: string;
  addedAt: number;
  /** Notify when funds arrive at this address */
  alerts: boolean;
  /** Hash of the newest tx we have already notified about */
  lastSeenTx?: string;
}

const WATCHLIST_KEY = 'blockmind_watchlist';
const RECENT_KEY = 'blockmind_recent_addresses';
const VIEW_SESSION_KEY = 'blockmind_view_session';

const MAX_RECENT = 8;
const MAX_WATCHLIST = 20;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable — non-fatal
  }
}

export function getWatchlist(): WatchEntry[] {
  const list = read<WatchEntry[]>(WATCHLIST_KEY, []);
  return Array.isArray(list) ? list.filter((e) => e && isAddress(e.address)) : [];
}

export function addToWatchlist(entry: { address: string; ens?: string | null; label?: string; alerts?: boolean }): WatchEntry[] {
  const list = getWatchlist();
  const address = checksumAddress(entry.address);
  const existing = list.find((e) => e.address.toLowerCase() === address.toLowerCase());
  if (existing) {
    existing.ens = entry.ens ?? existing.ens;
    existing.label = entry.label ?? existing.label;
    write(WATCHLIST_KEY, list);
    return list;
  }
  const next: WatchEntry[] = [
    ...list,
    { address, ens: entry.ens ?? null, label: entry.label, addedAt: Date.now(), alerts: entry.alerts ?? false },
  ].slice(0, MAX_WATCHLIST);
  write(WATCHLIST_KEY, next);
  return next;
}

export function removeFromWatchlist(address: string): WatchEntry[] {
  const next = getWatchlist().filter((e) => e.address.toLowerCase() !== address.toLowerCase());
  write(WATCHLIST_KEY, next);
  return next;
}

export function updateWatchEntry(address: string, patch: Partial<WatchEntry>): WatchEntry[] {
  const list = getWatchlist().map((e) =>
    e.address.toLowerCase() === address.toLowerCase() ? { ...e, ...patch, address: e.address } : e,
  );
  write(WATCHLIST_KEY, list);
  return list;
}

export function getWatchEntry(address: string): WatchEntry | undefined {
  return getWatchlist().find((e) => e.address.toLowerCase() === address.toLowerCase());
}

export function getRecentAddresses(): string[] {
  const list = read<string[]>(RECENT_KEY, []);
  return Array.isArray(list) ? list.filter((a) => isAddress(a)) : [];
}

export function addRecentAddress(address: string): string[] {
  if (!isAddress(address)) return getRecentAddresses();
  const checksummed = checksumAddress(address);
  const next = [
    checksummed,
    ...getRecentAddresses().filter((a) => a.toLowerCase() !== checksummed.toLowerCase()),
  ].slice(0, MAX_RECENT);
  write(RECENT_KEY, next);
  return next;
}

/** Read-only session so a reload keeps the watched address (view-only only). */
export function saveViewSession(address: string, chainId = 91342): void {
  write(VIEW_SESSION_KEY, { address: checksumAddress(address), chainId, savedAt: Date.now() });
}

export function loadViewSession(): { address: string; chainId: number } | null {
  const s = read<{ address?: string; chainId?: number } | null>(VIEW_SESSION_KEY, null);
  if (s?.address && isAddress(s.address)) {
    return { address: checksumAddress(s.address), chainId: s.chainId || 91342 };
  }
  return null;
}

export function clearViewSession(): void {
  try {
    localStorage.removeItem(VIEW_SESSION_KEY);
  } catch {}
}

/** `?watch=0x…` / `?watch=vitalik.eth` → value (null when absent/invalid). */
export function parseWatchParam(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const raw = params.get('watch');
    if (!raw) return null;
    const v = raw.trim();
    if (!v || v.length > 255) return null;
    return v;
  } catch {
    return null;
  }
}

export function buildWatchLink(address: string, origin?: string): string {
  const base = origin ?? (typeof location !== 'undefined' ? location.origin : '');
  const path = typeof location !== 'undefined' && location.pathname ? '/chat' : '/chat';
  return `${base}${path}?watch=${checksumAddress(address)}`;
}

export function markWatchlistSeen(address: string, txHash: string): WatchEntry[] {
  return updateWatchEntry(address, { lastSeenTx: txHash });
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (local-only, no secrets)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
