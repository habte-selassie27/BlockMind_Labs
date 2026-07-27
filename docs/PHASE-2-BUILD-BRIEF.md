# Phase 2 Build Brief — Core Pipeline

**Date:** 2025-07-21  
**Status:** ✅ Complete (P2-04 needs funded wallet to execute)

---

## Overview

Phase 2 built the 3 services that turn natural language into blockchain transactions on GIWA L2.

```
User says: "Send 0.5 ETH to 0xABC..."
    ↓
┌─────────────────┐
│  agent-runtime   │  Receives NL, picks tools, orchestrates
│  (Node.js)       │
└────────┬────────┘
         ↓
┌─────────────────┐
│ web3-middleware   │  Simulates TX, estimates gas, builds raw TX
│  (Node.js)       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  wallet-signer    │  Signs with private key, returns signed TX
│  (Rust)          │
└────────┬────────┘
         ↓
    GIWA Blockchain
```

---

## P2-01: Agent Runtime (`apps/agent-runtime/`)

The brain. Receives user messages, decides what tools to call, orchestrates the flow.

### Files

| File | Purpose |
|---|---|
| `src/types.ts` | Type definitions (Tool, Session, AgentResponse) |
| `src/tools.ts` | Tool execution logic |
| `src/registry.ts` | Tool registry with permission matrix |
| `src/session.ts` | Session management (create, update, history) |
| `src/agent.ts` | Main agent loop (NL → tool → response) |
| `src/routes.ts` | Express routes (5 endpoints) |
| `src/index.ts` | Server entry point |

### Registered Tools (7)

| Tool | Description |
|---|---|
| `get_balance` | Check wallet balance (native + ERC20) |
| `transfer_token` | Send ETH or tokens |
| `swap_tokens` | Swap on DEX |
| `approve_token` | Approve token spending |
| `check_contract_risk` | Scam Shield contract check |
| `read_contract` | Read on-chain data |
| `monitor_address` | Watch an address |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/agent/execute` | Send NL message, get response |
| POST | `/agent/confirm` | Approve a pending TX |
| POST | `/agent/cancel` | Cancel pending confirmation |
| GET | `/agent/sessions` | List user sessions |
| GET | `/agent/sessions/:id/history` | Conversation history |

### Safety

- When a tool needs a real TX, agent pauses and asks user to confirm
- No silent transactions — user must approve every state-changing action

---

## P2-02: Web3 Middleware (`apps/web3-middleware/`)

The blockchain adapter. Talks to GIWA RPC, builds real transactions.

### Files

| File | Purpose |
|---|---|
| `src/types.ts` | TransactionRequest, BalanceResult, GasEstimate |
| `src/rpc.ts` | RPC provider router with circuit breaker |
| `src/chain.ts` | Balance queries, block number |
| `src/tx.ts` | TX simulation, building, gas estimation |
| `src/config.ts` | GIWA chain configs (mainnet + sepolia) |
| `src/routes.ts` | Fastify routes (6 endpoints) |
| `src/index.ts` | Server entry point |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/chain/balance/:address` | Native + ERC20 balances |
| POST | `/chain/simulate` | Dry-run TX (AGENTS.md §11.1) |
| POST | `/chain/build-transaction` | Simulate + build with gas |
| POST | `/chain/estimate-gas` | EIP-1559 gas pricing |
| POST | `/chain/sign-and-submit` | Simulate → signer → submit |
| GET | `/chain/block-number` | Current block |

### Safety

- Circuit breaker: RPC node fails 3 times → marked unhealthy
- Weighted selection: picks healthiest provider
- Simulation mandatory: every TX dry-run before signing (AGENTS.md §11.1)

---

## P2-03: Wallet Signer (`apps/wallet-signer/`)

The vault. Written in Rust for memory safety. Holds keys, signs transactions.

### Files

| File | Purpose |
|---|---|
| `Cargo.toml` | Rust dependencies (axum, aes-gcm, sha2) |
| `src/main.rs` | Server entry point |
| `src/models.rs` | SignRequest, SignResponse, AuditRecord |
| `src/keystore.rs` | AES-256-GCM encrypted key store |
| `src/handlers.rs` | Route handlers (4 endpoints) |

### API Endpoints (Internal Only)

| Method | Path | Description |
|---|---|---|
| POST | `/sign` | Sign a transaction |
| POST | `/keys` | Store encrypted private key |
| GET | `/keys/:hash` | Check if key exists |
| GET | `/health` | Health check |

### Security

- AES-256-GCM encryption for keys in memory
- Audit log: user_id_hash, chain_id, tx_hash, timestamp (NO key material)
- Internal only: only web3-middleware can call it
- No public internet exposure
- Private keys never leave memory unencrypted

---

## P2-04: Live TX Test Script (`tests/live/test-giwa-tx.mjs`)

Ready-to-run script for real self-transfer on GIWA Sepolia.

### What it does

1. Connects to GIWA testnet RPC
2. Checks wallet balance
3. Simulates TX (dry-run)
4. Signs and submits
5. Waits for confirmation
6. Reports block number, gas used, status

### How to run

```bash
# Get testnet ETH from https://faucet.giwa.io
# Then run:
GIWA_TEST_PRIVATE_KEY=abc123... node tests/live/test-giwa-tx.mjs
```

---

## P2-05: SDK v0.1 (`packages/sdk/`)

Developer-facing npm package wrapping all backend APIs.

### Files

| File | Purpose |
|---|---|
| `src/client.ts` | BlockmindClient class (10 methods) |
| `src/index.ts` | Exports + GIWA chain configs |
| `package.json` | v0.1.0, @blockmind/sdk |

### Methods

```typescript
client.parseIntent(input)              // NL → structured intent
client.executeAgent(input)             // NL → agent response
client.confirmAgent(session, token, approved)  // confirm TX
client.cancelAgent(session)            // cancel pending
client.getBalance(address)             // query balance
client.simulateTransaction(tx)         // dry-run
client.signAndSubmit(tx)               // full pipeline
client.getSessionHistory(id)           // conversation log
client.healthCheck()                   // system status
```

### GIWA Chain Configs

```typescript
import { GIWA_CHAINS } from '@blockmind/sdk';

GIWA_CHAINS.sepolia.chainId    // 91342
GIWA_CHAINS.sepolia.rpcUrl     // https://sepolia-rpc.giwa.io
GIWA_CHAINS.mainnet.chainId    // 9134
```

---

## Service Summary

| Service | Language | Port | What it does |
|---|---|---|---|
| agent-runtime | Node.js/Express | 8002 | NL → tool orchestration → TX |
| web3-middleware | Node.js/Fastify | 8003 | TX building, simulation, RPC |
| wallet-signer | Rust/Axum | 8004 | Key management, signing |
| @blockmind/sdk | TypeScript | — | Developer API |

---

## Dependencies (Not Yet Installed)

```bash
# Install all deps
pnpm install

# Or per service
cd apps/agent-runtime && npm install
cd apps/web3-middleware && npm install
cd packages/sdk && npm install

# Wallet signer (Rust)
cargo build --manifest-path apps/wallet-signer/Cargo.toml
```

---

## Phase 3 Preview

| # | Deliverable |
|---|---|
| P3-01 | Memory service (Python/FastAPI + Weaviate + Redis + PostgreSQL) |
| P3-02 | API gateway (Fastify, auth, rate-limit, routing) |
| P3-03 | Full pipeline wiring: NL → intent → agent → web3 → wallet → GIWA |
| P3-04 | First E2E test on GIWA testnet with real wallet |
| P3-05 | SDK proxy (metering, auth, version routing) |
