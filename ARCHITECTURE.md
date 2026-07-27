# ARCHITECTURE.md — Blockmind Labs
## Technical Architecture Reference

**Version:** 1.0.0  
**Author:** Habte Selassie Fitsum  
**Last Updated:** 2025-07-20  
**Classification:** Engineering — Internal

---

## 1. Architecture Principles

These principles govern every design decision in Blockmind Labs. When two decisions conflict, the principle with the lower number wins.

1. **Safety over speed** — No AI-initiated on-chain action executes without deterministic simulation and user confirmation. Latency is acceptable; accidental transactions are not.
2. **Stateless services, stateful stores** — All services are stateless and horizontally scalable. State lives exclusively in PostgreSQL, MongoDB, Redis, or Weaviate.
3. **Isolation of key material** — The `wallet-signer` service is the only component that ever touches private key material. It has no inbound connections from the public internet and no outbound connections except to chain RPC endpoints.
4. **LLM is the brain, not the hands** — The LLM orchestrator generates action plans and tool_call instructions. It never directly interacts with signing or submission systems. Execution is always mediated by typed tool interfaces.
5. **Fallback at every external boundary** — Every external dependency (LLM API, RPC node, vector DB) has a documented fallback with automatic failover. No single third-party can take the product offline.
6. **Observability as a first-class requirement** — Every service emits structured JSON logs and Prometheus metrics from day one. Observability is not added post-launch.

---

## 2. Component Architecture

### 2.1 Full Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  Blockmind Chat │  │  GIWA Wallet     │  │  External dApp via SDK │  │
│  │  (React PWA)    │  │  Plugin (Ext.)   │  │  (npm: @blockmind/sdk) │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────────┬────────────┘  │
└───────────┼──────────────────┼──────────────────────────┼───────────────┘
            │ WSS + HTTPS       │ HTTPS                    │ HTTPS
            └──────────────────┼──────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                           API GATEWAY                                    │
│              Fastify · Rate Limiting · JWT Auth · CORS                  │
│              Request routing · WebSocket upgrade · Metering              │
└────┬──────────────┬────────────────┬───────────────────┬─────────────────┘
     │              │                │                   │
     ▼              ▼                ▼                   ▼
┌─────────┐  ┌───────────┐  ┌──────────────┐  ┌────────────────┐
│ Intent  │  │  Agent    │  │  Analytics   │  │  SDK Proxy     │
│ Service │  │  Runtime  │  │  Service     │  │  Service       │
│ (Py)    │  │  (Node)   │  │  (Py)        │  │  (Node)        │
└────┬────┘  └─────┬─────┘  └──────┬───────┘  └────────────────┘
     │             │               │
     │   ┌─────────┘               │
     ▼   ▼                         │
┌────────────────┐  ┌──────────────┐
│  Memory        │  │  Notification│
│  Service (Py)  │  │  Service     │
└───────┬────────┘  └──────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        WEB3 MIDDLEWARE LAYER                              │
│                                                                           │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  RPC           │  │  TX Builder  │  │  Gas Oracle  │  │  Event     │  │
│  │  Abstraction   │  │              │  │              │  │  Listener  │  │
│  └────────┬───────┘  └──────┬───────┘  └──────────────┘  └─────┬──────┘  │
│           │                 │                                   │         │
│           └─────────────────┼───────────────────────────────────┘         │
│                             │                                             │
│  ┌──────────────────────────▼──────────────────────┐                      │
│  │                  Wallet Signer (Rust)            │                      │
│  │   HSM-backed · Isolated network · Zero egress    │                      │
│  │   except to approved RPC endpoints               │                      │
│  └─────────────────────────────────────────────────┘                      │
└───────────────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼─────────────────┐
            ▼                ▼                 ▼
      GIWA Chain         EVM Chains       Solana/Move
      (Primary)        (ETH, BNB,        (Phase 4)
                        Polygon...)
```

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA PLANE                                │
│                                                                 │
│  PostgreSQL 16              MongoDB 7           Redis 7         │
│  ├── users                  ├── conversations   ├── sessions    │
│  ├── subscriptions          ├── intent_logs     ├── rate_limits │
│  ├── api_keys               ├── agent_memory    ├── chain_cache │
│  ├── audit_logs             └── tx_summaries    ├── job_queues  │
│  ├── tx_records                                 └── pub/sub     │
│  └── enterprise_orgs                                            │
│                                                                 │
│  Weaviate (Vector)          S3-compatible        BullMQ         │
│  ├── user_memory_embed      ├── sdk_artifacts    ├── tx_retry   │
│  ├── contract_knowledge     ├── audit_exports    ├── notifs     │
│  └── intent_examples        └── log_archive      └── analytics  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Specifications

### 3.1 API Gateway (`api-gateway`)

**Runtime:** Node.js 20 LTS  
**Framework:** Fastify 4  
**Responsibility:** Single entry point for all client traffic.

**Key Responsibilities:**
- JWT validation (RS256) on every protected route
- API key validation for SDK routes (`bm_live_*`, `bm_test_*`)
- Rate limiting (Redis sliding window, per user + per IP)
- Request routing to downstream microservices
- WebSocket upgrade management for real-time chat
- Request/response logging with trace IDs
- CORS policy enforcement
- OpenAPI spec exposure at `/docs`

**Critical Config:**
```typescript
const RATE_LIMIT = {
  free:        { chat: 50/month,  sdk: 0,           reads: 100/hr },
  pro:         { chat: Infinity,  sdk: 0,           reads: 1000/hr },
  sdk_starter: { chat: 0,        sdk: 10_000/mo,   reads: 500/hr },
  sdk_team:    { chat: 0,        sdk: 100_000/mo,  reads: 5000/hr },
};

const TIMEOUT = {
  intent_service:    5_000,   // ms
  agent_runtime:    30_000,   // ms (LLM can be slow)
  web3_middleware:  10_000,
  wallet_signer:     5_000,
};
```

---

### 3.2 Intent Service (`intent-service`)

**Runtime:** Python 3.12  
**Framework:** FastAPI  
**Model:** Fine-tuned Llama 3 8B (local) → GPT-4o (cloud fallback)

**Intent Classification Output Schema:**
```python
class ParsedIntent(BaseModel):
    intent_class: Literal[
        "transfer", "swap", "approve", "stake", "unstake",
        "bridge", "read_balance", "read_contract", "get_nft",
        "monitor", "portfolio_summary", "gas_estimate",
        "contract_risk_check", "explain", "unknown"
    ]
    confidence: float                      # 0.0 – 1.0
    slots: dict[str, str | float | None]   # extracted parameters
    ambiguities: list[str]                 # fields needing clarification
    suggested_clarification: str | None    # question to ask user
    raw_input: str
    language_detected: str
```

**Slot Examples by Intent:**
```python
# transfer
slots = { "token": "GIWA", "amount": 10.0, "recipient": "0xabc..." }

# swap
slots = { "from_token": "GIWA", "to_token": "USDC", "amount": 50.0, "slippage": 0.5 }

# stake
slots = { "token": "GIWA", "amount": 100.0, "protocol": "giwa-staking-v2" }
```

**Performance Targets:**
- P95 parse latency: ≤500ms (local model), ≤1,200ms (cloud model)
- Intent accuracy on benchmark set: ≥92%
- Slot fill accuracy: ≥88% on benchmark set

---

### 3.3 Agent Runtime (`agent-runtime`)

**Runtime:** Node.js 20 LTS  
**Framework:** Express + LangChain.js  
**LLM Primary:** OpenAI GPT-4o via function calling  
**LLM Fallback:** Together.ai Llama 3 70B

**Agent Execution Flow:**
```typescript
async function executeAgentCycle(input: AgentInput): Promise<AgentResult> {
  // 1. Load user context from memory-service
  const context = await memoryService.loadContext(input.userId);

  // 2. Build system prompt with available tools + user context
  const systemPrompt = buildSystemPrompt(context, TOOL_DEFINITIONS);

  // 3. Call LLM with tool definitions (function calling)
  const llmResponse = await llmClient.complete({
    messages: [...context.recentHistory, { role: 'user', content: input.message }],
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
  });

  // 4. If tool calls requested, validate and execute each
  for (const toolCall of llmResponse.tool_calls) {
    await validateToolCallPermissions(toolCall, input.userId, input.userTier);
    
    if (TOOL_REGISTRY[toolCall.name].requires_confirmation) {
      // Pause cycle, return confirmation request to user
      return buildConfirmationResponse(toolCall, llmResponse.content);
    }
    
    const toolResult = await TOOL_REGISTRY[toolCall.name].execute(toolCall.arguments);
    // Feed result back to LLM for final response
  }

  // 5. Save interaction to memory
  await memoryService.saveInteraction(input.userId, input.message, llmResponse.content);

  return { response: llmResponse.content, tool_calls_executed: [...] };
}
```

**Tool Permission Matrix:**

| Tool | Free | Pro | SDK Starter | SDK Team | Enterprise |
|---|---|---|---|---|---|
| `get_balance` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `transfer_token` | ✅ (cap $100) | ✅ (cap $500) | ❌ | ✅ | ✅ |
| `swap_tokens` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `approve_token` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `check_contract_risk` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `monitor_address` | ❌ | ✅ (5 max) | ✅ (3 max) | ✅ (50 max) | ✅ |
| `read_contract` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### 3.4 Web3 Middleware (`web3-middleware`)

**Runtime:** Node.js 20 LTS  
**Framework:** Fastify  
**Libraries:** viem 2.x, ethers 6.x (EVM); GIWA SDK (custom)

**RPC Provider Strategy:**
```typescript
const RPC_PROVIDERS = {
  giwa: [
    { url: process.env.GIWA_RPC_PRIMARY, weight: 10 },
    { url: process.env.GIWA_RPC_SECONDARY, weight: 5 },
    { url: process.env.GIWA_RPC_FALLBACK, weight: 1 },
  ],
  ethereum: [
    { url: process.env.ALCHEMY_ETH_RPC, weight: 10 },
    { url: process.env.INFURA_ETH_RPC, weight: 5 },
  ],
  // ...
};

// Weighted round-robin with circuit breaker per provider
const rpcRouter = new RPCRouter(RPC_PROVIDERS, {
  circuitBreaker: { threshold: 3, resetTimeout: 30_000 },
  timeout: 8_000,
  retries: 2,
});
```

**Chain State Cache (Redis):**
```typescript
const CACHE_TTL = {
  token_balance:    12_000,   // ms — 12 seconds
  gas_price:         5_000,   // ms — 5 seconds
  block_number:      2_000,   // ms — 2 seconds
  token_metadata:  300_000,   // ms — 5 minutes
  contract_abi:   3600_000,   // ms — 1 hour
  nft_holdings:     60_000,   // ms — 1 minute
};
```

**Transaction Builder:**
```typescript
interface TransactionRequest {
  chainId: number;
  from: Address;
  to: Address;
  value?: bigint;
  data?: Hex;
  gasLimit?: bigint;           // auto-estimated if not provided
  maxFeePerGas?: bigint;       // EIP-1559
  maxPriorityFeePerGas?: bigint;
}

// Builder enforces:
// 1. Gas limit = estimated * 1.2 (20% buffer)
// 2. maxFeePerGas = current base fee * 1.5 (priority)
// 3. Value never exceeds user's confirmed balance
// 4. Nonce management with in-memory pending nonce tracking
```

---

### 3.5 Wallet Signer (`wallet-signer`)

**Runtime:** Rust (stable)  
**Framework:** Axum 0.7  
**Key Storage:** In-memory encrypted store (dev) → AWS KMS / HSM (prod)

**Security Architecture:**
- Zero public internet exposure — internal network only
- Inbound connections accepted ONLY from `web3-middleware` (mTLS)
- Outbound connections permitted ONLY to pre-approved RPC hostnames
- Private keys NEVER logged, NEVER serialized to disk unencrypted
- Every signing operation produces an audit record: `{ user_id_hash, chain_id, tx_hash, timestamp }` — no key material in audit record

**Signing API (internal only):**
```rust
// POST /sign
pub struct SignRequest {
    pub user_id_hash: String,    // SHA-256 of user ID
    pub tx_request: TransactionRequest,
    pub confirmation_token: String,  // one-time token from confirmed session
}

pub struct SignResponse {
    pub signed_tx: String,       // hex-encoded signed TX
    pub tx_hash: String,         // pre-computed hash
    pub nonce_used: u64,
}
```

**Key Derivation (non-custodial path):**  
For non-custodial users, Blockmind NEVER holds private keys. The wallet-signer service instead uses the session-provided `sig` from the user's own wallet to validate identity, and only custodial keys (for fully managed accounts) are held in HSM.

---

### 3.6 Memory Service (`memory-service`)

**Runtime:** Python 3.12  
**Framework:** FastAPI  
**Stores:** MongoDB (episodic), Weaviate (semantic), Redis (working)

**Context Loading Algorithm:**
```python
async def load_context(user_id: str, query: str) -> AgentContext:
    # 1. Working memory — last 20 turns (Redis, O(1))
    recent_turns = await redis.lrange(f"ctx:{user_id}", 0, 19)
    
    # 2. Semantic retrieval — top-5 relevant past interactions (Weaviate)
    query_embedding = await embed(query)
    semantic_memories = await weaviate.query(
        collection="user_memory",
        filter={"user_id": user_id},
        near_vector=query_embedding,
        limit=5
    )
    
    # 3. User preferences from PostgreSQL (cached in Redis 1hr)
    prefs = await get_user_preferences(user_id)
    
    return AgentContext(
        recent_turns=recent_turns,
        relevant_memories=semantic_memories,
        wallet_address=prefs.wallet,
        preferred_chain=prefs.default_chain,
        transaction_history_summary=prefs.tx_summary,
        risk_tolerance=prefs.risk_tolerance,
    )
```

---

## 4. GIWA Ecosystem Integration

### 4.1 GIWA Chain Adapter

The GIWA adapter is the primary and most deeply integrated blockchain connector. It handles:

```typescript
class GIWAAdapter implements ChainAdapter {
  readonly chainId = 7777;            // GIWA mainnet chain ID (placeholder)
  readonly nativeCurrency = 'GIWA';
  readonly rpcUrls: string[];         // loaded from env
  readonly wsUrls: string[];

  // Core methods
  async getBalance(address: Address, token?: Address): Promise<bigint>
  async estimateGas(tx: TransactionRequest): Promise<bigint>
  async buildTx(intent: ParsedIntent, from: Address): Promise<TransactionRequest>
  async simulateTx(tx: TransactionRequest): Promise<SimulationResult>
  async submitTx(signedTx: Hex): Promise<TransactionReceipt>
  async watchTx(txHash: Hex, onStatus: (s: TxStatus) => void): Promise<void>
  async getBlock(blockNumber?: bigint): Promise<Block>
  async call(tx: CallRequest): Promise<Hex>
  async getLogs(filter: LogFilter): Promise<Log[]>
}
```

### 4.2 GIWA Wallet Plugin Integration

The GIWA Wallet Plugin is a browser extension overlay injected into the GIWA Wallet UI:

```
GIWA Wallet (Host Extension)
       │
       │ postMessage API
       ▼
Blockmind Plugin (Injected iframe)
       │
       │ HTTPS to api-gateway
       ▼
Blockmind Backend (Agent + Web3 Middleware)
       │
       │ GIWA Wallet SDK
       ▼
GIWA Wallet signing / approval UI
```

**Plugin Capabilities:**
- Floating AI chat panel on any GIWA Wallet screen
- Transaction co-pilot: AI explains pending TX before user signs
- Auto-complete for recipient addresses from address book
- Real-time gas fee translation ("$0.04 — cheap. Send now.")
- Scam Shield overlay: red warning if destination contract is flagged

---

## 5. SDK Architecture

### 5.1 SDK Package Structure

```
@blockmind/sdk
├── src/
│   ├── client.ts            # BlockmindClient — main entry point
│   ├── agent/
│   │   ├── AgentSession.ts  # Stateful agent conversation
│   │   ├── ToolBuilder.ts   # Build custom tools for agent
│   │   └── templates/       # Pre-built agent templates
│   │       ├── defi.ts      # DeFi operations agent
│   │       ├── nft.ts       # NFT management agent
│   │       ├── governance.ts
│   │       └── identity.ts
│   ├── web3/
│   │   ├── ChainProvider.ts # Multi-chain RPC management
│   │   ├── TxBuilder.ts     # Transaction construction helpers
│   │   └── SimulationClient.ts
│   ├── types/
│   │   ├── intents.ts
│   │   ├── transactions.ts
│   │   └── chains.ts
│   └── errors/
│       └── BlockmindError.ts
├── package.json
└── README.md
```

### 5.2 SDK Usage Example

```typescript
import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: 'bm_live_xxxxx',
  chain: 'giwa',
  network: 'mainnet',
});

// Natural language execution
const session = client.createAgentSession({ walletAddress: '0x...' });

const result = await session.execute(
  'Swap 100 GIWA for USDC with max 0.5% slippage'
);
// result.requiresConfirmation === true
// result.confirmationSummary = "Swap 100 GIWA → ~98.2 USDC (0.3% slippage, est. gas $0.02)"

const tx = await session.confirm(result.confirmationToken);
// tx.hash = "0xabc..."

// Pre-built templates
const defiAgent = client.useTemplate('defi', {
  walletAddress: '0x...',
  strategies: ['auto-compound', 'yield-optimization'],
});
```

---

## 6. Monorepo Structure

```
blockmind-labs/
├── apps/
│   ├── api-gateway/          # Node.js Fastify
│   ├── intent-service/       # Python FastAPI
│   ├── agent-runtime/        # Node.js Express
│   ├── web3-middleware/      # Node.js Fastify
│   ├── wallet-signer/        # Rust Axum
│   ├── memory-service/       # Python FastAPI
│   ├── analytics-service/    # Python FastAPI
│   ├── notification-service/ # Node.js Express
│   ├── sdk-proxy/            # Node.js Fastify
│   └── admin-service/        # Node.js Express
├── packages/
│   ├── sdk/                  # @blockmind/sdk (npm)
│   ├── types/                # Shared TypeScript types
│   ├── giwa-adapter/         # GIWA chain adapter
│   ├── evm-adapter/          # Multi-EVM adapter
│   └── ui-components/        # Shared React components
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/                  # Kubernetes manifests
│   └── terraform/            # IaC for AWS (Phase 4)
├── docs/
│   ├── PLAN.md
│   ├── SYSTEM.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── TEST.md
├── scripts/
│   ├── setup.sh
│   ├── seed-testnet.ts
│   └── benchmark.ts
├── AGENTS.md                 # Agentic coding pipeline contract
└── turbo.json                # Turborepo config
```

---

## 7. Technology Decisions (ADR Summary)

| Decision | Choice | Rationale |
|---|---|---|
| Agent orchestration | LangChain.js | Mature tool-calling, LLM provider abstraction |
| Primary LLM | GPT-4o function calling | Best intent-following for structured tool_calls |
| Fallback LLM | Llama 3 70B (Together.ai) | Cost control, offline-capable future path |
| Signing service language | Rust | Memory safety, no GC pauses, HSM library support |
| Primary API framework | Fastify | 3× faster than Express for JSON throughput |
| Vector DB | Weaviate | Self-hostable, GraphQL API, HNSW index |
| Monorepo tooling | Turborepo | Fast, works with Node + Python mixed repos |
| Chain interaction | viem 2.x | Type-safe, tree-shakeable, EIP-1193 |
| Message queue | BullMQ | Redis-backed, reliable, good DX |
| Python API framework | FastAPI | Async, auto-OpenAPI, Pydantic validation |

---

*All architectural decisions must be recorded as ADRs in `/docs/adr/` before implementation begins. This document supersedes any verbal agreement or Notion note.*
