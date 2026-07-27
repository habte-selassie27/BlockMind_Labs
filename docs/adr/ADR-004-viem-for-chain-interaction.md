# ADR-004: viem for Chain Interaction

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

The web3-middleware needs to build, simulate, and submit EVM-compatible transactions. Both ethers.js and viem are mature options. ethers.js v6 is battle-tested but larger bundle size and less type-safe. viem 2.x is tree-shakeable, fully type-safe, and built by the wagmi team with EIP-1193 native support.

## Decision

Use **viem 2.x** as the primary EVM interaction library in `web3-middleware`. Keep ethers.js as a secondary dependency only for specific features viem doesn't support yet (if any).

## Consequences

- Full TypeScript type safety for all RPC calls and transaction building
- Tree-shakeable — smaller bundle than ethers.js
- Native EIP-1193 provider interface aligns with modern wallet standards
- GIWA chain adapter wraps viem for GIWA-specific RPC calls
