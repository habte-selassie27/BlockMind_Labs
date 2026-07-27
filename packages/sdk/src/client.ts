export interface BlockmindConfig {
  apiKey: string;
  network?: 'mainnet' | 'testnet';
  baseUrl?: string;
}

export interface IntentRequest {
  input: string;
  language?: string;
  context?: Record<string, unknown>;
}

export interface IntentResponse {
  intent_class: string;
  confidence: number;
  slots: Record<string, unknown>;
  ambiguities: string[];
  suggested_clarification: string | null;
  raw_input: string;
  language_detected: string;
  is_flagged: boolean;
}

export interface AgentRequest {
  input: string;
  session_id?: string;
  context?: Record<string, unknown>;
}

export interface AgentResponse {
  session_id: string;
  response: string;
  requires_confirmation?: boolean;
  confirmation_token?: string;
  tx_summary?: Record<string, unknown>;
  tools_called?: string[];
}

export interface TransactionRequest {
  chainId: number;
  from: string;
  to: string;
  value?: string;
  data?: string;
}

export interface TransactionResponse {
  hash: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  status: 'submitted' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
}

export interface BalanceResponse {
  address: string;
  chainId: number;
  balance: string;
  token?: string;
  tokenBalance?: string;
}

export interface ConfirmRequest {
  session_id: string;
  confirmation_token: string;
  approved: boolean;
}

export class BlockmindClient {
  private apiKey: string;
  private baseUrl: string;
  private network: string;

  constructor(config: BlockmindConfig) {
    this.apiKey = config.apiKey;
    this.network = config.network || 'testnet';
    const bases = {
      mainnet: 'https://api.blockmind.io/v1',
      testnet: 'https://testnet-api.blockmind.io/v1',
    };
    this.baseUrl = config.baseUrl || bases[this.network as keyof typeof bases] || bases.testnet;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new BlockmindError(error.error?.code || 'UNKNOWN', error.error?.message || res.statusText, res.status);
    }

    return res.json();
  }

  // Intent API
  async parseIntent(input: string, options?: { language?: string; context?: Record<string, unknown> }): Promise<IntentResponse> {
    return this.request<IntentResponse>('/intent/parse', {
      method: 'POST',
      body: JSON.stringify({ input, language: options?.language, context: options?.context }),
    });
  }

  // Agent API
  async executeAgent(input: string, options?: { session_id?: string; context?: Record<string, unknown> }): Promise<AgentResponse> {
    return this.request<AgentResponse>('/agent/execute', {
      method: 'POST',
      body: JSON.stringify({ input, session_id: options?.session_id, context: options?.context }),
    });
  }

  async confirmAgent(sessionId: string, confirmationToken: string, approved: boolean): Promise<AgentResponse> {
    return this.request<AgentResponse>('/agent/confirm', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, confirmation_token: confirmationToken, approved }),
    });
  }

  async cancelAgent(sessionId: string): Promise<{ cancelled: boolean }> {
    return this.request<{ cancelled: boolean }>(`/agent/cancel/${sessionId}`, { method: 'POST' });
  }

  // Chain API
  async getBalance(address: string, chainId: number = 91342): Promise<BalanceResponse> {
    return this.request<BalanceResponse>(`/chain/balance/${address}?chainId=${chainId}`);
  }

  async simulateTransaction(tx: TransactionRequest): Promise<{ success: boolean; gasUsed: string; revertReason?: string }> {
    return this.request('/chain/simulate', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  async signAndSubmit(tx: TransactionRequest): Promise<TransactionResponse> {
    return this.request<TransactionResponse>('/chain/sign-and-submit', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  // Session API
  async getSessionHistory(sessionId: string): Promise<Array<{ role: string; content: string; timestamp: number }>> {
    return this.request(`/agent/sessions/${sessionId}/history`);
  }

  // Health
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request('/health');
  }
}

export class BlockmindError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'BlockmindError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ✅ COMPLIES WITH: AGENTS.md §2
// ✅ SERVICE: @blockmind/sdk
// ✅ ARCHITECT SPEC: P2-05 SDK v0.1
