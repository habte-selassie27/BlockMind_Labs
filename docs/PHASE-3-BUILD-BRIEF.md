# Phase 3 Build Brief — Full Stack

**Date:** 2025-07-21  
**Status:** ✅ Complete

---

## Overview

Phase 3 completed the remaining services: memory-service, api-gateway, and the full pipeline wiring. The system is now a complete stack from user input to blockchain execution.

```
User → api-gateway → agent-runtime → intent-service
                                  → memory-service
                                  → web3-middleware → wallet-signer → GIWA
```

---

## P3-01: Memory Service (`apps/memory-service/`)

Python/FastAPI service managing agent memory across 3 data stores.

### Files

| File | Purpose |
|---|---|
| `src/models.py` | AgentContext, MemoryEntry, UserPreferences schemas |
| `src/working.py` | Working memory — Redis, last 20 turns per user |
| `src/semantic.py` | Semantic memory — Weaviate vector search |
| `src/preferences.py` | User preferences — PostgreSQL, cached in Redis 1hr |
| `src/context.py` | Context loader — orchestrates all 3 stores |
| `src/routes.py` | FastAPI routes (7 endpoints) |
| `src/main.py` | FastAPI app with lifespan (startup/shutdown) |

### 3 Memory Stores

| Store | Tech | Purpose |
|---|---|---|
| Working memory | Redis | Last 20 conversation turns, O(1) access |
| Semantic memory | Weaviate | Vector search for relevant past interactions |
| User preferences | PostgreSQL | Wallet, chain, risk tolerance (cached in Redis) |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/memory/health` | Health check |
| POST | `/memory/context/load` | Load full agent context for a query |
| POST | `/memory/context/turn` | Save a conversation turn |
| GET | `/memory/context/turns/:user_id` | Get recent turns |
| DELETE | `/memory/context/turns/:user_id` | Clear working memory |
| GET | `/memory/preferences/:user_id` | Get user preferences |
| PUT | `/memory/preferences` | Create/update preferences |

### Context Loading Algorithm

```
1. Working memory — last 20 turns (Redis, O(1))
2. Semantic memory — top-5 relevant past interactions (Weaviate vector search)
3. User preferences — from PostgreSQL (cached in Redis 1hr)
→ Return AgentContext to agent-runtime
```

### Tests

| File | Tests |
|---|---|
| `tests/unit/test_working.py` | Push, get, trim, clear turns (Redis) |
| `tests/unit/test_models.py` | Schema validation, defaults |

---

## P3-02: API Gateway (`apps/api-gateway/`)

Node.js/Fastify service — single entry point for all client traffic.

### Files

| File | Purpose |
|---|---|
| `src/config.ts` | Rate limits, timeouts, tier configs |
| `src/auth.ts` | JWT + API key validation |
| `src/ratelimit.ts` | Redis sliding window rate limiter |
| `src/proxy.ts` | Reverse proxy to 4 downstream services |
| `src/index.ts` | Fastify app entry point |
| `src/routes.ts` | (scaffolded) |

### Responsibilities

- **JWT validation** (RS256) on every protected route
- **API key validation** for SDK routes (`bm_live_*`, `bm_test_*`)
- **Rate limiting** (sliding window, per user + per tier)
- **Request routing** to downstream microservices
- **Request/response logging** with trace IDs
- **CORS policy** enforcement
- **OpenAPI spec** at `/docs`

### Rate Limits by Tier

| Tier | Chat | SDK | Reads |
|---|---|---|---|
| free | 50/month | 0 | 100/hr |
| pro | unlimited | 0 | 1000/hr |
| sdk_starter | 0 | 10,000/mo | 500/hr |
| sdk_team | 0 | 100,000/mo | 5000/hr |
| premium | unlimited | 50,000/mo | 2000/hr |
| enterprise | unlimited | unlimited | unlimited |

### Service Proxy Routes

| Prefix | Upstream | Timeout |
|---|---|---|
| `/intent/*` | intent-service:8001 | 5s |
| `/agent/*` | agent-runtime:8002 | 30s |
| `/chain/*` | web3-middleware:8003 | 10s |
| `/memory/*` | memory-service:8005 | 5s |

### Tests

| File | Tests |
|---|---|
| `tests/unit/test_config.ts` | Rate limits, timeouts for all tiers |

---

## P3-03: Pipeline Wiring

**Location:** `docs/PIPELINE-WIRING.md`

Full connection map showing how all 6 services talk to each other.

### The Complete Flow

```
1. User → api-gateway (JWT auth, rate-limit)
2. api-gateway → agent-runtime (proxy)
3. agent-runtime → intent-service (parse NL)
4. agent-runtime → memory-service (load context)
5. agent-runtime → web3-middleware (build TX)
6. web3-middleware simulates TX (dry-run)
7. Agent shows TX summary, waits for user confirm
8. User confirms → agent-runtime → web3-middleware
9. web3-middleware → wallet-signer (sign TX)
10. web3-middleware → GIWA RPC (submit)
```

### Integration Test

**Location:** `apps/intent-service/tests/integration/test_full_pipeline.py`

Tests 4 flows:
1. Intent parse → agent execute
2. Save turn → load context
3. Balance query via web3-middleware
4. Health check all services

---

## Service Summary

| Service | Language | Port | Status |
|---|---|---|---|
| api-gateway | Node.js/Fastify | 3000 | 🟢 Implemented |
| intent-service | Python/FastAPI | 8001 | 🟢 Implemented |
| agent-runtime | Node.js/Express | 8002 | 🟢 Implemented |
| web3-middleware | Node.js/Fastify | 8003 | 🟢 Implemented |
| wallet-signer | Rust/Axum | 8004 | 🟢 Implemented |
| memory-service | Python/FastAPI | 8005 | 🟢 Implemented |
| analytics-service | Python/FastAPI | 8006 | 🟡 Scaffolded |
| notification-service | Node.js/Express | 8007 | 🟡 Scaffolded |
| sdk-proxy | Node.js/Fastify | 8008 | 🟡 Scaffolded |
| admin-service | Node.js/Express | 8009 | 🟡 Scaffolded |

---

## Remaining (Phase 3)

| # | Deliverable | Priority |
|---|---|---|
| — | All items complete | — |

---

## Dependencies (Not Yet Installed)

```bash
# Install all
pnpm install

# Or per service
cd apps/api-gateway && npm install
cd apps/memory-service && pip install -r requirements.txt

# Start everything
docker compose up -d
```
