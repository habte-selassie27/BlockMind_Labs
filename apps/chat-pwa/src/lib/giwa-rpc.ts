const GIWA_RPC = 'https://sepolia-rpc.giwa.io';

export interface RpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result: T;
  error?: { code: number; message: string };
}

export async function rpcCall<T = string>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(GIWA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  });
  const data: RpcResponse<T> = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// ── Native Balance ──────────────────────────────────────────────

export async function getBalance(address: string): Promise<string> {
  const hex = await rpcCall<string>('eth_getBalance', [address, 'latest']);
  return (parseInt(hex, 16) / 1e18).toFixed(6);
}

// ── Gas ─────────────────────────────────────────────────────────

export async function getGasPrice(): Promise<{ slow: string; standard: string; fast: string }> {
  const hex = await rpcCall<string>('eth_gasPrice');
  const base = parseInt(hex, 16);
  const toGwei = (wei: number) => (wei / 1e9).toFixed(6);
  return {
    slow: toGwei(base * 0.8),
    standard: toGwei(base),
    fast: toGwei(base * 1.5),
  };
}

export async function getBlockNumber(): Promise<number> {
  const hex = await rpcCall<string>('eth_blockNumber');
  return parseInt(hex, 16);
}

export async function getTxReceipt(hash: string): Promise<{
  status: string;
  gasUsed: string;
  blockNumber: string;
} | null> {
  try {
    return await rpcCall('eth_getTransactionReceipt', [hash]);
  } catch {
    return null;
  }
}

export async function getRecentBlocks(count: number = 5): Promise<{ number: number; timestamp: number; txCount: number }[]> {
  const latest = await getBlockNumber();
  const blocks = [];
  for (let i = 0; i < count; i++) {
    try {
      const block = await rpcCall<{
        number: string;
        timestamp: string;
        transactions: string[];
      }>('eth_getBlockByNumber', [`0x${(latest - i).toString(16)}`, true]);
      blocks.push({
        number: parseInt(block.number, 16),
        timestamp: parseInt(block.timestamp, 16),
        txCount: block.transactions.length,
      });
    } catch {
      break;
    }
  }
  return blocks;
}

// ── ERC-20 Token Queries ───────────────────────────────────────

const ERC20_ABI = {
  balanceOf: '0x70a08231', // balanceOf(address)
  decimals: '0x313ce567',   // decimals()
  symbol: '0x95d89e4e',     // symbol()
  name: '0x06fdde03',       // name()
  totalSupply: '0x18160ddd', // totalSupply()
};

function encodeAddress(addr: string): string {
  return addr.toLowerCase().replace('0x', '').padStart(64, '0');
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceRaw: bigint;
}

export async function getTokenBalance(
  walletAddress: string,
  tokenAddress: string
): Promise<TokenInfo> {
  const [balanceHex, decimalsHex, symbolHex, nameHex] = await Promise.all([
    rpcCall<string>('eth_call', [
      { to: tokenAddress, data: ERC20_ABI.balanceOf + encodeAddress(walletAddress) },
      'latest',
    ]),
    rpcCall<string>('eth_call', [
      { to: tokenAddress, data: ERC20_ABI.decimals },
      'latest',
    ]),
    rpcCall<string>('eth_call', [
      { to: tokenAddress, data: ERC20_ABI.symbol },
      'latest',
    ]),
    rpcCall<string>('eth_call', [
      { to: tokenAddress, data: ERC20_ABI.name },
      'latest',
    ]),
  ]);

  const decimals = parseInt(decimalsHex, 16);
  const balanceRaw = BigInt(balanceHex);
  const balance = (Number(balanceRaw) / 10 ** decimals).toFixed(6);

  return {
    address: tokenAddress,
    symbol: decodeAbiString(symbolHex),
    name: decodeAbiString(nameHex),
    decimals,
    balance,
    balanceRaw,
  };
}

export async function getTokenBalances(
  walletAddress: string,
  tokenAddresses: string[]
): Promise<TokenInfo[]> {
  const results = await Promise.allSettled(
    tokenAddresses.map(addr => getTokenBalance(walletAddress, addr))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<TokenInfo> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(t => t.balance !== '0.000000');
}

function decodeAbiString(hex: string): string {
  try {
    const data = hex.replace('0x', '');
    const offset = parseInt(data.slice(0, 64), 16) * 2;
    const length = parseInt(data.slice(offset, offset + 64), 16);
    const bytes = data.slice(offset + 64, offset + 64 + length * 2);
    let str = '';
    for (let i = 0; i < bytes.length; i += 2) {
      const code = parseInt(bytes.slice(i, i + 2), 16);
      if (code > 0) str += String.fromCharCode(code);
    }
    return str;
  } catch {
    return 'Unknown';
  }
}

// ── Known Tokens on GIWA ───────────────────────────────────────

export interface KnownToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  coingeckoId?: string;
}

export const GIWA_TOKENS: KnownToken[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'GIWA',
    name: 'GIWA',
    decimals: 18,
    color: '#D97A5C',
    coingeckoId: 'ethereum',
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    color: '#2775CA',
    coingeckoId: 'usd-coin',
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    color: '#26A17B',
    coingeckoId: 'tether',
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    color: '#627EEA',
    coingeckoId: 'weth',
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    color: '#F5AC37',
    coingeckoId: 'dai',
  },
];

export function getTokenBySymbol(symbol: string): KnownToken | undefined {
  return GIWA_TOKENS.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
}

export function getTokenByAddress(address: string): KnownToken | undefined {
  return GIWA_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

// ── Formatting Helpers ──────────────────────────────────────────

export function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTokenAmount(amount: string, decimals: number = 4): string {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';
  return num.toFixed(decimals);
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
