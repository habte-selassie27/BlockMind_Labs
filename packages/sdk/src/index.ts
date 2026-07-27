export interface BlockmindConfig {
  apiUrl: string;
  walletAddress?: string;
  chainId?: number;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  requiresConfirmation?: boolean;
  confirmation?: {
    token: string;
    summary: Record<string, unknown>;
  };
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class BlockmindClient {
  private config: BlockmindConfig;
  private sessionId: string | null = null;

  constructor(config: BlockmindConfig) {
    this.config = config;
  }

  async chat(message: string): Promise<AgentResponse> {
    const res = await fetch(`${this.config.apiUrl}/agent/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: this.sessionId,
        wallet_address: this.config.walletAddress,
        chain_id: this.config.chainId || 91342,
      }),
    });

    if (!res.ok) {
      throw new Error(`Blockmind API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.session_id) {
      this.sessionId = data.session_id;
    }

    return {
      content: data.response?.content || '',
      toolCalls: data.response?.tool_calls,
      requiresConfirmation: data.requires_confirmation,
      confirmation: data.response?.confirmation,
    };
  }

  async confirmTransaction(token: string, approved: boolean): Promise<void> {
    await fetch(`${this.config.apiUrl}/agent/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        confirmation_token: token,
        approved,
      }),
    });
  }

  setWallet(address: string, chainId?: number) {
    this.config.walletAddress = address;
    if (chainId) this.config.chainId = chainId;
  }

  resetSession() {
    this.sessionId = null;
  }
}

export function createBlockmind(config: BlockmindConfig): BlockmindClient {
  return new BlockmindClient(config);
}

export type { BlockmindClient };
