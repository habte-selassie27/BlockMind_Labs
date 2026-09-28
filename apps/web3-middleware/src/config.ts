export const GIWA_CHAINS = {
  mainnet: {
    chainId: 9134,
    name: 'GIWA',
    rpcUrl: process.env.GIWA_RPC_URL || 'https://rpc.giwa.io',
    explorerUrl: process.env.GIWA_EXPLORER_URL || 'https://explorer.giwa.io',
    playgroundUrl: process.env.GIWA_PLAYGROUND_URL || 'https://playground.giwa.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockTime: 1,
  },
  sepolia: {
    chainId: 91342,
    name: 'GIWA Sepolia',
    rpcUrl: process.env.GIWA_RPC_URL || 'https://sepolia-rpc.giwa.io',
    explorerUrl: process.env.GIWA_EXPLORER_URL || 'https://sepolia-explorer.giwa.io',
    playgroundUrl: process.env.GIWA_PLAYGROUND_URL || 'https://sepolia-playground.giwa.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockTime: 1,
  },
} as const;

export const GIWA_CONFIG = {
  rpcUrl: process.env.GIWA_RPC_URL || 'https://sepolia-rpc.giwa.io',
  explorerUrl: process.env.GIWA_EXPLORER_URL || 'https://sepolia-explorer.giwa.io',
  playgroundUrl: process.env.GIWA_PLAYGROUND_URL || 'https://sepolia-playground.giwa.io',
  coingeckoUrl: process.env.COINGECKO_URL || 'https://api.coingecko.com/api/v3',
} as const;

export type GiwaChain = typeof GIWA_CHAINS.mainnet | typeof GIWA_CHAINS.sepolia;

export function getChainConfig(network: 'mainnet' | 'sepolia'): GiwaChain {
  return GIWA_CHAINS[network];
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: web3-middleware
