# ADR-002: Rust for Wallet Signer Service

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

The wallet-signer is the most security-critical service. It holds private key material (in HSM-backed storage), signs transactions, and must have zero memory safety bugs. A buffer overflow or use-after-free in this service could leak private keys. The service also needs predictable latency with no GC pauses.

## Decision

Write `wallet-signer` in **Rust (stable)** using the **Axum** framework. All key material lives in encrypted in-memory stores (dev) or AWS KMS/HSM (prod). The service has no inbound connections from the public internet and no outbound connections except to approved RPC endpoints.

## Consequences

- Memory safety guaranteed by Rust's borrow checker — no use-after-free, no buffer overflows
- No GC pauses — predictable latency for signing operations
- HSM integration via `pkcs11` crate is mature
- Higher development friction vs Node.js/Python — acceptable for security-critical path
- Only `web3-middleware` may call this service (enforced by network policy)
