"""Context loader — orchestrates working memory, semantic memory, preferences."""

from typing import Any

from .working import get_turns, push_turn
from .semantic import search_memories, store_memory
from .preferences import get_user_preferences
from .models import AgentContext


async def load_context(
    r: Any,
    pg: Any,
    http: Any,
    user_id: str,
    query: str,
    query_embedding: list[float] | None = None,
) -> AgentContext:
    """Load full agent context for a user query."""
    recent_turns = await get_turns(r, user_id)
    relevant_memories = []
    if query_embedding:
        relevant_memories = await search_memories(http, user_id, query_embedding)

    prefs = await get_user_preferences(pg, r, user_id)

    return AgentContext(
        user_id=user_id,
        recent_turns=recent_turns,
        relevant_memories=relevant_memories,
        wallet_address=prefs.get("wallet_address") if prefs else None,
        preferred_chain=prefs.get("default_chain") if prefs else None,
        transaction_history_summary=prefs.get("tx_summary") if prefs else None,
        risk_tolerance=prefs.get("risk_tolerance", "moderate") if prefs else "moderate",
    )


async def save_conversation_turn(
    r: Any,
    pg: Any,
    http: Any,
    user_id: str,
    role: str,
    content: str,
    embedding: list[float] | None = None,
) -> None:
    """Save a conversation turn to both working and semantic memory."""
    await push_turn(r, user_id, role, content)
    if embedding:
        await store_memory(http, user_id, role, content, embedding)


# ✅ COMPLIES WITH: AGENTS.md §9, §10
# ✅ SERVICE: memory-service
