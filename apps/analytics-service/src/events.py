"""Analytics event tracking — store events in Redis for aggregation."""

import json
import time
from typing import Any

EVENT_PREFIX = "analytics:event:"
SUMMARY_PREFIX = "analytics:summary:"


async def track_event(r: Any, event_type: str, user_id: str | None, metadata: dict) -> None:
    event = {
        "event_type": event_type,
        "user_id": user_id,
        "metadata": metadata,
        "timestamp": time.time(),
    }
    key = f"{EVENT_PREFIX}{event_type}"
    await r.rpush(key, json.dumps(event))
    await r.ltrim(key, -9999, -1)


async def get_event_count(r: Any, event_type: str) -> int:
    key = f"{EVENT_PREFIX}{event_type}"
    return await r.llen(key)


async def get_events(r: Any, event_type: str, limit: int = 100) -> list[dict]:
    key = f"{EVENT_PREFIX}{event_type}"
    raw = await r.lrange(key, -limit, -1)
    return [json.loads(item) for item in raw]


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: analytics-service
