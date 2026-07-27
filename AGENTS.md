# AGENTS.md — Blockmind Labs
# OpenCode Multi-Agent Engineering Loop

> This file is the single source of truth for every AI agent working in this repo.
> Every agent reads this file first. No exceptions.

---

## 1. Repo Context

**Project:** Blockmind Labs — AI infrastructure for Web3 / GIWA ecosystem  
**Stack:** Node.js 20, Python 3.12, Rust (wallet-signer), React 19, PostgreSQL, MongoDB, Redis, Weaviate  
**Monorepo tool:** Turborepo  
**Package manager:** pnpm (Node), uv (Python), cargo (Rust)  
**Design System:** Claude × ElevenLabs hybrid — see `Design.md`

---

## 2. Design System — Claude × ElevenLabs Hybrid

Blockmind uses a **Claude × ElevenLabs hybrid** design: warm terracotta-and-cream from Claude, precision minimalism from ElevenLabs.

### Colors (Light Theme — Landing)
- **Background**: `#FAF9F5` (Warm Parchment)
- **Surface**: `#FFFFFF` (Pure White)
- **Primary**: `#C15F3C` (Terracotta)
- **Text**: `#141413` (Warm Near-Black)
- **Secondary Text**: `#777169` (Olive Gray)
- **Border**: `#E5E3DC` (Warm Gray)

### Colors (Dark Theme — Chat)
- **Background**: `#0A0A09` (Studio Dark)
- **Surface**: `#1C1917` (Dark Surface)
- **Primary**: `#D97A5C` (Lighter Terracotta)
- **Text**: `#FAF9F5` (Warm White)

### Typography
- **Headers**: Georgia (serif, editorial authority)
- **Body**: Inter (sans-serif, clean UI)
- **Monospace**: JetBrains Mono

### Radii
- **Cards**: 12px
- **Buttons**: 9999px (pill)
- **Inputs**: 8px

### CSS Files
- `apps/chat-pwa/src/tokens.css` — Design tokens (Claude × ElevenLabs palette)
- `apps/chat-pwa/src/landing.css` — Landing page (light parchment + dark hero)
- `apps/chat-pwa/src/components.css` — Dark theme chat components
- `apps/chat-pwa/src/layout.css` — Dark theme chat layout

---

## 3. The 4-Agent Pipeline

Every feature goes through exactly 4 roles in order.
No agent skips ahead. No agent doubles back without a failure report.

```
┌─────────────────────────────────────────────────────────────────┐
│  USER (you) → gives a task in plain English                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROLE: ARCHITECT (Planner)                                      │
│  Model: DeepSeek V4 Flash free (deepseek-v4-flash-free)         │
│  Job: decompose task → write spec → list files to create        │
│  Output: a markdown spec block, NO code                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │ spec passed as context
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROLE: IMPLEMENTER (Coder)                                      │
│  Model: MiMo-V2.5 (xiaomi/mimo-v2.5)  [default model]          │
│  Job: write all code in the spec, nothing more                  │
│  Output: working code files with compliance comments            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ code passed as context
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROLE: TESTER                                                   │
│  Model: Nemotron 3 Ultra free (nemotron-3-ultra-free)           │
│  Job: write tests, run them, report pass/fail + coverage        │
│  Output: test files + test report                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ report passed as context
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROLE: REVIEWER                                                 │
│  Model: Big Pickle (big-pickle)                                  │
│  Job: cross-check everything against this AGENTS.md             │
│  Output: APPROVED ✅ or BLOCKED ❌ with exact line citations     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. OpenCode Config

Create this file at the repo root:

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.schema.json",

  // DEFAULT MODEL = Implementer (MiMo-V2.5)
  "model": "xiaomi/mimo-v2.5",
  "provider": "opencode",

  "agents": {
    "architect": {
      "model": "deepseek-v4-flash-free",
      "provider": "opencode",
      "system": "You are the Architect. Read AGENTS.md §4 for your rules."
    },
    "tester": {
      "model": "nemotron-3-ultra-free",
      "provider": "opencode",
      "system": "You are the Tester. Read AGENTS.md §6 for your rules."
    },
    "reviewer": {
      "model": "big-pickle",
      "provider": "opencode",
      "system": "You are the Reviewer. Read AGENTS.md §7 for your rules."
    }
  },

  "rules": [
    "Always read AGENTS.md before starting any task.",
    "Never commit code that fails tests.",
    "Never touch wallet-signer from any service other than web3-middleware.",
    "Never store private keys outside apps/wallet-signer/."
  ]
}
```

> **Providers:** All models run on OpenCode Zen — no external API keys needed.
> Just run `opencode` from the repo root and you're ready to go.

### Model Summary

| Role | Model | Provider | Model ID | Context | Cost |
|---|---|---|---|---|---|
| Architect (Planner) | DeepSeek V4 Flash free | OpenCode Zen | `deepseek-v4-flash-free` | 1M | FREE |
| Implementer (Coder) | MiMo-V2.5 | OpenCode Zen | `xiaomi/mimo-v2.5` | 1M | FREE (limited time) |
| Tester | Nemotron 3 Ultra free | OpenCode Zen | `nemotron-3-ultra-free` | 128K | FREE |
| Reviewer | Big Pickle | OpenCode Zen | `big-pickle` | 200K | FREE |

---

## 5. Architect Rules

**You are DeepSeek V4 Flash free. You design. You do not write application code.**

When given a task:

1. Read the task description.
2. Identify which service(s) are involved (see §9 Service Map).
3. Write a spec using this exact format:

```
## ARCHITECT SPEC: <task name>

### Services touched
- <service name> (apps/<folder>/)

### Files to create or modify
- apps/<service>/src/<file>.ts   — <one-line purpose>
- apps/<service>/tests/<file>.test.ts  — scaffold only

### Interfaces / Schemas
<paste the exact TypeScript or Python type — no placeholders>

### Logic description
<numbered steps describing what the code must do>
<reference AGENTS.md §10 safety rules where relevant>

### What the Implementer must NOT do
- <guardrail 1>
- <guardrail 2>

### Test requirements
<list which test categories from §11 apply>
```

**Architect hard rules:**
- Specs must fit one screen — no novels.
- Reference existing schemas in §10 — never invent new field names.
- If you need a new service that doesn't exist in §9, write it into §9 first, then spec it.
- Never spec wallet interaction from any service except `web3-middleware`.

---

## 6. Implementer Rules

**You are MiMo-V2.5. You write code. You do not design.**

When given an Architect spec:

1. Create every file listed — no more, no fewer.
2. Use exact field names from the spec — never rename.
3. End every file with this comment block:

```typescript
// ✅ COMPLIES WITH: AGENTS.md §<section>
// ✅ SERVICE: <service name>
// ✅ ARCHITECT SPEC: <task name>
```

**Implementer hard rules:**
- If the spec is ambiguous, stop and ask the Architect one question. Don't guess.
- Never import web3 libraries inside `intent-service` or `memory-service`.
- Never call `wallet-signer` directly from `agent-runtime` — always go through `web3-middleware`.
- Never write tests — only scaffold empty describe/class blocks in test files.
- Never create an API endpoint that isn't in `docs/API.md`.
- Use env vars for all secrets — never hardcode.

---

## 7. Tester Rules

**You are Nemotron 3 Ultra free. You write tests. You do not write application code.**

When given the Implementer's code:

1. Read the Architect spec to know which test categories are required.
2. Write tests in the correct test file (already scaffolded by Implementer).
3. Run the tests using the commands in §12.
4. Produce this exact report:

```
## TEST REPORT: <task name>

### Results
| File | Tests | Pass | Fail | Coverage |
|------|-------|------|------|----------|
| <file> | N | N | N | N% |

### Failures (if any)
- <test name>: FAIL
  Expected: <value>
  Got: <value>
  Fix needed in: <file>, line <N>

### Benchmark (if applicable)
- Intent accuracy: N% (threshold: 92%)
- Slot accuracy: N% (threshold: 88%)

### Security tests
- Prompt injection: N/5 blocked

### VERDICT: PASS ✅ / FAIL ❌
```

**If FAIL:** send the report to the Implementer only. Do not send to Reviewer.  
**If PASS:** send the report to the Reviewer.

**Coverage thresholds (from docs/TEST.md §2):**

| Service | Unit floor | Integration floor |
|---|---|---|
| intent-service | 90% | 80% |
| agent-runtime | 85% | 75% |
| web3-middleware | 90% | 80% |
| wallet-signer | 95% | 90% |
| api-gateway | 85% | 75% |
| @blockmind/sdk | 90% | 80% |

---

## 8. Reviewer Rules

**You are Big Pickle. You audit. You have veto power. You approve or block — nothing else.**

When given all 3 outputs (Architect spec + code + test report):

Run this checklist. Every box must be checked for APPROVED.

```
SCHEMA COMPLIANCE
□ All field names in code match §10 schemas exactly
□ No new schemas invented — only what's in §10 or docs/API.md

SERVICE BOUNDARY COMPLIANCE
□ intent-service has zero web3 imports
□ wallet-signer is only called from web3-middleware
□ No private key material outside apps/wallet-signer/
□ No new service introduced that isn't in §9

API COMPLIANCE
□ Every new endpoint exists in docs/API.md with matching path, method, body
□ All error responses use codes from docs/API.md §Error Format
□ Rate limit headers present on rate-limited routes

TEST COMPLIANCE
□ Coverage meets §6 floors for every modified service
□ Adversarial/injection tests present if user input is handled
□ Test report shows PASS verdict

SAFETY COMPLIANCE (§10)
□ Simulation runs before any TX submission
□ User confirmation required before any state-changing tool call
□ No MAX_UINT256 approval without explicit user flag
□ Scam Shield called before any new contract address interaction
```

**Output format:**

```
## REVIEW: <task name> — ✅ APPROVED / ❌ BLOCKED

### Violations (BLOCKED only)
1. AGENTS.md §<N> violated — <file>:<line> — <what's wrong> — return to: <Implementer|Tester|Architect>

### Notes (APPROVED only)
- <any observations for the next cycle>

### Decision: MERGE / FIX AND RESUBMIT
```

---

## 9. How to Run the Loop in OpenCode

### Starting a task

Open OpenCode in your terminal from the repo root:

```bash
opencode
```

Type your task as plaintext. OpenCode reads `opencode.json` and knows which model is the default (MiMo-V2.5 = Implementer). To invoke a specific role, use the `/agent` slash command:

```
/agent architect
Task: implement the intent parser for P1-04 — NLP intent parsing module
```

OpenCode routes the message to DeepSeek V4 Flash using the config in `opencode.json`.

### Passing context between agents

OpenCode maintains a session context. After the Architect responds, copy its spec block and pass it to the Implementer in the same session:

```
/agent implementer
Here is the Architect spec. Implement it now.

<paste spec here>
```

After the Implementer responds, pass the code + spec to the Tester:

```
/agent tester
Architect spec: <paste>
Implementer code: <paste or reference file paths>
Run tests and give me the test report.
```

After the Tester reports PASS, pass everything to the Reviewer:

```
/agent reviewer
Architect spec: <paste>
Code: <paste or reference paths>
Test report: <paste>
Run your checklist.
```

### Faster flow using file references

Instead of pasting everything, reference files directly. OpenCode reads files from your repo:

```
/agent tester
Read these files and test them:
- apps/intent-service/src/parser.py
- apps/intent-service/src/models/intent.py
Architect spec is in: /tmp/spec-p1-04.md
Run against: docs/TEST.md §3.1
```

### Looping on failure

When the Tester returns FAIL or the Reviewer returns BLOCKED:

```
/agent implementer
Test failures from Tester:
<paste failure report>

Fix only what the failure report specifies. Do not change anything else.
```

Run Tester again after the fix. Do not skip back to Reviewer until Tester passes.

---

## 10. Service Map

| Service | Folder | Language | Port | Calls |
|---|---|---|---|---|
| api-gateway | apps/api-gateway | Node.js/Fastify | 3000 | intent-service, agent-runtime, analytics-service, sdk-proxy |
| intent-service | apps/intent-service | Python/FastAPI | 8001 | memory-service |
| agent-runtime | apps/agent-runtime | Node.js/Express+LangChain | 8002 | intent-service, memory-service, web3-middleware |
| web3-middleware | apps/web3-middleware | Node.js/Fastify | 8003 | wallet-signer, GIWA RPC |
| wallet-signer | apps/wallet-signer | Rust/Axum | 8004 | GIWA RPC only |
| memory-service | apps/memory-service | Python/FastAPI | 8005 | Redis, Weaviate, PostgreSQL |
| analytics-service | apps/analytics-service | Python/FastAPI | 8006 | GIWA RPC, Redis |
| notification-service | apps/notification-service | Node.js/Express | 8007 | Redis pub/sub |
| sdk-proxy | apps/sdk-proxy | Node.js/Fastify | 8008 | agent-runtime |
| admin-service | apps/admin-service | Node.js/Express | 8009 | PostgreSQL |

**Call rules (enforced by Reviewer):**
- `intent-service` → may only call `memory-service`
- `agent-runtime` → may call `intent-service`, `memory-service`, `web3-middleware` — never `wallet-signer` directly
- `wallet-signer` → outbound only to approved RPC hostnames — no inbound from public internet

---

## 11. Canonical Schemas

These are the only schemas used in this codebase. No agent may invent alternatives.

### ParsedIntent (Python — intent-service)
```python
class ParsedIntent(BaseModel):
    intent_class: Literal[
        "transfer", "swap", "approve", "stake", "unstake",
        "bridge", "read_balance", "read_contract", "get_nft",
        "monitor", "portfolio_summary", "gas_estimate",
        "contract_risk_check", "explain", "unknown"
    ]
    confidence: float
    slots: dict[str, str | float | None]
    ambiguities: list[str]
    suggested_clarification: str | None
    raw_input: str
    language_detected: str
    is_flagged: bool = False
```

### AgentTool (TypeScript — agent-runtime)
```typescript
interface AgentTool {
  name: string
  description: string
  input_schema: JSONSchema
  requires_confirmation: boolean
  simulation_supported: boolean
  chains_supported: number[]
}
```

### TransactionRequest (TypeScript — web3-middleware)
```typescript
interface TransactionRequest {
  chainId: number
  from: Address
  to: Address
  value?: bigint
  data?: Hex
  gasLimit?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}
```

### JWT Payload
```typescript
interface JWTPayload {
  sub: string        // user_01J5...
  wallet: string     // 0x...
  chain_id: number
  tier: 'free' | 'pro' | 'premium' | 'sdk_starter' | 'sdk_team' | 'enterprise'
  permissions: string[]
  iat: number
  exp: number
}
```

### Standard API Error
```typescript
interface APIError {
  error: {
    code: string          // from docs/API.md §Error Format
    message: string
    details?: Record<string, unknown>
    request_id: string    // req_01J5...
  }
}
```

---

## 12. Safety Rules (Non-Negotiable)

These cannot be overridden by any agent, any spec, or any ADR.

1. **No TX without simulation** — every state-changing on-chain action must pass a dry-run simulation before the signer is called. Simulation failure = return error to user, full stop.

2. **No TX without confirmation** — the agent must pause, show a structured summary to the user, and receive an affirmative reply before calling the signer. No exceptions for "simple" transfers.

3. **No MAX_UINT256 approvals** — `approve_token` always uses the exact required amount. Using `type(uint256).max` requires an explicit `allow_unlimited: true` flag in the request AND a warning shown to the user.

4. **Scam Shield before new contracts** — any contract address not in the user's trusted list must be checked through `check_contract_risk` before any interaction is built or submitted.

5. **Key isolation** — private keys exist only in `apps/wallet-signer/`. No other service may import, receive, log, or transmit private key material in any form.

6. **No user input in raw SQL** — all database access uses parameterized queries. No string interpolation into SQL from any user-supplied value.

7. **Injection detection on NL input** — the `intent-service` must classify known injection patterns as `unknown` or set `is_flagged = True` before returning. A flagged intent is never executed.

---

## 13. Commands Reference

```bash
# Start dev environment
docker compose up -d

# Run all tests
pnpm turbo test

# Run a specific service's tests
pnpm --filter=intent-service test
pnpm --filter=agent-runtime test
cargo test --manifest-path apps/wallet-signer/Cargo.toml

# Run intent accuracy benchmark
cd apps/intent-service && python tests/benchmarks/intent_accuracy.py

# Check coverage (Node services)
pnpm --filter=<service> test:coverage

# Check coverage (Python services)
cd apps/<service> && pytest --cov=src --cov-report=term-missing

# Lint
pnpm turbo lint
ruff check apps/intent-service/

# Type check
pnpm turbo typecheck

# Run k6 load test
k6 run tests/performance/chat-load.js

# Build all
pnpm turbo build
```

---

## 14. Completed Deliverables

| Deliverable | Phase | Status | Date |
|---|---|---|---|
| PLAN.md | — | ✅ | 2025-07-20 |
| SYSTEM.md | — | ✅ | 2025-07-20 |
| ARCHITECTURE.md | — | ✅ | 2025-07-20 |
| TEST.md | — | ✅ | 2025-07-20 |
| API.md | — | ✅ | 2025-07-20 |
| AGENTS.md | — | ✅ | 2025-07-20 |

---

## 15. ADR Log

| ADR | Decision | Date | Status |
|---|---|---|---|
| ADR-001 | Fastify over Express for API Gateway and Web3 Middleware | 2025-07-20 | ✅ Accepted |
| ADR-002 | Rust for Wallet Signer Service | 2025-07-20 | ✅ Accepted |
| ADR-003 | LangChain.js for Agent Orchestration | 2025-07-20 | ✅ Accepted |
| ADR-004 | viem for Chain Interaction | 2025-07-20 | ✅ Accepted |
| ADR-005 | Multi-Database Strategy (Postgres + Mongo + Redis + Weaviate) | 2025-07-20 | ✅ Accepted |
| ADR-006 | Non-Custodial Wallet Architecture | 2025-07-20 | ✅ Accepted |
| ADR-007 | Pipeline Architecture (Intent → Agent → Web3) | 2025-07-20 | ✅ Accepted |
| ADR-008 | GIWA as Primary Chain | 2025-07-20 | ✅ Accepted |
| ADR-009 | Turborepo for Monorepo Tooling | 2025-07-20 | ✅ Accepted |
| ADR-010 | Mandatory Simulation Before Transaction Submission | 2025-07-20 | ✅ Accepted |

*New ADRs go in `docs/adr/ADR-NNN.md` and are logged here.*
