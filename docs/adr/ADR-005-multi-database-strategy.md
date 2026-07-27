# ADR-005: Multi-Database Strategy

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

Blockmind Labs stores different types of data with different access patterns: user accounts (relational), conversation history (document), session state (cache), semantic embeddings (vector). A single database cannot optimize for all these patterns simultaneously.

## Decision

Use **four specialized stores**:
- **PostgreSQL 16** — users, subscriptions, API keys, audit logs, tx records (relational, ACID)
- **MongoDB 7** — agent conversation history, intent logs, tx summaries (document, flexible schema)
- **Redis 7** — session state, rate limits, chain state cache, job queues (key-value, fast)
- **Weaviate** — semantic memory embeddings for agent context recall (vector, HNSW index)

## Consequences

- Each store optimized for its access pattern — no impedance mismatch
- Operational complexity increases — 4 databases to maintain and monitor
- Mitigation: managed services (Supabase for Postgres, Upstash for Redis, Weaviate Cloud)
- Data consistency across stores handled at the application layer (not distributed transactions)
