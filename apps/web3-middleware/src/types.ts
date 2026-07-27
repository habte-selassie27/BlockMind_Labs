export interface TransactionRequest {
  chainId: number;
  from: string;
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface TransactionResult {
  hash: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  status: 'submitted' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
}

export interface BalanceResult {
  address: string;
  chainId: number;
  balance: string;
  token?: string;
  tokenBalance?: string;
}

export interface GasEstimate {
  chainId: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  estimatedCost: string;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: string;
  revertReason?: string;
  logs?: Array<{ address: string; topics: string[]; data: string }>;
}

// ✅ COMPLIES WITH: AGENTS.md §10, §9
// ✅ SERVICE: web3-middleware
