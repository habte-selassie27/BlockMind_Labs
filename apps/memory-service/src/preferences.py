"""User preferences — PostgreSQL-backed, cached in Redis."""

import json
from typing import Any

CACHE_TTL = 3600  # 1 hour


async def get_user_preferences(
    pg: Any,
    r: Any,
    user_id: str,
) -> dict | None:
    """Load user preferences, with Redis cache."""
    cache_key = f"prefs:{user_id}"
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)

    row = await pg.fetchrow(
        "SELECT user_id, wallet_address, default_chain, risk_tolerance, tx_summary "
        "FROM user_preferences WHERE user_id = $1",
        user_id,
    )
    if not row:
        return None

    prefs = dict(row)
    await r.set(cache_key, json.dumps(prefs), ex=CACHE_TTL)
    return prefs


async def upsert_user_preferences(
    pg: Any,
    r: Any,
    user_id: str,
    wallet_address: str | None = None,
    default_chain: int = 91342,
    risk_tolerance: str = "moderate",
    tx_summary: str | None = None,
) -> dict:
    """Create or update user preferences."""
    await pg.execute(
        """
        INSERT INTO user_preferences (user_id, wallet_address, default_chain, risk_tolerance, tx_summary)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
            wallet_address = COALESCE($2, user_preferences.wallet_address),
            default_chain = $3,
            risk_tolerance = $4,
            tx_summary = COALESCE($5, user_preferences.tx_summary)
        """,
        user_id, wallet_address, default_chain, risk_tolerance, tx_summary,
    )

    # Invalidate cache
    cache_key = f"prefs:{user_id}"
    await r.delete(cache_key)

    return await get_user_preferences(pg, r, user_id)


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: memory-service
