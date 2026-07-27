"""Semantic memory — Weaviate-backed, vector search for relevant past interactions."""

from typing import Any

COLLECTION = "UserMemory"
WEAVIATE_URL = "http://weaviate:8080"


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
    """Find top-N relevant memories for a user via vector search."""
    resp = await http.post(
        f"{WEAVIATE_URL}/v1/graphql",
        json={
            "query": f"""
            {{
                Get {{
                    {COLLECTION}(
                        nearVector: {{ vector: {query_embedding} }}
                        where: {{ path: ["user_id"], operator: Equal, valueString: "{user_id}" }}
                        limit: {limit}
                    ) {{
                        content
                        role
                        _additional {{ id distance }}
                    }}
                }}
            }}
            """
        },
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", {}).get("Get", {}).get(COLLECTION, [])


async def delete_user_memories(http: Any, user_id: str) -> None:
    """Delete all memories for a user (GDPR compliance)."""
    resp = await http.post(
        f"{WEAVIATE_URL}/v1/graphql",
        json={
            "query": f"""
            {{
                Delete {{
                    {COLLECTION}(
                        where: {{ path: ["user_id"], operator: Equal, valueString: "{user_id}" }}
                    ) {{
                        success
                    }}
                }}
            }}
            """
        },
    )
    resp.raise_for_status()


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: memory-service
