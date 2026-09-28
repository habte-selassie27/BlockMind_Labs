import { SUPPORTED_CHAINS, getChainById } from './chains';
import { ERC20_ABI, GIWA_TOKENS, getTokenBalances } from './giwa-rpc';
import { getTokenPrices, getFallbackPrice } from './price-feeds';

const MIDDLEWARE = (import.meta as any).env.VITE_WEB3_MIDDLEWARE_URL || '/api';

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const NFT_LOG_RANGE = 5000;
const NFT_MAX_CONTRACTS = 12;

export interface NativeBalanceRow {
  chainId: number;
  name: string;
  symbol: string;
  color: string;
  icon: string;
  balance: number;
  usd: number;
  ok: boolean;
}

export interface TokenRow {
  symbol: string;
  name: string;
  address: string;
  balance: number;
  usd: number;
  color: string;
  native: boolean;
}

export interface NftItem {
  contract: string;
  balance: number;
  name?: string;
}

export interface ActivityTx {
  hash: string;
  from: string;
  to: string | null;
  valueWei: string;
  status: 'ok' | 'error' | string;
  timestamp: number;
  method?: string;
  direction: 'in' | 'out' | 'self';
}

export interface RiskInfo {
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  isContract: boolean;
  isVerified: boolean;
  summary: string;
  txCount?: number;
  explorer?: string;
}

export interface BalancePoint {
  block: number;
  balance: number;
}

function nativePriceUsd(symbol: string, ethPrice: number): number {
  if (symbol === 'ETH') return ethPrice;
  if (symbol === 'GIWA') return getFallbackPrice('GIWA');
  return getFallbackPrice(symbol);
}

async function ethRpc(rpc: string, method: string, params: unknown[], timeoutMs = 7000): Promise<unknown> {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

export function weiHexToNumber(hex: string): number {
  if (!hex || hex === '0x') return 0;
  return Number(BigInt(hex)) / 1e18;
}

/** Native balance + USD for every supported chain. Failures are reported per-chain. */
export async function fetchNativeBalances(address: string): Promise<NativeBalanceRow[]> {
  const prices = await getTokenPrices().catch(() => null);
  const ethPrice = prices?.get('WETH')?.price ?? getFallbackPrice('ETH');

  const rows = await Promise.all(
    SUPPORTED_CHAINS.map(async (chain): Promise<NativeBalanceRow> => {
      try {
        const hex = (await ethRpc(chain.rpc, 'eth_getBalance', [address, 'latest'])) as string;
        const balance = weiHexToNumber(hex);
        return {
          chainId: chain.id,
          name: chain.name,
          symbol: chain.nativeCurrency.symbol,
          color: chain.color,
          icon: chain.icon,
          balance,
          usd: balance * nativePriceUsd(chain.nativeCurrency.symbol, ethPrice),
          ok: true,
        };
      } catch {
        return {
          chainId: chain.id,
          name: chain.name,
          symbol: chain.nativeCurrency.symbol,
          color: chain.color,
          icon: chain.icon,
          balance: 0,
          usd: 0,
          ok: false,
        };
      }
    }),
  );
  return rows;
}

/** Native + (on GIWA Sepolia) known ERC-20 rows, each with a USD value. */
export async function fetchTokenRows(address: string, chainId: number): Promise<{ rows: TokenRow[]; totalUsd: number }> {
  const chain = getChainById(chainId);
  const symbol = chain?.nativeCurrency.symbol ?? 'GIWA';
  const prices = await getTokenPrices().catch(() => null);
  const ethPrice = prices?.get('WETH')?.price ?? getFallbackPrice('ETH');

  let native = 0;
  try {
    const hex = (await ethRpc(chain?.rpc || SUPPORTED_CHAINS[0].rpc, 'eth_getBalance', [address, 'latest'])) as string;
    native = weiHexToNumber(hex);
  } catch {}

  const rows: TokenRow[] = [
    {
      symbol,
      name: chain?.name || 'GIWA',
      address: 'native',
      balance: native,
      usd: native * nativePriceUsd(symbol, ethPrice),
      color: chain?.color || '#D97A5C',
      native: true,
    },
  ];

  if (chainId === 91342) {
    try {
      const erc20 = GIWA_TOKENS.filter((t) => t.address !== '0x0000000000000000000000000000000000000000');
      const tokens = await getTokenBalances(address, erc20.map((t) => t.address));
      for (const t of tokens) {
        const price = prices?.get(t.symbol)?.price ?? getFallbackPrice(t.symbol);
        const known = GIWA_TOKENS.find((k) => k.address.toLowerCase() === t.address.toLowerCase());
        rows.push({
          symbol: t.symbol,
          name: t.name || t.symbol,
          address: t.address,
          balance: Number(t.balance),
          usd: Number(t.balance) * price,
          color: known?.color || '#8B8B86',
          native: false,
        });
      }
    } catch {
      // token discovery is best-effort
    }
  }

  return { rows, totalUsd: rows.reduce((sum, r) => sum + r.usd, 0) };
}

function padAddressTopic(address: string): string {
  return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
}

function decodeAbiString(hex: string): string | undefined {
  try {
    const data = hex.replace('0x', '');
    if (data.length < 128) return undefined;
    const offset = parseInt(data.slice(0, 64), 16) * 2;
    const length = parseInt(data.slice(offset, offset + 64), 16);
    if (!Number.isFinite(length) || length === 0 || length > 256) return undefined;
    const bytes = data.slice(offset + 64, offset + 64 + length * 2);
    let str = '';
    for (let i = 0; i < bytes.length; i += 2) {
      const code = parseInt(bytes.slice(i, i + 2), 16);
      if (code > 0) str += String.fromCharCode(code);
    }
    return str || undefined;
  } catch {
    return undefined;
  }
}

/** Discovers ERC-721 contracts the address holds by scanning recent Transfer logs. */
export async function fetchNfts(address: string, chainId: number): Promise<NftItem[]> {
  const chain = getChainById(chainId);
  if (!chain) return [];
  try {
    const latestHex = (await ethRpc(chain.rpc, 'eth_blockNumber', [])) as string;
    const latest = Number(BigInt(latestHex));
    const fromBlock = Math.max(0, latest - NFT_LOG_RANGE);
    const logs = (await ethRpc(chain.rpc, 'eth_getLogs', [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: 'latest',
      topics: [ERC20_TRANSFER_TOPIC, undefined, padAddressTopic(address)],
    }])) as Array<{ address: string }> | null;

    if (!Array.isArray(logs) || logs.length === 0) return [];

    const contracts = Array.from(new Set(logs.map((l) => l.address))).slice(0, NFT_MAX_CONTRACTS);
    const items = await Promise.all(
      contracts.map(async (contract): Promise<NftItem | null> => {
        try {
          const [balanceHex, nameHex] = await Promise.all([
            // ERC-20/721 balanceOf and name() — selectors come from the pinned registry.
            ethRpc(chain.rpc, 'eth_call', [{ to: contract, data: ERC20_ABI.balanceOf + padAddressTopic(address).slice(2) }, 'latest']) as Promise<string>,
            ethRpc(chain.rpc, 'eth_call', [{ to: contract, data: ERC20_ABI.name }, 'latest']) as Promise<string>,
          ]);
          const balance = Number(BigInt(balanceHex || '0x0'));
          if (balance <= 0) return null;
          return { contract, balance, name: decodeAbiString(nameHex) };
        } catch {
          return null;
        }
      }),
    );
    return items.filter((i): i is NftItem => i !== null);
  } catch {
    return [];
  }
}

/** Recent transactions for an address, normalised from web3-middleware. */
export async function fetchActivity(address: string, chainId: number, limit = 15): Promise<ActivityTx[]> {
  try {
    const res = await fetch(`${MIDDLEWARE}/giwa/recent-txs/${address}?chain_id=${chainId}&limit=${limit}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const txs = Array.isArray(data?.txs) ? data.txs : Array.isArray(data) ? data : [];
    return normalizeActivity(txs, address);
  } catch {
    return [];
  }
}

/** Pure mapper: Blockscout/middleware tx shape → ActivityTx with direction. */
export function normalizeActivity(txs: unknown[], address: string): ActivityTx[] {
  const owner = address.toLowerCase();
  const out: ActivityTx[] = [];
  for (const raw of txs) {
    if (!raw || typeof raw !== 'object') continue;
    const tx = raw as Record<string, unknown>;
    const hash = typeof tx.hash === 'string' ? tx.hash : '';
    if (!hash) continue;
    const from = typeof tx.from === 'string' ? tx.from : '';
    const to = typeof tx.to === 'string' ? tx.to : null;
    const fromIsOwner = from.toLowerCase() === owner;
    const toIsOwner = !!to && to.toLowerCase() === owner;
    const tsRaw = tx.timestamp;
    const timestamp =
      typeof tsRaw === 'number' ? (tsRaw < 1e12 ? tsRaw * 1000 : tsRaw) :
      typeof tsRaw === 'string' ? Date.parse(tsRaw) || Date.now() :
      Date.now();
    out.push({
      hash,
      from,
      to,
      valueWei: String(tx.value ?? '0'),
      status: typeof tx.status === 'string' ? tx.status : 'ok',
      timestamp,
      method: typeof tx.method === 'string' ? tx.method : undefined,
      direction: fromIsOwner && toIsOwner ? 'self' : toIsOwner ? 'in' : 'out',
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

export interface IncomingResult {
  incoming: ActivityTx[];
  newestHash?: string;
}

/**
 * Returns txs arriving at `address` that are newer than `lastSeenTx`.
 * When nothing has been seen yet, only the most recent incoming tx is reported
 * (so the first poll never spams historic notifications).
 */
export function detectIncoming(txs: ActivityTx[], address: string, lastSeenTx?: string): IncomingResult {
  const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);
  const newestHash = sorted[0]?.hash;
  const incoming: ActivityTx[] = [];
  for (const tx of sorted) {
    if (tx.hash === lastSeenTx) break;
    const isOwner = tx.to?.toLowerCase() === address.toLowerCase();
    if (isOwner && tx.direction === 'in') incoming.push(tx);
  }
  if (!lastSeenTx && incoming.length > 1) {
    return { incoming: incoming.slice(0, 1), newestHash };
  }
  return { incoming, newestHash };
}

/** Scam Shield badge data (Blockscout risk via web3-middleware explorer). */
export async function fetchRisk(address: string, chainId: number): Promise<RiskInfo | null> {
  try {
    const res = await fetch(`${MIDDLEWARE}/explorer/address/${address}?chain_id=${chainId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    const risk = String(data.risk || '').toUpperCase();
    return {
      risk: risk === 'LOW' || risk === 'MEDIUM' || risk === 'HIGH' ? risk : 'UNKNOWN',
      isContract: !!data.is_contract,
      isVerified: !!data.is_verified,
      summary: String(data.summary || ''),
      txCount: typeof data.tx_count === 'number' ? data.tx_count : undefined,
      explorer: typeof data.explorer === 'string' ? data.explorer : undefined,
    };
  } catch {
    return null;
  }
}

/** Samples native balance at historical blocks for the portfolio sparkline. */
export async function fetchBalanceSeries(address: string, chainId: number, points = 16): Promise<BalancePoint[]> {
  const chain = getChainById(chainId);
  if (!chain) return [];
  try {
    const latest = Number(BigInt((await ethRpc(chain.rpc, 'eth_blockNumber', [])) as string));
    const span = Math.min(latest, 50000);
    const step = Math.max(1, Math.floor(span / Math.max(1, points - 1)));
    const blocks: number[] = [];
    for (let i = points - 1; i >= 0; i--) blocks.push(Math.max(0, latest - i * step));

    const results = await Promise.allSettled(
      blocks.map((b) => ethRpc(chain.rpc, 'eth_getBalance', [address, `0x${b.toString(16)}`])),
    );
    const series: BalancePoint[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && typeof r.value === 'string') {
        series.push({ block: blocks[i], balance: weiHexToNumber(r.value) });
      }
    });
    return series;
  } catch {
    return [];
  }
}

/** Fallback series: cumulative native value moved, derived from activity. */
export function seriesFromActivity(txs: ActivityTx[]): number[] {
  const ordered = [...txs].sort((a, b) => a.timestamp - b.timestamp);
  let running = 0;
  const values: number[] = [];
  for (const tx of ordered) {
    const value = Number(tx.valueWei) / 1e18 || 0;
    if (tx.direction === 'in') running += value;
    else if (tx.direction === 'out') running -= value;
    values.push(running);
  }
  return values;
}

/** Normalised polyline for an SVG sparkline. Pure geometry — unit tested. */
export function sparklinePath(values: number[], width: number, height: number, pad = 3): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `M ${pad} ${height / 2} L ${width - pad} ${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW;
      const y = pad + (1 - (v - min) / range) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function formatAmount(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (Math.abs(n) < 1e-6) return '<0.000001';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ✅ COMPLIES WITH: AGENTS.md §12.1, §12.4 (read-only queries; risk check via explorer)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
