# SYSTEM.md — Blockmind Labs
## System Design & Operational Specification

**Version:** 1.0.0  
**Author:** Habte Selassie Fitsum  
**Last Updated:** 2025-07-20  
**Classification:** Internal Engineering Reference

---

## 1. System Overview

Blockmind Labs is a distributed, multi-service platform composed of three logical planes:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT PLANE                            │
│   Blockmind Chat UI  │  Wallet Plugin  │  SDK Consumer      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────┐
│                    AI AGENT PLANE                           │
│  Intent Parser  │  LLM Orchestrator  │  Agent Executor      │
│  Memory Store   │  Tool Registry     │  Simulation Engine   │
└────────────────────────────┬────────────────────────────────┘
                             │ Internal gRPC / REST
┌────────────────────────────▼────────────────────────────────┐
│                   WEB3 MIDDLEWARE PLANE                     │
│  RPC Abstraction │  Wallet Signer  │  Chain State Cache     │
│  Gas Oracle      │  TX Builder     │  Event Listener        │
└────────────────────────────┬────────────────────────────────┘
                             │ JSON-RPC / WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                   BLOCKCHAIN PLANE                          │
│  GIWA Chain  │  EVM Chains  │  Solana  │  Move VM           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Services

### 2.1 Service Inventory

| Service | Language | Framework | Port | Responsibility |
|---|---|---|---|---|
| `api-gateway` | Node.js | Fastify | 3000 | Auth, rate-limit, route to downstream |
| `intent-service` | Python | FastAPI | 8001 | NL intent parsing, slot filling |
| `agent-runtime` | Node.js | Express | 8002 | Agent orchestration, tool dispatch |
| `web3-middleware` | Node.js | Fastify | 8003 | RPC abstraction, TX building, gas |
| `wallet-signer` | Rust | Axum | 8004 | Key management, signing (HSM-backed) |
| `memory-service` | Python | FastAPI | 8005 | Agent memory, context, embeddings |
| `analytics-service` | Python | FastAPI | 8006 | Chain analytics, NL summaries |
| `notification-service` | Node.js | Express | 8007 | Webhook delivery, alert dispatch |
| `sdk-proxy` | Node.js | Fastify | 8008 | SDK metering, auth, version routing |
| `admin-service` | Node.js | Express | 8009 | Internal admin, usage dashboards |

### 2.2 Data Stores

| Store | Technology | Purpose |
|---|---|---|
| Primary DB | PostgreSQL 16 | Users, sessions, subscriptions, audit logs |
| Document DB | MongoDB 7 | Agent conversation history, intent logs |
| Cache | Redis 7 | Session state, rate limits, chain state TTL cache |
| Vector DB | Weaviate / Pinecone | Semantic memory embeddings for agent context |
| Object Store | S3-compatible | SDK artifacts, audit exports, logs archive |
| Message Queue | BullMQ (Redis) | Async job processing, TX retry queue |

### 2.3 External Integrations

| Integration | Type | Usage |
|---|---|---|
| GIWA RPC | JSON-RPC over HTTPS/WSS | On-chain reads, TX submission |
| OpenAI API | REST | GPT-4o for primary LLM inference |
| Together.ai | REST | Llama 3 for fallback / cost-optimized paths |
| Privy / WalletConnect | OAuth-like | Non-custodial wallet auth |
| CoinGecko / DeFiLlama | REST | Price feeds, TVL data |
| Alchemy / Infura | JSON-RPC | EVM fallback RPC nodes |
| SendGrid | REST | Transactional email |
| Twilio | REST | SMS 2FA |

---

## 3. AI Agent System Design

### 3.1 Intent Processing Pipeline

```
User Input (NL)
       │
       ▼
┌─────────────────┐
│  Preprocessing  │  Sanitize, language detect, length check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent Parsing  │  Local fine-tuned model → intent class + slots
│   (Local LLM)  │  e.g. { intent: "transfer", amount: "10", 
└────────┬────────┘        token: "GIWA", recipient: "@alice" }
         │
         ▼
┌─────────────────┐
│  Disambiguation │  Clarify ambiguous slots via follow-up question
│    Engine       │  e.g. "Do you mean GIWA token or GIWA chain?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context Merge  │  Load user memory, past txns, wallet balances
│  (Memory Svc)   │  Inject relevant context into LLM prompt
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Reasoner   │  GPT-4o / Llama 3 generates action plan
│  (Agent Runtime)│  Outputs: tool_calls[], confirmation_msg
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Simulation     │  Dry-run TX on forked chain state
│  Engine         │  Validate gas, slippage, contract call
└────────┬────────┘
         │        ── FAIL → return error to user
         ▼
┌─────────────────┐
│  User Confirm   │  Present TX summary, request approval
└────────┬────────┘
         │        ── REJECT → abort, log intent
         ▼
┌─────────────────┐
│  Wallet Signer  │  Sign TX in isolated Rust service
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TX Submission  │  Submit to GIWA RPC, monitor receipt
│  + Monitoring   │  Handle replacement, retry on stuck
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Result Summary │  LLM summarizes outcome in plain language
│  (NL Response)  │  Update memory with completed action
└─────────────────┘
```

### 3.2 Agent Tool Registry

Tools are registered as structured JSON schemas and made available to the LLM orchestrator:

```typescript
interface AgentTool {
  name: string;                    // e.g. "transfer_token"
  description: string;             // used in LLM system prompt
  input_schema: JSONSchema;        // validated before execution
  requires_confirmation: boolean;  // true for all state-changing ops
  simulation_supported: boolean;   // true = dry-run before submit
  chains_supported: ChainId[];
}
```

**Built-in Tool Library (v1.0):**

| Tool | Description | Confirmation |
|---|---|---|
| `get_balance` | Fetch token balance for address | No |
| `transfer_token` | ERC-20 / native token transfer | Yes |
| `swap_tokens` | DEX swap with slippage protection | Yes |
| `approve_token` | ERC-20 approval (scoped amount) | Yes |
| `get_transaction` | Fetch TX details by hash | No |
| `estimate_gas` | Gas estimation for any TX type | No |
| `read_contract` | Call any read-only contract function | No |
| `get_nft_holdings` | List NFTs for address | No |
| `monitor_address` | Subscribe to address activity | No |
| `summarize_portfolio` | AI-powered portfolio summary | No |
| `check_contract_risk` | Scam Shield contract analysis | No |
| `get_chain_stats` | Network stats (TPS, gas, TVL) | No |

### 3.3 Memory Architecture

Each user has a layered memory system:

```
Episodic Memory (MongoDB)
  └── Recent conversation turns (last 20 turns kept in context)
  └── Completed transaction history with NL summaries
  └── User corrections and preferences

Semantic Memory (Vector DB)
  └── Embeddings of past interactions
  └── Retrieved by similarity at inference time
  └── Used for personalization and context recall

Working Memory (Redis)
  └── Current session context (TTL: 4 hours)
  └── Pending confirmation state
  └── Active monitoring subscriptions
```

### 3.4 Agent Safety Rules (Non-Negotiable)

1. **No transaction is submitted without explicit user confirmation** — the agent MUST display a structured TX summary and receive affirmative response before signing.
2. **Simulation before execution is mandatory** — all state-changing tool calls MUST pass dry-run simulation. Simulation failure = abort with explanation.
3. **Maximum single transaction value** — user-configurable cap (default: $500 equivalent). Amounts above cap require PIN or 2FA re-auth.
4. **Approval amount scoping** — `approve_token` calls MUST request exact amount needed, never `MAX_UINT256`, unless explicitly requested by user with warning.
5. **Contract risk check on every new contract interaction** — Scam Shield runs automatically before any new `to` address that isn't in user's trusted list.
6. **Private key isolation** — the `wallet-signer` service has zero network egress except to chain RPC endpoints. It never logs private keys.

---

## 4. Authentication & Session System

### 4.1 Auth Flows

**Flow A — Wallet Auth (primary)**
```
User connects wallet (GIWA Wallet / MetaMask / Privy)
  → Backend issues nonce
  → User signs nonce with wallet
  → Backend verifies signature → issues JWT (access: 15m, refresh: 7d)
  → Refresh tokens stored server-side (Redis), can be revoked
```

**Flow B — Social Auth (onboarding)**
```
User authenticates via Google / GitHub (OAuth 2.0)
  → Backend creates account, prompts wallet linking on next step
  → Temporary session token issued, full access after wallet linked
```

**Flow C — SDK Auth**
```
Developer registers → API key issued (prefix: `bm_live_` / `bm_test_`)
  → API key scoped to: chains[], tools[], max_calls_per_month
  → Key rotatable without account disruption
  → Usage tracked per key in PostgreSQL
```

### 4.2 JWT Payload

```json
{
  "sub": "user_01J5...",
  "wallet": "0xabc...def",
  "chain_id": 7777,
  "tier": "pro",
  "permissions": ["chat", "sdk", "analytics"],
  "iat": 1721480000,
  "exp": 1721480900
}
```

### 4.3 Rate Limiting

| Tier | Chat Requests | SDK Agent Calls | API Read Calls |
|---|---|---|---|
| Free | 50/month | — | 100/hour |
| Pro | Unlimited | — | 1,000/hour |
| SDK Starter | — | 10,000/month | 500/hour |
| SDK Team | — | 100,000/month | 5,000/hour |
| SDK Enterprise | — | Custom | Custom |

Rate limit implementation: Redis sliding window counter. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 5. Infrastructure & Deployment

### 5.1 Container Architecture

All services are containerized with Docker and orchestrated via Docker Compose (dev) and Kubernetes (prod).

**Development (docker-compose.yml):**
```yaml
services:
  api-gateway:       # Node.js Fastify
  intent-service:    # Python FastAPI
  agent-runtime:     # Node.js
  web3-middleware:   # Node.js
  wallet-signer:     # Rust (isolated network)
  memory-service:    # Python FastAPI
  postgres:          # PostgreSQL 16
  mongo:             # MongoDB 7
  redis:             # Redis 7
  weaviate:          # Vector DB
  grafana:           # Monitoring UI
  prometheus:        # Metrics collection
```

### 5.2 Production Deployment (Phase 3)

- **Cloud:** Railway (MVP) → AWS EKS (Phase 4)
- **CI/CD:** GitHub Actions → Docker build → registry push → K8s rolling deploy
- **Secrets:** Doppler (dev) → AWS Secrets Manager (prod)
- **TLS:** Cloudflare Tunnel (dev) → ACM + ALB (prod)
- **Regions:** Single (Addis Ababa / EU-West) → Multi-region Phase 4

### 5.3 Service Level Objectives

| Metric | Target | Measurement Window |
|---|---|---|
| API Gateway uptime | ≥99.5% | 30-day rolling |
| Intent-to-TX P95 latency | ≤2.0 seconds | Per request |
| TX submission success rate | ≥95% | Per day |
| LLM inference P95 | ≤1.5 seconds | Per request |
| Error rate (5xx) | <0.5% | Per hour |

---

## 6. Observability

### 6.1 Logging

- **Format:** JSON structured logs, every service
- **Fields:** `timestamp`, `service`, `level`, `trace_id`, `user_id`, `duration_ms`, `chain_id`, `tool_name`, `error_code`
- **Retention:** 30 days hot (Cloudwatch/Loki), 90 days cold (S3)
- **PII:** Wallet addresses are hashed in logs (SHA-256 with per-tenant salt). No raw NL inputs logged at INFO level — only intent classification results.

### 6.2 Metrics (Prometheus)

Key metrics exported per service:
```
blockmind_intent_parse_duration_ms (histogram)
blockmind_agent_tool_calls_total (counter, by tool_name, status)
blockmind_tx_submission_total (counter, by chain_id, status)
blockmind_llm_inference_duration_ms (histogram, by model)
blockmind_rpc_request_duration_ms (histogram, by chain, method)
blockmind_active_sessions (gauge)
blockmind_memory_retrieval_duration_ms (histogram)
```

### 6.3 Alerting

| Alert | Threshold | Channel |
|---|---|---|
| API Gateway 5xx rate | >1% over 5 min | PagerDuty + Slack |
| Intent parse error rate | >10% over 5 min | Slack |
| TX failure rate | >5% over 10 min | PagerDuty |
| LLM API error | >3 consecutive | Slack |
| Wallet signer down | Any downtime | PagerDuty |
| Redis connection lost | Any | PagerDuty |

---

## 7. Security System Design

### 7.1 Threat Model Summary

Primary threat vectors:
- **Prompt injection** via user NL input → malicious tool execution
- **Private key exfiltration** via compromised wallet-signer service
- **Unauthorized transaction approval** via CSRF or session hijack
- **LLM jailbreak** to bypass confirmation and safety rules
- **RPC endpoint poisoning** via MITM on chain communication
- **Excessive approval exploitation** via agent issuing MAX_UINT256 approvals

### 7.2 Defense-in-Depth Controls

| Layer | Control |
|---|---|
| Input | NL input length cap (2,048 chars), Unicode normalization, injection pattern detection |
| Auth | JWT RS256, short expiry (15m), refresh token rotation, per-device binding |
| Agent | Tool call whitelist per user tier, mandatory simulation, mandatory confirmation |
| Signing | wallet-signer in isolated network namespace, HSM for prod keys, zero logging of key material |
| Chain | TX simulation on forked state before submission, gas sanity checks |
| Transport | TLS 1.3 only, HSTS, certificate pinning in SDK |
| Database | Encrypted at rest (AES-256), parameterized queries only, no raw SQL from user input |
| Audit | Every state-changing operation logged with actor, intent, TX hash |

### 7.3 Compliance Targets

- OWASP Top 10 — full coverage with automated scanning
- SOC 2 Type II — target by Month 12
- GDPR — data residency controls, right-to-deletion, DPA templates
- FATF Travel Rule — AI-assisted flagging in Compliance Layer (Phase 4)

---

## 8. Disaster Recovery

| Scenario | RTO | RPO | Response |
|---|---|---|---|
| Single service crash | <2 min | 0 (stateless) | K8s auto-restart |
| Database failure (primary) | <5 min | <30 sec | Automated failover to read replica |
| Redis failure | <2 min | Session loss (graceful) | Elasticache fallback, users re-auth |
| LLM API outage | <1 min | N/A | Automatic fallback to Together.ai Llama 3 |
| GIWA RPC outage | <1 min | N/A | Failover to secondary RPC endpoint |
| Full region outage | <30 min | <5 min | Restore from cross-region backup |

**Backup Schedule:** PostgreSQL — continuous WAL shipping + daily snapshots. MongoDB — daily dumps to S3. Vector DB — weekly snapshot.

---

*This document is the authoritative system design reference for all engineering contributors. Any deviations from this specification require an Architecture Decision Record (ADR).*
