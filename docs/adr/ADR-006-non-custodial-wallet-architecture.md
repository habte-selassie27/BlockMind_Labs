# ADR-006: Non-Custodial Wallet Architecture

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

Users must interact with blockchain protocols through Blockmind's AI agent. The key question: does Blockmind hold user private keys (custodial) or does the user retain control (non-custodial)?

Custodial is simpler but creates regulatory burden (money transmitter), custody risk, and user trust issues. Non-custodial aligns with Web3 principles but requires more complex signing flows.

## Decision

Default to **non-custodial** — Blockmind never holds private keys for users who connect their own wallets. The `wallet-signer` service only holds keys for fully managed accounts (opt-in, with explicit HSM-backed key storage). Non-custodial users sign via their own wallet (GIWA Wallet, MetaMask, Privy) and Blockmind submits the signed transaction.

## Consequences

- No money transmitter license required for non-custodial path
- Users retain full control of their keys — aligns with Web3 ethos
- Managed accounts (opt-in) use HSM-backed key storage in wallet-signer
- Signing flow requires wallet plugin interaction for non-custodial users
