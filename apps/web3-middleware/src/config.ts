export const GIWA_CHAINS = {
  mainnet: {
    chainId: 9134,
    name: 'GIWA',
    rpcUrl: 'https://rpc.giwa.io',
    explorerUrl: 'https://explorer.giwa.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockTime: 1,
  },
  sepolia: {
    chainId: 91342,
    name: 'GIWA Sepolia',
    rpcUrl: 'https://sepolia-rpc.giwa.io',
    explorerUrl: 'https://sepolia-explorer.giwa.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockTime: 1,
  },
} as const;

export type GiwaChain = typeof GIWA_CHAINS.mainnet | typeof GIWA_CHAINS.sepolia;

export function getChainConfig(network: 'mainnet' | 'sepolia'): GiwaChain {
  return GIWA_CHAINS[network];
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: web3-middleware
