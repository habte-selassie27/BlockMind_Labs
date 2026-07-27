export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpc: string;
  explorer: string;
  explorerApi?: string;
  color: string;
  icon: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 91342,
    name: 'GIWA Sepolia',
    shortName: 'GIWA',
    symbol: 'GIWA',
    rpc: 'https://sepolia-rpc.giwa.io',
    explorer: 'https://sepolia-explorer.giwa.io',
    color: '#D97A5C',
    icon: '⚡',
    isTestnet: true,
    nativeCurrency: { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
  },
  {
    id: 9134,
    name: 'GIWA Mainnet',
    shortName: 'GIWA',
    symbol: 'GIWA',
    rpc: 'https://rpc.giwa.io',
    explorer: 'https://explorer.giwa.io',
    color: '#D97A5C',
    icon: '⚡',
    isTestnet: false,
    nativeCurrency: { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'ARB',
    symbol: 'ETH',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    color: '#28A0F0',
    icon: '🔵',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    id: 11155420,
    name: 'OP Sepolia',
    shortName: 'OP',
    symbol: 'ETH',
    rpc: 'https://sepolia.optimism.io',
    explorer: 'https://sepolia-optimistic.etherscan.io',
    color: '#FF0420',
    icon: '🔴',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'BASE',
    symbol: 'ETH',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    color: '#0052FF',
    icon: '🔵',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
];

export function getChainById(id: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(c => c.id === id);
}

export function getChainByName(name: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(c =>
    c.name.toLowerCase() === name.toLowerCase() ||
    c.shortName.toLowerCase() === name.toLowerCase()
  );
}

export function getTestnets(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter(c => c.isTestnet);
}

export function getMainnets(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter(c => !c.isTestnet);
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const chain = getChainById(chainId);
  if (!chain) return `https://sepolia-explorer.giwa.io/tx/${txHash}`;
  return `${chain.explorer}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const chain = getChainById(chainId);
  if (!chain) return `https://sepolia-explorer.giwa.io/address/${address}`;
  return `${chain.explorer}/address/${address}`;
}
