# ADR-007: Pipeline Architecture (Intent → Agent → Web3)

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

The core product is natural language → on-chain execution. This requires multiple steps: NL parsing, intent classification, slot filling, LLM reasoning, tool dispatch, TX building, simulation, confirmation, signing, and submission. These steps have different technology requirements (Python for NLP, Node.js for orchestration, Rust for signing).

## Decision

Split the pipeline into **3 independent services** with clean boundaries:
1. **intent-service** (Python/FastAPI) — NL parsing, intent classification, slot filling. Only calls memory-service.
2. **agent-runtime** (Node.js/Express+LangChain) — LLM orchestration, tool dispatch, conversation management. Calls intent-service, memory-service, web3-middleware.
3. **web3-middleware** (Node.js/Fastify) — RPC abstraction, TX building, gas estimation, simulation. Calls wallet-signer.

Each service has a single responsibility and communicates via internal REST APIs.

## Consequences

- Each service can be developed, deployed, and scaled independently
- Python team handles intent-service, Node.js team handles agent-runtime and web3-middleware
- Clean security boundary: only web3-middleware touches wallet-signer
- Network latency between services adds ~10-50ms per hop (acceptable for target P95)
