"""Working memory — Redis-backed, last 20 turns per user."""

import json
from typing import Any

WORKING_MEMORY_TURNS = 20
PREFIX = "ctx:"


async def push_turn(r: Any, user_id: str, role: str, content: str) -> None:
    """Push a turn to working memory, trim to last 20."""
    item = json.dumps({"role": role, "content": content})
    key = f"{PREFIX}{user_id}"
    await r.rpush(key, item)
    await r.ltrim(key, -WORKING_MEMORY_TURNS, -1)


async def get_turns(r: Any, user_id: str, limit: int = 20) -> list[dict]:
    """Get last N turns from working memory."""
    key = f"{PREFIX}{user_id}"
    raw = await r.lrange(key, 0, limit - 1)
    return [json.loads(item) for item in raw]


async def clear_turns(r: Any, user_id: str) -> None:
    """Clear all working memory for a user."""
    key = f"{PREFIX}{user_id}"
    await r.delete(key)


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: memory-service
