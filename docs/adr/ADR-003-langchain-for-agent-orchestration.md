# ADR-003: LangChain.js for Agent Orchestration

**Status:** Accepted  
**Date:** 2025-07-20  
**Deciders:** Habte Selassie Fitsum

## Context

The agent-runtime needs to: (1) call LLMs with function/tool definitions, (2) route tool calls to typed handlers, (3) manage conversation memory, (4) support multiple LLM providers (OpenAI, Together.ai). Building this from scratch is error-prone and reinvents solved problems.

## Decision

Use **LangChain.js** as the agent orchestration layer in `agent-runtime`. LangChain handles LLM provider abstraction, tool-call routing, conversation memory management, and retry/fallback logic. Custom tool handlers are registered as typed functions that LangChain invokes.

## Consequences

- Mature tool-calling support with OpenAI function calling format
- Provider abstraction allows switching between GPT-4o and Llama 3 without code changes
- LangChain's memory abstractions map directly to our memory-service architecture
- Dependency risk — LangChain is actively maintained but API evolves fast
- Mitigation: pin LangChain version, upgrade deliberately
