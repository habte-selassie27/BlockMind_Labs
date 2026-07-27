# ADR-009: Turborepo for Monorepo Tooling

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

Blockmind Labs is a monorepo with 10+ services across Node.js, Python, and Rust. Build tooling must handle: incremental builds, parallel task execution, cross-package dependency tracking, and mixed-language support.

## Decision

Use **Turborepo** as the monorepo orchestration tool. Turborepo handles: incremental builds with content-based hashing, parallel task execution, remote caching, and dependency graph awareness. Package managers: pnpm (Node.js), uv (Python), cargo (Rust).

## Consequences

- Fast incremental builds — only rebuilds changed packages
- Remote caching shared across CI and developer machines
- Turborepo doesn't manage Python/Rust directly — those use their own tools (uv, cargo) with Turborepo wrapping the top-level commands
- `turbo.json` defines the task pipeline: build, test, lint, typecheck
