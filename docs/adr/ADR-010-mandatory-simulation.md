# ADR-010: Mandatory Simulation Before Transaction Submission

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

AI agents can hallucinate or misinterpret user intent. If an agent builds an incorrect transaction and submits it directly, the user could lose funds permanently. There is no "undo" on blockchain.

## Decision

**Every state-changing on-chain action MUST pass dry-run simulation before submission.** The simulation uses a forked chain state to execute the transaction without actually submitting it. Simulation checks: gas estimation, balance sufficiency, contract call return values, and revert reasons.

If simulation fails: return error to user with explanation. Never submit a transaction that hasn't been simulated successfully.

## Consequences

- Prevents accidental fund loss from misinterpreted intents
- Adds ~200-500ms latency per transaction (acceptable for safety guarantee)
- Simulation failure is a hard stop — no override, no "try anyway"
- This rule is non-negotiable and cannot be overridden by any ADR
