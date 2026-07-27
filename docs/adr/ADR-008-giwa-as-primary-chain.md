# ADR-008: GIWA as Primary Chain

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

Blockmind Labs is built for the GIWA GASOK ecosystem. The platform must support GIWA chain as the primary integration before expanding to other chains. GIWA uses EVM-compatible RPC, which simplifies integration with existing Ethereum tooling.

## Decision

**GIWA is the primary and launch chain.** The GIWA adapter is the most deeply integrated chain connector. All other chains (Ethereum, BSC, Polygon, Base, Solana, Move VM) are Phase 4 multi-chain expansion items.

- Chain ID: 7777 (GIWA mainnet — placeholder until confirmed)
- Native currency: GIWA
- RPC: JSON-RPC over HTTPS/WSS (GIWA ecosystem provided)
- Explorer: GIWA block explorer (TBD)

## Consequences

- All development and testing focuses on GIWA first
- EVM compatibility means viem works out of the box with minimal adapter code
- Multi-chain expansion in Phase 4 reuses the same adapter pattern
- Single-chain focus reduces operational complexity during MVP phase
