# Agent Runtime & Web3 Middleware — Deep Dive

---

## Agent Runtime — The Brain

**Location:** `apps/agent-runtime/`  
**Port:** 8002  
**Language:** Node.js/Express  
**Framework:** LangChain.js (planned)

### What It Does

The agent-runtime is a smart assistant that can actually do things, not just answer questions. It receives natural language from the user, figures out what tools to call, orchestrates the whole flow, and always asks for confirmation before signing a transaction.

### How It Works

When you say "Send 10 GIWA to Bob," the agent-runtime:

1. **Understands** — calls intent-service to translate your words into structured data
2. **Remembers** — calls memory-service to load your context (who you are, what you did before)
3. **Decides** — figures out which tools to call and in what order
4. **Acts** — calls web3-middleware to build the actual blockchain transaction
5. **Asks** — shows you a summary and waits for your confirmation before doing anything dangerous

### The Key Concept: Tool Calling

The agent doesn't hardcode "if user says X, do Y." Instead, it has **7 tools** it can call in any combination:

```
User: "Send 10 GIWA to Bob, and also check my USDC balance"

Agent thinks:
  1. I need to call "transfer_token" (amount=10, token=GIWA, recipient=Bob)
  2. I also need to call "get_balance" (token=USDC)
  3. These are independent → I can call both at once
```

### The 7 Tools

| Tool | What it does | Example |
|---|---|---|
| `get_balance` | Check how much crypto you have | "What's my ETH balance?" |
| `transfer_token` | Send ETH or tokens to someone | "Send 5 ETH to Alice" |
| `swap_tokens` | Exchange one token for another | "Swap 1 ETH for USDC" |
| `approve_token` | Allow a contract to spend your tokens | "Approve Uniswap to use my ETH" |
| `check_contract_risk` | Check if a contract is a scam | "Is this contract safe?" |
| `read_contract` | Read data from a smart contract | "What's the total supply of this token?" |
| `monitor_address` | Watch an address for activity | "Notify me when someone sends to 0xABC" |

### Why It Pauses Before Signing

This is a **safety rule** (AGENTS.md §11.2). The agent NEVER silently signs a transaction. It always:

1. Builds the transaction
2. Shows you: "Here's what I'm about to do: Send 10 GIWA to Bob. Gas: 0.001 ETH."
3. Waits for you to say "confirm"
4. Only then does it sign and submit

This prevents:
- Accidentally sending to the wrong address
- Surprise gas fees
- Malicious actions if the AI misunderstands you

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

### API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/agent/execute` | Send NL message, get response |
| POST | `/agent/confirm` | Approve a pending TX |
| POST | `/agent/cancel` | Cancel pending confirmation |
| GET | `/agent/sessions` | List user sessions |
| GET | `/agent/sessions/:id/history` | Conversation history |

---

## Web3 Middleware — The Blockchain Translator

**Location:** `apps/web3-middleware/`  
**Port:** 8003  
**Language:** Node.js/Fastify  
**Library:** viem

### What It Does

The blockchain speaks in hex strings, gas numbers, and raw transaction bytes. Humans don't. The web3-middleware translates between the two. It talks to GIWA's RPC nodes, builds real transactions, simulates them, and submits them.

### The 5 Core Operations

#### 1. Get Balance

```
You ask: "How much ETH does 0xABC have?"
Middleware: calls GIWA RPC → gets raw hex balance → converts to human-readable
Returns: "1.5 ETH"
```

#### 2. Simulate (Dry-Run)

Before signing ANY transaction, the middleware runs it without submitting:

- Sends the TX to the blockchain
- Blockchain says: "This would succeed, using 21000 gas"
- OR: "This would fail because you don't have enough ETH"
- Nothing is actually sent, nothing is actually spent

This is **mandatory** (AGENTS.md §11.1). Every transaction must be simulated first.

#### 3. Build Transaction

```
Input: { to: "0xABC", value: "10 GIWA" }
Middleware:
  1. Simulate the TX (dry-run)
  2. Get current gas price from GIWA RPC
  3. Calculate EIP-1559 fees (maxFeePerGas, maxPriorityFeePerGas)
  4. Get your nonce (transaction count)
  5. Build the raw transaction object
Output: { chainId, from, to, value, data, gasLimit, maxFeePerGas, nonce }
```

#### 4. Estimate Gas

```
"How much gas will this cost?"
Middleware: calls eth_estimateGas on GIWA RPC
Returns: { gasLimit: "21000", maxFeePerGas: "1000000000", estimatedCost: "0.000021 ETH" }
```

#### 5. Sign and Submit

```
1. Simulate the TX (safety check)
2. Send the raw TX to wallet-signer (HTTP POST to :8004/sign)
3. Wallet-signer signs it with the private key
4. Submit the signed TX to GIWA RPC via eth_sendRawTransaction
5. Return the TX hash
```

### The Circuit Breaker (RPC Router)

The middleware talks to GIWA's RPC nodes. But what if a node goes down?

```
Node A (weight 10) — healthy, fast
Node B (weight 5)  — healthy, slower
Node C (weight 10) — down, 5 errors in a row

Circuit breaker kicks in:
  → Node C marked as unhealthy
  → Requests only go to A and B
  → After 30 seconds, try C again
  → If it works, mark healthy again
```

This prevents one bad node from breaking your whole app.

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

---

## How They Work Together

```
User: "Send 10 GIWA to Bob"

┌─────────────────────────────────────────────────────────┐
│                    agent-runtime                         │
│                                                          │
│  1. Parse NL → intent-service                            │
│     "transfer, amount=10, token=GIWA, recipient=Bob"    │
│                                                          │
│  2. Load context → memory-service                        │
│     "User wallet: 0xABC, preferred chain: GIWA"          │
│                                                          │
│  3. Call tool: transfer_token                            │
│     → web3-middleware                                    │
│                                                          │
│     ┌──────────────────────────────────────┐             │
│     │           web3-middleware             │             │
│     │                                       │             │
│     │  4. Simulate TX (dry-run)            │             │
│     │  5. Estimate gas                     │             │
│     │  6. Build raw TX                     │             │
│     │  7. Return TX summary                │             │
│     └──────────────────────────────────────┘             │
│                                                          │
│  8. Show user: "Send 10 GIWA to Bob. Gas: 0.001 ETH"    │
│  9. Wait for confirmation...                             │
│  10. User says "yes"                                     │
│                                                          │
│     → web3-middleware                                    │
│     ┌──────────────────────────────────────┐             │
│     │           web3-middleware             │             │
│     │                                       │             │
│     │  11. Simulate again (safety)         │             │
│     │  12. POST /sign to wallet-signer     │             │
│     │      ┌─────────────────────┐         │             │
│     │      │    wallet-signer    │         │             │
│     │      │  Sign with key      │         │             │
│     │      │  Return signed TX   │         │             │
│     │      └─────────────────────┘         │             │
│     │  13. Submit to GIWA RPC              │             │
│     │  14. Return TX hash                  │             │
│     └──────────────────────────────────────┘             │
│                                                          │
│  15. Done! TX hash: 0x789...                            │
└─────────────────────────────────────────────────────────┘
```

---

## Key Differences

| | Agent Runtime | Web3 Middleware |
|---|---|---|
| **Thinks in** | Natural language, intents, tools | Hex strings, gas, raw TX bytes |
| **Talks to** | intent-service, memory-service, web3-middleware | wallet-signer, GIWA RPC |
| **Decides** | What to do | How to do it on-chain |
| **Safety** | Waits for user confirmation | Simulates before every TX |
| **Language** | Node.js/Express | Node.js/Fastify |
| **Port** | 8002 | 8003 |

---

## The Full Journey: NL to Blockchain

```
Step 1:  User types message
Step 2:  api-gateway checks JWT token
Step 3:  api-gateway forwards to agent-runtime
Step 4:  agent-runtime asks intent-service: "What did they mean?"
Step 5:  agent-runtime asks memory-service: "Who is this user?"
Step 6:  agent-runtime asks web3-middleware: "Build this transaction"
Step 7:  web3-middleware simulates TX (dry-run)
Step 8:  web3-middleware estimates gas
Step 9:  web3-middleware builds raw TX
Step 10: Agent shows TX summary to user
Step 11: User says "confirm"
Step 12: web3-middleware sends to wallet-signer
Step 13: wallet-signer signs with private key
Step 14: web3-middleware submits to GIWA RPC
Step 15: Transaction confirmed on-chain
```

**15 steps, 6 services, ~2 seconds total.**
