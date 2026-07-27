# P3-03: Pipeline Wiring — Service Connection Map

## Flow: NL → Intent → Agent → Web3 → Wallet → GIWA

```
                         ┌─────────────────────────────────────────────┐
                         │              api-gateway (:3000)             │
                         │  JWT auth, rate-limit, proxy to services    │
                         └──────────┬──────────────┬───────────────────┘
                                    │              │
                         ┌──────────▼──────┐  ┌────▼──────────────────┐
                         │ intent-service  │  │ agent-runtime          │
                         │ (:8001)         │  │ (:8002)                │
                         │ Python/FastAPI  │  │ Node.js/Express        │
                         │ NL → ParsedIntent│ │ Intent → Tool → TX     │
                         └──────────┬──────┘  └────┬──────────┬────────┘
                                    │              │          │
                         ┌──────────▼──────┐  ┌────▼────┐  ┌──▼──────────────┐
                         │ memory-service  │  │         │  │ web3-middleware   │
                         │ (:8005)         │  │         │  │ (:8003)          │
                         │ Python/FastAPI  │  │         │  │ Node.js/Fastify  │
                         │ Redis+Weaviate+ │  │         │  │ RPC, simulate,   │
                         │ PostgreSQL      │  │         │  │ build TX         │
                         └─────────────────┘  │         │  └────────┬─────────┘
                                              │         │           │
                                              │         │  ┌────────▼─────────┐
                                              │         │  │ wallet-signer     │
                                              │         │  │ (:8004)           │
                                              │         │  │ Rust/Axum         │
                                              │         │  │ Sign TX, audit    │
                                              │         │  └────────┬─────────┘
                                              │         │           │
                                              │         │     ┌─────▼─────┐
                                              │         │     │ GIWA L2   │
                                              │         │     │ Chain     │
                                              │         │     └───────────┘
```

## Service Endpoints (for wiring)

| Service | Base URL | Key Endpoints |
|---|---|---|
| api-gateway | `http://localhost:3000` | `/intent/*`, `/agent/*`, `/chain/*`, `/memory/*` |
| intent-service | `http://localhost:8001` | `POST /intent/parse` |
| agent-runtime | `http://localhost:8002` | `POST /agent/execute`, `POST /agent/confirm` |
| web3-middleware | `http://localhost:8003` | `GET /chain/balance/:addr`, `POST /chain/simulate` |
| wallet-signer | `http://localhost:8004` | `POST /sign`, `POST /keys` |
| memory-service | `http://localhost:8005` | `POST /memory/context/load`, `POST /memory/context/turn` |

## Environment Variables (docker-compose.yml)

```yaml
# agent-runtime
INTENT_SERVICE_URL: http://intent-service:8001
MEMORY_SERVICE_URL: http://memory-service:8005
WEB3_MIDDLEWARE_URL: http://web3-middleware:8003

# web3-middleware
WALLET_SIGNER_URL: http://wallet-signer:8004

# api-gateway
INTENT_SERVICE_URL: http://intent-service:8001
AGENT_RUNTIME_URL: http://agent-runtime:8002
WEB3_MIDDLEWARE_URL: http://web3-middleware:8003
MEMORY_SERVICE_URL: http://memory-service:8005
```

## Full Pipeline Example

```bash
# 1. User sends NL to api-gateway
curl -X POST http://localhost:3000/agent/execute \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"input": "Send 10 GIWA to 0xABC..."}'

# 2. api-gateway validates JWT, rate-limits, proxies to agent-runtime

# 3. agent-runtime calls intent-service to parse NL
#    → POST http://intent-service:8001/intent/parse

# 4. agent-runtime calls memory-service to load context
#    → POST http://memory-service:8005/memory/context/load

# 5. agent-runtime decides tool: transfer_token
#    → calls web3-middleware to build TX
#    → POST http://web3-middleware:8003/chain/build-transaction

# 6. web3-middleware simulates TX (dry-run)
#    → calls GIWA RPC for simulation

# 7. Agent shows TX summary to user, waits for confirmation

# 8. User confirms
#    → POST http://localhost:3000/agent/confirm

# 9. web3-middleware sends to wallet-signer
#    → POST http://wallet-signer:8004/sign

# 10. wallet-signer signs, returns signed TX
#     → web3-middleware submits to GIWA RPC
```
