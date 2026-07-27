import { GIWA_TOKENS } from './giwa-rpc';

const DEFILLAMA_API = 'https://coins.llama.fi/prices';

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  confidence: number;
  source: string;
}

interface CoinPrice {
  coins: Record<string, {
    price: number;
    confidence: number;
    symbol: string;
    timestamp: number;
  }>;
}

const priceCache = new Map<string, { price: number; ts: number }>();

export async function getTokenPrices(): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();

  // Build CoinGecko IDs list from known tokens
  const coinIds = GIWA_TOKENS
    .filter(t => t.coingeckoId)
    .map(t => `coingecko:${t.coingeckoId}`);

  if (coinIds.length === 0) return prices;

  try {
    const res = await fetch(`${DEFILLAMA_API}/${coinIds.join(',')}`);
    if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
    const data: CoinPrice = await res.json();

    for (const token of GIWA_TOKENS) {
      if (!token.coingeckoId) continue;
      const key = `coingecko:${token.coingeckoId}`;
      const coinData = data.coins[key];
      if (coinData) {
        const cached = priceCache.get(token.symbol);
        const prevPrice = cached?.price || coinData.price;
        const change24h = prevPrice > 0
          ? ((coinData.price - prevPrice) / prevPrice) * 100
          : 0;

        prices.set(token.symbol, {
          symbol: token.symbol,
          price: coinData.price,
          change24h: Math.abs(change24h) > 100 ? 0 : change24h, // reset if unrealistic
          confidence: coinData.confidence,
          source: 'DeFiLlama',
        });

        priceCache.set(token.symbol, { price: coinData.price, ts: Date.now() });
      }
    }
  } catch (err) {
    console.error('Price feed error:', err);
    // Return cached prices if available
    for (const token of GIWA_TOKENS) {
      const cached = priceCache.get(token.symbol);
      if (cached) {
        prices.set(token.symbol, {
          symbol: token.symbol,
          price: cached.price,
          change24h: 0,
          confidence: 0.5,
          source: 'cache',
        });
      }
    }
  }

  return prices;
}

export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  const prices = await getTokenPrices();
  return prices.get(symbol.toUpperCase()) || null;
}

export function getFallbackPrice(symbol: string): number {
  const fallbacks: Record<string, number> = {
    GIWA: 0.20,
    USDC: 1.00,
    USDT: 1.00,
    WETH: 3500,
    DAI: 1.00,
    ETH: 3500,
  };
  return fallbacks[symbol.toUpperCase()] || 0;
}
