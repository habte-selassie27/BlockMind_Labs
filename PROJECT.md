# PROJECT.md — Blockmind Labs
## Project Compass & Master Context

> **Read this file whenever you start a new session.**  
> This is the single source of truth for what we're building, why, where we are, and what's next.

---

## 1. What We're Building

**Blockmind Labs** is an AI intelligence layer for Web3. We embed autonomous AI agents into blockchain infrastructure so users can interact with decentralized protocols through natural language instead of raw RPC calls.

**The problem in one sentence:** Blockchain onboarding requires 47+ steps before a first transaction — we reduce that to one sentence.

**Three product surfaces:**

| Surface | Who It's For | What It Does |
|---|---|---|
| **Blockmind Chat** | End users | Natural language → on-chain execution |
| **Blockmind SDK** | Developers | AI-native dApp building blocks |
| **Blockmind Enterprise API** | Businesses | Workflow automation + white-label |

**The core pipeline:**
```
User types: "Send 10 GIWA to Alice"
  → Intent Service (Python) parses intent + slots
  → Agent Runtime (Node.js) plans action via LLM
  → Web3 Middleware (Node.js) builds + simulates TX
  → Wallet Signer (Rust) signs the transaction
  → TX submitted to GIWA chain
  → AI summarizes result in plain language
```

---

## 2. Why We're Building It

- 95%+ of potential Web3 users never complete their first transaction
- Building a dApp takes 3–6 months for a competent engineer
- Enterprises can't connect existing systems to on-chain logic
- LLMs can reason about blockchain but can't execute on-chain actions

**Blockmind bridges all four gaps** with a single AI agent runtime.

---

## 3. Where We Are (Phase 1 Status)

### Completed ✅

| # | Deliverable | Date |
|---|---|---|
| P1-01 | Architecture Decision Records (10 ADRs) | 2025-07-20 |
| P1-02 | AGENTS.md binding spec (4-agent pipeline) | 2025-07-20 |
| P1-03 | GIWA chain research (RPC, explorer, ecosystem) | 2025-07-20 |
| P1-04 | NLP intent parser (15 intents, slots, injection detection, 44 tests) | 2025-07-20 |
| P1-05 | Monorepo scaffold (all 10 services + configs) | 2025-07-20 |
| P1-06 | Docker Compose (all services + data stores) | 2025-07-20 |
| P1-07 | AGENTS.md contracts for all 4 pipeline roles | 2025-07-20 |
| P1-08 | Internal demo (NL → intent → mock TX, 8 test cases) | 2025-07-20 |
| P1-09 | Security threat model for agent-signing | 2025-07-20 |
| P1-10 | GASOK milestone report #1 | 2025-07-20 |
| — | All foundation docs (PLAN, SYSTEM, ARCHITECTURE, TEST, API, AGENTS) | 2025-07-20 |

**Phase 1: Foundation — 100% Complete**

---

## 3b. Phase 2 Status (Core Pipeline)

### Completed ✅

| # | Deliverable | Date |
|---|---|---|
| P2-01 | Agent runtime (LangChain.js orchestration, 7 tools, session mgmt, 5 API endpoints) | 2025-07-21 |
| P2-02 | Web3 middleware (viem, RPC circuit breaker, simulation, gas estimation, 6 routes) | 2025-07-21 |
| P2-03 | Wallet signer (Rust/Axum, AES-256-GCM key store, audit log) | 2025-07-21 |
| P2-04 | Live TX test script (GIWA Sepolia, viem + wallet-signer) | 2025-07-21 |
| P2-05 | SDK v0.1 (@blockmind/sdk, 10 API methods, GIWA chain config) | 2025-07-21 |

**Phase 2: Core Pipeline — 100% Complete** (P2-04 needs funded wallet to execute)

---

## 3c. Phase 3 Status (Full Stack)

### Completed ✅

| # | Deliverable | Date |
|---|---|---|
| P3-01 | Memory service (Python/FastAPI, 3 stores: Redis + Weaviate + PostgreSQL, 7 endpoints) | 2025-07-21 |
| P3-02 | API gateway (Fastify, JWT auth, rate-limit, proxy to 4 services) | 2025-07-21 |
| P3-03 | Pipeline wiring (full connection map + integration test) | 2025-07-21 |

**Phase 3: Full Stack — 100% Complete**

---

## 3d. Phase 4 Status (Remaining Services)

### Completed ✅

| # | Deliverable | Date |
|---|---|---|
| P4-01 | Analytics service (Python/FastAPI, chain stats, NL portfolio summaries, event tracking) | 2025-07-21 |
| P4-02 | Notification service (Node.js/Express, notifications, webhooks, TX alerts) | 2025-07-21 |
| P4-03 | Admin service (Node.js/Express, user management, system health dashboard) | 2025-07-21 |
| P4-04 | Docker Compose wired (all 10 services + 4 data stores) | 2025-07-21 |
| P4-05 | Performance benchmark script (intent-to-TX latency) | 2025-07-21 |

**Phase 4: Remaining Services — 100% Complete**

---

## 4. Architecture Quick Reference

### Services (10 total)

| Service | Lang | Port | Status | Role |
|---|---|---|---|---|
| api-gateway | Node.js/Fastify | 3000 | 🟢 Implemented | Auth, rate-limit, routing to 4 services |
| intent-service | Python/FastAPI | 8001 | 🟢 Implemented | NL parsing, intent classification (44 tests) |
| agent-runtime | Node.js/Express+LangChain | 8002 | 🟢 Implemented | LLM orchestration, tool dispatch (6 tools, session mgmt) |
| web3-middleware | Node.js/Fastify | 8003 | 🟢 Implemented | RPC abstraction, TX building, simulation |
| wallet-signer | Rust/Axum | 8004 | 🟢 Implemented | Key management, signing, audit log |
| memory-service | Python/FastAPI | 8005 | 🟢 Implemented | Agent memory, context loading, 3 stores |
| analytics-service | Python/FastAPI | 8006 | 🟢 Implemented | Chain analytics, NL portfolio summaries, event tracking |
| notification-service | Node.js/Express | 8007 | 🟢 Implemented | Notifications, webhooks, TX alerts |
| sdk-proxy | Node.js/Fastify | 8008 | 🟢 Implemented | SDK metering, auth, version routing |
| admin-service | Node.js/Express | 8009 | 🟢 Implemented | User management, system health dashboard |

**Status key:** 🔴 Not started · 🟡 Scaffolded · 🟢 Implemented · ✅ Tested

### Data Stores

| Store | Tech | Purpose |
|---|---|---|
| PostgreSQL | 16 | Users, subs, audit logs |
| MongoDB | 7 | Conversation history, intent logs |
| Redis | 7 | Sessions, rate limits, cache, queues |
| Weaviate | latest | Semantic memory embeddings |

### Call Rules (enforced by Reviewer)
- `intent-service` → only `memory-service`
- `agent-runtime` → `intent-service`, `memory-service`, `web3-middleware`
- `agent-runtime` → **never** `wallet-signer` directly
- `wallet-signer` → outbound to RPC only, no public inbound

---

## 5. AI Agent Pipeline (How We Build)

### The 4-Agent Loop

| Role | Model | Provider | Job |
|---|---|---|---|
| Architect | DeepSeek V4 Flash free | OpenCode Zen | Design specs, no code |
| Implementer | MiMo-V2.5 | OpenCode Zen | Write code per spec |
| Tester | Nemotron 3 Ultra free | OpenCode Zen | Write tests, run them |
| Reviewer | Big Pickle | OpenCode Zen | Audit against AGENTS.md |

### How to run a task
```bash
opencode
# Then use /agent architect, /agent implementer, etc.
```

### Loop flow
```
User task → Architect (spec) → Implementer (code) → Tester (tests) → Reviewer (audit)
                                                                     ↓
                                                            APPROVED ✅ or BLOCKED ❌
                                                                     ↓
                                                            FIX → re-test → re-review
```

---

## 6. GIWA Chain Quick Reference

| Property | Value |
|---|---|
| Chain | Ethereum L2 (OP Stack) |
| Operator | Dunamu (Upbit parent) |
| Chain ID | `9134` (mainnet) / `91342` (testnet) |
| RPC (testnet) | `https://sepolia-rpc.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Faucet | `https://faucet.giwa.io` |
| Block Time | ~1 second |
| EVM | Full compatibility |
| Docs | https://docs.giwa.io |

---

## 7. Safety Rules (Non-Negotiable)

These are hard-wired into every agent and cannot be overridden:

1. **No TX without simulation** — dry-run before every state-changing action
2. **No TX without confirmation** — user must approve every transaction
3. **No MAX_UINT256 approvals** — exact amounts only
4. **Scam Shield before new contracts** — risk check on every unknown address
5. **Key isolation** — private keys live ONLY in `apps/wallet-signer/`
6. **No raw SQL from user input** — parameterized queries only
7. **Injection detection** — flag adversarial NL input before execution

---

## 8. What Each Document Covers

| Document | Purpose | When to read |
|---|---|---|
| **PROJECT.md** | This file — master context | Start of every session |
| **PLAN.md** | Business plan, milestones, budget, risks | Strategic decisions |
| **SYSTEM.md** | Full system design, infra, security, DR | Architecture questions |
| **ARCHITECTURE.md** | Component diagrams, service specs, data flow | Implementation details |
| **TEST.md** | Testing strategy, coverage, test examples | Writing or running tests |
| **API.md** | Full API reference with endpoints and schemas | Building API integrations |
| **AGENTS.md** | AI agent pipeline, rules, schemas, safety | Every coding session |
| **docs/GIWA-RESEARCH.md** | GIWA chain details, RPC, ecosystem | Chain integration work |
| **docs/adr/ADR-NNN.md** | Architecture Decision Records | Design rationale |

---

## 9. Commands Cheat Sheet

```bash
# Dev
docker compose up -d          # Start all services
pnpm turbo dev                # Start all services in dev mode

# Test
pnpm turbo test               # Run all tests
pnpm --filter=intent-service test  # Single service tests

# Build
pnpm turbo build              # Build all packages
pnpm turbo lint               # Lint everything
pnpm turbo typecheck          # Type check everything

# Intent service (Python)
cd apps/intent-service && pytest --cov=src

# Wallet signer (Rust)
cargo test --manifest-path apps/wallet-signer/Cargo.toml
```

---

## 10. Next Actions (Immediate)

**Platform built. Deploy and launch.**

1. **Deploy to Vercel** — `vercel deploy` with env vars
2. **Deploy backend services** — Railway / Fly.io / AWS ECS
3. **Load extension** — `chrome://extensions` → Load unpacked
4. **Run Chat PWA** — `cd apps/chat-pwa && pnpm dev`
5. **Mainnet switch** — update RPC URLs to `rpc.giwa.io`

---

## 11. Key Contacts & Links

| Resource | URL |
|---|---|
| Project repo | Local: `/home/izzy/Pictures/BlockMind_Labs` |
| GIWA docs | https://docs.giwa.io |
| GIWA faucet | https://faucet.giwa.io |
| GASOK program | https://giwa.io/gasok |
| OpenCode | `opencode` CLI from repo root |
| GitHub | https://github.com/habte-selassie27 |

---

*This document is reviewed at the start of every phase. Keep it updated.*
