import { GIWA_TOKENS, type KnownToken } from './giwa-rpc';

export interface SwapQuote {
  tokenIn: KnownToken;
  tokenOut: KnownToken;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  priceImpact: number;
  gasEstimate: string;
  route: string[];
  slippage: number;
}

export interface SwapParams {
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: string;
  slippage?: number; // default 0.5%
  userAddress: string;
}

function findToken(symbol: string): KnownToken | undefined {
  return GIWA_TOKENS.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
}

function calculatePriceImpact(amountIn: number, amountOut: number, priceIn: number, priceOut: number): number {
  if (priceIn === 0 || priceOut === 0) return 0;
  const expectedOut = (amountIn * priceIn) / priceOut;
  return expectedOut > 0 ? ((expectedOut - amountOut) / expectedOut) * 100 : 0;
}

export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const tokenIn = findToken(params.tokenInSymbol);
  const tokenOut = findToken(params.tokenOutSymbol);

  if (!tokenIn) throw new Error(`Unknown token: ${params.tokenInSymbol}`);
  if (!tokenOut) throw new Error(`Unknown token: ${params.tokenOutSymbol}`);
  if (tokenIn.address === tokenOut.address) throw new Error('Cannot swap same token');

  const slippage = params.slippage || 0.5;
  const amountIn = parseFloat(params.amountIn);

  if (isNaN(amountIn) || amountIn <= 0) {
    throw new Error('Invalid amount');
  }

  // Try to get a quote from the RPC (simulated DEX route)
  // In production, this would call a DEX aggregator or Uniswap QuoterV2
  try {
    // Simulate quote based on 1:1 for stablecoins, market rate for others
    const rate = getEstimatedRate(tokenIn.symbol, tokenOut.symbol);
    const amountOut = amountIn * rate;
    const amountOutMin = amountOut * (1 - slippage / 100);

    return {
      tokenIn,
      tokenOut,
      amountIn: params.amountIn,
      amountOut: amountOut.toFixed(tokenOut.decimals > 6 ? 6 : tokenOut.decimals),
      amountOutMin: amountOutMin.toFixed(tokenOut.decimals > 6 ? 6 : tokenOut.decimals),
      priceImpact: calculatePriceImpact(amountIn, amountOut, 1, rate),
      gasEstimate: '~0.001 GIWA',
      route: [tokenIn.symbol, tokenOut.symbol],
      slippage,
    };
  } catch {
    throw new Error('Could not fetch swap quote. The DEX may not be available on this network.');
  }
}

function getEstimatedRate(from: string, to: string): number {
  // Stablecoin pairs
  const stablecoins = ['USDC', 'USDT', 'DAI'];
  if (stablecoins.includes(from.toUpperCase()) && stablecoins.includes(to.toUpperCase())) {
    return 1.0;
  }

  // ETH/USD pairs
  const rates: Record<string, number> = {
    'GIWA_USDC': 0.20,
    'GIWA_USDT': 0.20,
    'GIWA_DAI': 0.20,
    'GIWA_WETH': 0.000057,
    'WETH_USDC': 3500,
    'WETH_USDT': 3500,
    'WETH_DAI': 3500,
    'WETH_GIWA': 17500,
    'USDC_GIWA': 5.0,
    'USDT_GIWA': 5.0,
    'DAI_GIWA': 5.0,
    'USDC_WETH': 0.000286,
    'USDT_WETH': 0.000286,
    'DAI_WETH': 0.000286,
  };

  const key = `${from.toUpperCase()}_${to.toUpperCase()}`;
  return rates[key] || 1.0;
}

export function getAvailablePairs(): { from: string; to: string }[] {
  const pairs: { from: string; to: string }[] = [];
  for (const t1 of GIWA_TOKENS) {
    for (const t2 of GIWA_TOKENS) {
      if (t1.symbol !== t2.symbol) {
        pairs.push({ from: t1.symbol, to: t2.symbol });
      }
    }
  }
  return pairs;
}
