"""Semantic memory — Weaviate-backed, vector search for relevant past interactions."""

from typing import Any

COLLECTION = "UserMemory"
WEAVIATE_URL = "http://weaviate:8080"

# GraphQL requires the class name to be a literal, so it cannot be a variable.
# Every caller-supplied value is bound through `variables` instead of being
# interpolated, which is what closes the injection. Building these once keeps
# the queries readable and keeps interpolation out of the request path entirely.
_SEARCH_QUERY = """
query SearchMemories($userId: String!, $limit: Int!, $vector: [Float!]!) {
    Get {
        UserMemory(
            nearVector: { vector: $vector }
            where: { path: ["user_id"], operator: Equal, valueString: $userId }
            limit: $limit
        ) {
            content
            role
            _additional { id distance }
        }
    }
}
"""

_DELETE_QUERY = """
query DeleteMemories($userId: String!) {
    Delete {
        UserMemory(
            where: { path: ["user_id"], operator: Equal, valueString: $userId }
        ) {
            success
        }
    }
}
"""


async def store_memory(
    http: Any,
    user_id: str,
    role: str,
    content: str,
    embedding: list[float],
    metadata: dict | None = None,
) -> dict:
    """Store a memory with its embedding in Weaviate."""
    data_object = {
        "user_id": user_id,
        "role": role,
        "content": content,
        "metadata": metadata or {},
    }

    resp = await http.post(
        f"{WEAVIATE_URL}/v1/objects",
        params={"className": COLLECTION},
        json={
            "class": COLLECTION,
            "vector": embedding,
            "properties": data_object,
        },
    )
    resp.raise_for_status()
    return resp.json()


async def search_memories(
    http: Any,
    user_id: str,
    query_embedding: list[float],
    limit: int = 5,
) -> list[dict]:
    """Find top-N relevant memories for a user via vector search.

    ``user_id`` is bound as a GraphQL variable rather than interpolated into the
    query text. It previously appeared as ``valueString: "{user_id}"`` inside an
    f-string, so a value such as ``x") { ... } Delete {`` could terminate the
    filter and reach other users' records — on a Delete operation, that meant
    deleting them.
    """
    resp = await http.post(
        f"{WEAVIATE_URL}/v1/graphql",
        json={
            "query": _SEARCH_QUERY,
            "variables": {
                "userId": user_id,
                "limit": limit,
                "vector": query_embedding,
            },
        },
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", {}).get("Get", {}).get(COLLECTION, [])


async def delete_user_memories(http: Any, user_id: str) -> None:
    """Delete all memories for a user (GDPR compliance).

    ``user_id`` is bound as a GraphQL variable. This query is destructive, so an
    injected value here previously had the worst possible blast radius.
    """
    resp = await http.post(
        f"{WEAVIATE_URL}/v1/graphql",
        json={
            "query": _DELETE_QUERY,
            "variables": {"userId": user_id},
        },
    )
    resp.raise_for_status()


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: memory-service
