# ADR-001: Fastify over Express for API Gateway and Web3 Middleware

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

The API Gateway and Web3 Middleware require high-throughput JSON serialization, low latency for RPC proxying, and built-in schema validation. Express is the most common Node.js framework but lacks native JSON schema validation, has slower JSON throughput, and requires middleware for features Fastify provides out of the box.

## Decision

Use **Fastify 4** for `api-gateway` and `web3-middleware`. Use Express only for `agent-runtime` (where LangChain.js integration is the priority) and `notification-service` (low-traffic, simple routing).

## Consequences

- 3× faster JSON throughput vs Express for API Gateway and Web3 Middleware
- Built-in JSON schema validation reduces middleware boilerplate
- Express remains for agent-runtime due to LangChain.js ecosystem compatibility
- Team must learn Fastify plugin system (low barrier — similar to Express)
