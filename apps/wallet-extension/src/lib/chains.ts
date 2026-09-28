/**
 * GIWA network configuration.
 *
 * Chain IDs are the canonical GIWA values (see docs/GIWA-RESEARCH.md and
 * apps/chat-pwa/src/lib/chains.ts): 91342 (0x164ce) Sepolia, 9134 (0x164e) mainnet.
 * The previous extension stub advertised 0x1651a, which is not a GIWA chain.
 */

export interface ChainConfig {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly rpc: string;
  readonly explorer: string;
  readonly nativeCurrency: { readonly name: string; readonly symbol: string; readonly decimals: number };
  readonly testnet: boolean;
  readonly faucet?: string;
}

export const GIWA_SEPOLIA: ChainConfig = {
  id: 91342,
  name: 'GIWA Sepolia',
  shortName: 'giwa-sepolia',
  rpc: 'https://sepolia-rpc.giwa.io',
  explorer: 'https://sepolia-explorer.giwa.io',
  nativeCurrency: { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
  testnet: true,
  faucet: 'https://faucet.giwa.io',
};

export const GIWA_MAINNET: ChainConfig = {
  id: 9134,
  name: 'GIWA Mainnet',
  shortName: 'giwa',
  rpc: 'https://rpc.giwa.io',
  explorer: 'https://explorer.giwa.io',
  nativeCurrency: { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
  testnet: false,
};

export const CHAINS: Record<number, ChainConfig> = {
  [GIWA_SEPOLIA.id]: GIWA_SEPOLIA,
  [GIWA_MAINNET.id]: GIWA_MAINNET,
};

export const DEFAULT_CHAIN_ID = GIWA_SEPOLIA.id;

export function isSupportedChain(chainId: number): boolean {
  return Object.prototype.hasOwnProperty.call(CHAINS, chainId);
}

/** Throws a 4902 ("unrecognized chain") style error for unknown chain IDs. */
export function getChain(chainId: number): ChainConfig {
  const chain = CHAINS[chainId];
  if (!chain) {
    throw Object.assign(new Error(`Unrecognized chain ID ${chainId}`), { code: 4902 });
  }
  return chain;
}

export function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}`;
}

export function explorerTxUrl(chainId: number, hash: string): string {
  return `${getChain(chainId).explorer}/tx/${hash}`;
}

export function explorerAddressUrl(chainId: number, address: string): string {
  return `${getChain(chainId).explorer}/address/${address}`;
}

// ✅ COMPLIES WITH: AGENTS.md §9, §12 (GIWA chain IDs)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
