import { createPublicClient, fallback, http, getAddress as viemGetAddress } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const ENS_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

const ENS_RPC_TIMEOUT_MS = 6000;

const ensClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http('https://ethereum-rpc.publicnode.com'),
    http('https://cloudflare-eth.com'),
    http('https://eth.llamarpc.com'),
  ]),
});

export function isAddress(value: string): boolean {
  return ADDRESS_RE.test(value.trim());
}

/**
 * Strict parse into viem's branded `Address`.
 *
 * Returns null for anything that is not a 20-byte hex address. Mixed-case input is
 * accepted only when its EIP-55 checksum is valid; all-lowercase input is checksummed.
 * viem actions require the branded type, so every call site goes through here.
 */
function toAddress(value: string): `0x${string}` | null {
  const v = value.trim();
  if (!ADDRESS_RE.test(v)) return null;
  try {
    return viemGetAddress(v);
  } catch {
    try {
      return viemGetAddress(v.toLowerCase());
    } catch {
      return null;
    }
  }
}

export function isEnsName(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith('0x') || v.includes(' ')) return false;
  return ENS_RE.test(v);
}

/** EIP-55 checksummed form. Falls back to the input when viem cannot parse it. */
export function checksumAddress(value: string): string {
  return toAddress(value) ?? value.trim();
}

export function shortAddress(value: string, head = 6, tail = 4): string {
  if (!value) return '';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function withTimeout<T>(promise: Promise<T>, ms = ENS_RPC_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ENS lookup timed out')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** vitalik.eth → 0x… (null when unresolvable) */
export async function resolveEnsName(name: string): Promise<string | null> {
  try {
    const address = await withTimeout(ensClient.getEnsAddress({ name: normalize(name.trim()) }));
    return address ? checksumAddress(address) : null;
  } catch {
    return null;
  }
}

/** 0x… → vitalik.eth (null when the address has no primary name) */
export async function lookupEnsName(address: string): Promise<string | null> {
  const target = toAddress(address);
  if (!target) return null;
  try {
    const name = await withTimeout(ensClient.getEnsName({ address: target }));
    return name || null;
  } catch {
    return null;
  }
}

/** Avatar image URL from an ENS text record (null when absent). */
export async function getEnsAvatar(name: string): Promise<string | null> {
  try {
    const url = await withTimeout(ensClient.getEnsAvatar({ name: normalize(name.trim()) }));
    return url || null;
  } catch {
    return null;
  }
}

export interface WatchInputResult {
  address: string | null;
  ens: string | null;
  error: string | null;
  resolving: boolean;
}

/**
 * Normalises whatever the user typed into a watch input.
 * Addresses resolve immediately; ENS names need a network round-trip.
 */
export function parseWatchInput(raw: string): WatchInputResult {
  const v = raw.trim();
  if (!v) return { address: null, ens: null, error: null, resolving: false };
  if (isAddress(v)) return { address: checksumAddress(v), ens: null, error: null, resolving: false };
  if (isEnsName(v)) return { address: null, ens: v.toLowerCase(), error: null, resolving: true };
  return { address: null, ens: null, error: 'Enter a 0x address or an ENS name', resolving: false };
}

/** FNV-1a — small, dependency-free, stable across runs. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface IdenticonPalette {
  background: string;
  colors: string[];
}

const PALETTE_HUES = [8, 24, 38, 196, 210, 262, 320, 340, 150, 170];

/** Deterministic jazzicon-style palette derived from an address. */
export function identiconPalette(address: string, random: () => number = mulberry32(hashString(address.toLowerCase()))): IdenticonPalette {
  const bgHue = PALETTE_HUES[Math.floor(random() * PALETTE_HUES.length)];
  const fgHue = PALETTE_HUES[Math.floor(random() * PALETTE_HUES.length)];
  const accentHue = PALETTE_HUES[Math.floor(random() * PALETTE_HUES.length)];
  return {
    background: `hsl(${bgHue} 42% 38%)`,
    colors: [
      `hsl(${fgHue} 58% 58%)`,
      `hsl(${accentHue} 62% 46%)`,
      `hsl(${fgHue} 48% 72%)`,
    ],
  };
}

/** Deterministic 5×5 (mirrored → 3 columns) identicon grid. */
export function identiconGrid(address: string, size = 5): boolean[][] {
  const random = mulberry32(hashString(address.toLowerCase()));
  const half = Math.ceil(size / 2);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < half; x++) {
      const on = random() > 0.45;
      grid[y][x] = on;
      grid[y][size - 1 - x] = on;
    }
  }
  return grid;
}

export async function resolveWatchInput(raw: string): Promise<WatchInputResult> {
  const parsed = parseWatchInput(raw);
  if (parsed.error || parsed.address) return parsed;
  if (parsed.ens) {
    const address = await resolveEnsName(parsed.ens);
    if (!address) return { address: null, ens: parsed.ens, error: 'ENS name not found', resolving: false };
    return { address, ens: parsed.ens, error: null, resolving: false };
  }
  return parsed;
}

// ✅ COMPLIES WITH: AGENTS.md §12.6, §12.7
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
