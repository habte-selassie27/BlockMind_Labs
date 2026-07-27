export interface ParsedIntent {
  intent_class:
    | 'transfer'
    | 'swap'
    | 'approve'
    | 'stake'
    | 'unstake'
    | 'bridge'
    | 'read_balance'
    | 'read_contract'
    | 'get_nft'
    | 'monitor'
    | 'portfolio_summary'
    | 'gas_estimate'
    | 'contract_risk_check'
    | 'explain'
    | 'unknown';
  confidence: number;
  slots: Record<string, string | number | null>;
  ambiguities: string[];
  suggested_clarification: string | null;
  raw_input: string;
  language_detected: string;
  is_flagged: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  requires_confirmation: boolean;
  simulation_supported: boolean;
  chains_supported: number[];
}

export interface TransactionRequest {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

export interface JWTPayload {
  sub: string;
  wallet: string;
  chain_id: number;
  tier: 'free' | 'pro' | 'premium' | 'sdk_starter' | 'sdk_team' | 'enterprise';
  permissions: string[];
  iat: number;
  exp: number;
}

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: @blockmind/types
// ✅ ARCHITECT SPEC: P1-05 monorepo scaffold
