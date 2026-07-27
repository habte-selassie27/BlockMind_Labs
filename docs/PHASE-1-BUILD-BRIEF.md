# Phase 1 Build Brief — Foundation

**Date:** 2025-07-20  
**Status:** ✅ 100% Complete

---

## Overview

Phase 1 laid the entire foundation: architecture decisions, design docs, intent parser, monorepo scaffold, Docker Compose, demo, threat model, and milestone report. Everything needed before writing application code.

---

## P1-01: Architecture Decision Records (10 ADRs)

**Location:** `docs/adr/ADR-001` through `ADR-010`

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Fastify over Express for API Gateway + Web3 Middleware | Performance, schema validation, plugins |
| ADR-002 | Rust for Wallet Signer | Memory safety, zero GC pauses, no key leaks |
| ADR-003 | LangChain.js for Agent Orchestration | Tool calling, chains, memory, ecosystem |
| ADR-004 | viem for Chain Interaction | Type-safe, tree-shakeable, EIP-1193 native |
| ADR-005 | Multi-Database (Postgres + Mongo + Redis + Weaviate) | Right DB for each workload |
| ADR-006 | Non-Custodial Wallet Architecture | User owns keys, Blockmind signs only for managed accounts |
| ADR-007 | Pipeline Architecture (Intent → Agent → Web3) | Clean separation, independent scaling |
| ADR-008 | GIWA as Primary Chain | GASOK program, L2 performance, EVM compatible |
| ADR-009 | Turborepo for Monorepo Tooling | Caching, parallel builds, pnpm workspaces |
| ADR-010 | Mandatory Simulation Before TX Submission | Safety rule #1 — no exceptions |

---

## P1-02: AGENTS.md Binding Spec

**Location:** `AGENTS.md` (root, 500+ lines)

The single source of truth for every AI agent in the repo. Defines:

- **4-Agent Pipeline:** Architect → Implementer → Tester → Reviewer
- **Model assignments:** DeepSeek V4 Flash (architect), MiMo-V2.5 (implementer), Nemotron 3 Ultra (tester), Big Pickle (reviewer)
- **Hard rules:** Never skip pipeline stages, never commit failed tests, never touch wallet-signer from other services
- **Schema compliance:** Canonical schemas in §10 — no field may be invented
- **Safety rules (§11):** 7 non-negotiable rules (simulation, confirmation, no MAX_UINT256, scam shield, key isolation, parameterized SQL, injection detection)

---

## P1-03: GIWA Chain Research

**Location:** `docs/GIWA-RESEARCH.md`

| Property | Value |
|---|---|
| Chain | Ethereum L2 (OP Stack) |
| Operator | Dunamu (Upbit parent) |
| Chain ID | `9134` (mainnet) / `91342` (testnet) |
| RPC (testnet) | `https://sepolia-rpc.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Block Time | ~1 second |
| EVM | Full compatibility |
| Docs | https://docs.giwa.io |

---

## P1-04: NLP Intent Parser

**Location:** `apps/intent-service/src/`

The core NL understanding module. Converts natural language into structured `ParsedIntent` objects.

### Files

| File | Purpose |
|---|---|
| `models.py` | `ParsedIntent` schema (AGENTS.md §10 canonical) |
| `parser.py` | Main entry point — orchestrates classification, slots, safety |
| `classifier.py` | Maps NL to one of 15 intent classes |
| `slots.py` | Extracts entities (amount, token, recipient, address, etc.) |
| `safety.py` | Injection detection, adversarial input flagging |
| `language.py` | Language detection (EN, AR, ZH, etc.) |
| `ambiguity.py` | Detects unclear inputs, suggests clarifications |
| `routes.py` | FastAPI routes (`POST /intent/parse`) |
| `main.py` | FastAPI app entry point |

### 15 Intent Classes

| Class | Example |
|---|---|
| `transfer` | "Send 10 GIWA to 0xABC..." |
| `swap` | "Swap 5 ETH for USDT" |
| `approve` | "Approve USDT spending" |
| `stake` | "Stake 32 ETH" |
| `unstake` | "Unstake my ETH" |
| `bridge` | "Bridge 1 ETH to Arbitrum" |
| `read_balance` | "What's my balance?" |
| `read_contract` | "Check token supply" |
| `get_nft` | "Show my NFTs" |
| `monitor` | "Watch address 0xABC..." |
| `portfolio_summary` | "Show my portfolio" |
| `gas_estimate` | "How much gas for this?" |
| `contract_risk_check` | "Is this contract safe?" |
| `explain` | "What does this do?" |
| `unknown` | Unclear or adversarial input |

### Tests: 44 Unit Tests

| Test File | Tests |
|---|---|
| `tests/unit/test_parser.py` | Intent classification, slot extraction, all 15 classes |
| `tests/unit/test_safety.py` | Injection detection, adversarial inputs |

---

## P1-05: Monorepo Scaffold

**Location:** Root config files + `apps/` + `packages/`

### Config Files

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | pnpm workspace definition |
| `turbo.json` | Turborepo task pipeline (build, test, lint, typecheck) |
| `tsconfig.base.json` | Shared TypeScript config |
| `package.json` | Root scripts (dev, test, build, lint) |
| `.gitignore` | Standard ignores |
| `.env.example` | Environment variable template |
| `opencode.json` | 4-agent pipeline config (models, providers) |

### 10 Services Scaffolded

| Service | Folder | Port |
|---|---|---|
| api-gateway | `apps/api-gateway/` | 3000 |
| intent-service | `apps/intent-service/` | 8001 |
| agent-runtime | `apps/agent-runtime/` | 8002 |
| web3-middleware | `apps/web3-middleware/` | 8003 |
| wallet-signer | `apps/wallet-signer/` | 8004 |
| memory-service | `apps/memory-service/` | 8005 |
| analytics-service | `apps/analytics-service/` | 8006 |
| notification-service | `apps/notification-service/` | 8007 |
| sdk-proxy | `apps/sdk-proxy/` | 8008 |
| admin-service | `apps/admin-service/` | 8009 |

### 2 Packages

| Package | Purpose |
|---|---|
| `packages/sdk` | @blockmind/sdk npm package |
| `packages/types` | Canonical TypeScript type definitions |

---

## P1-06: Docker Compose

**Location:** `docker-compose.yml` + 10 Dockerfiles

### Services + Data Stores

| Container | Image | Port |
|---|---|---|
| postgres | postgres:16 | 5432 |
| mongo | mongo:7 | 27017 |
| redis | redis:7 | 6379 |
| weaviate | semitechnologies/weaviate | 8080 |
| api-gateway | custom | 3000 |
| intent-service | custom | 8001 |
| agent-runtime | custom | 8002 |
| web3-middleware | custom | 8003 |
| wallet-signer | custom | 8004 |
| memory-service | custom | 8005 |
| analytics-service | custom | 8006 |
| notification-service | custom | 8007 |
| sdk-proxy | custom | 8008 |
| admin-service | custom | 8009 |

### Start command

```bash
docker compose up -d
```

---

## P1-07: AGENTS.md Contracts

**Location:** `AGENTS.md` §4–§7

Defines the 4 pipeline roles with strict rules:

### Architect (DeepSeek V4 Flash)
- Reads task, writes spec (markdown)
- Lists files to create/modify
- Never writes application code

### Implementer (MiMo-V2.5)
- Writes code per spec exactly
- Ends every file with compliance comment
- Never writes tests (scaffold only)

### Tester (Nemotron 3 Ultra)
- Writes tests, runs them
- Reports pass/fail + coverage
- Blocks if coverage < threshold

### Reviewer (Big Pickle)
- Cross-checks everything against AGENTS.md
- Checks schema compliance, service boundaries, API compliance, test compliance, safety compliance
- Issues APPROVED ✅ or BLOCKED ❌ with line citations

---

## P1-08: Internal Demo

**Location:** `demo.py`

Interactive demo: NL → ParsedIntent → Mock Transaction.

### Usage

```bash
python demo.py "Send 10 GIWA to 0x1234..."
python demo.py "Swap 5 ETH for USDT"
python demo.py "What's my balance?"
python demo.py              # interactive mode
```

### 8 Test Cases

1. Send ETH to address
2. Swap tokens
3. Check balance
4. Approve token
5. Stake ETH
6. Bridge to L2
7. Monitor address
8. Unknown intent (injection)

---

## P1-09: Security Threat Model

**Location:** `docs/SECURITY-THREAT-MODEL.md`

STRIDE framework analysis of the signing pipeline:

| Threat | Mitigation |
|---|---|
| Spoofing | JWT auth, mTLS between services |
| Tampering | TX simulation before signing |
| Repudiation | Audit logs (no key material) |
| Information Disclosure | Key isolation, no logging of secrets |
| Denial of Service | Rate limiting, circuit breakers |
| Elevation of Privilege | User confirmation required |

---

## P1-10: GASOK Milestone Report #1

**Location:** `docs/GASOK-MILESTONE-REPORT-1.md`

Submits to GASOK program. Covers:
- Architecture decisions (10 ADRs)
- Intent parser (15 intents, 44 tests)
- Safety model (7 non-negotiable rules)
- Service map (10 services, 4 data stores)
- Phase 2 roadmap

---

## Foundation Docs

| Document | Lines | Purpose |
|---|---|---|
| `PLAN.md` | ~300 | 18-month execution plan, milestones, budget |
| `SYSTEM.md` | ~400 | Full system design, infra, security, DR |
| `ARCHITECTURE.md` | ~550 | Component diagrams, service specs, data flow |
| `TEST.md` | ~300 | Testing strategy, coverage thresholds |
| `API.md` | ~500 | Full REST + WebSocket API reference |
| `AGENTS.md` | ~500 | AI agent pipeline, rules, schemas, safety |
| `PROJECT.md` | ~250 | Master context, phase status, quick reference |

---

## Summary

| Deliverable | What was built |
|---|---|
| P1-01 | 10 ADRs documenting all tech choices |
| P1-02 | AGENTS.md — single source of truth for AI agents |
| P1-03 | GIWA chain research (RPC, explorer, ecosystem) |
| P1-04 | Intent parser (15 intents, injection detection, 44 tests) |
| P1-05 | Monorepo scaffold (10 services + 2 packages) |
| P1-06 | Docker Compose (all services + data stores) |
| P1-07 | Pipeline contracts (4 roles, strict rules) |
| P1-08 | Demo (NL → intent → mock TX, 8 test cases) |
| P1-09 | Security threat model (STRIDE) |
| P1-10 | GASOK milestone report #1 |
| — | 7 foundation documents |
