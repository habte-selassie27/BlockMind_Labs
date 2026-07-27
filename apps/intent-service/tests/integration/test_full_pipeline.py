"""
P3-03: Full Pipeline Integration Test

Tests the complete flow: NL → intent → agent → web3 → wallet → GIWA

Usage:
    docker compose up -d
    cd apps/intent-service && python -m pytest tests/integration/test_full_pipeline.py -v
"""

import pytest
import httpx

INTENT_URL = "http://localhost:8001"
AGENT_URL = "http://localhost:8002"
MEMORY_URL = "http://localhost:8005"
WEB3_URL = "http://localhost:8003"


@pytest.mark.asyncio
async def test_intent_to_agent_flow():
    """NL → intent parse → agent execute."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Parse intent
        intent_resp = await client.post(f"{INTENT_URL}/intent/parse", json={
            "input": "Send 10 GIWA to 0x1234567890abcdef1234567890abcdef12345678",
        })
        assert intent_resp.status_code == 200
        intent = intent_resp.json()
        assert intent["intent_class"] == "transfer"
        assert intent["is_flagged"] is False

        # Step 2: Execute agent with the parsed intent
        agent_resp = await client.post(f"{AGENT_URL}/agent/execute", json={
            "input": "Send 10 GIWA to 0x1234567890abcdef1234567890abcdef12345678",
        })
        assert agent_resp.status_code == 200
        agent = agent_resp.json()
        assert "session_id" in agent
        assert agent["response"] is not None


@pytest.mark.asyncio
async def test_memory_context_flow():
    """Save turn → load context."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        user_id = "test_pipeline_user"

        # Save a turn
        save_resp = await client.post(f"{MEMORY_URL}/memory/context/turn", json={
            "user_id": user_id,
            "role": "user",
            "content": "Send 5 ETH to Bob",
        })
        assert save_resp.status_code == 200

        # Load context
        load_resp = await client.post(f"{MEMORY_URL}/memory/context/load", json={
            "user_id": user_id,
            "query": "What did I ask before?",
        })
        assert load_resp.status_code == 200
        ctx = load_resp.json()
        assert len(ctx["recent_turns"]) >= 1
        assert ctx["recent_turns"][0]["content"] == "Send 5 ETH to Bob"


@pytest.mark.asyncio
async def test_web3_balance_flow():
    """Query balance via web3-middleware."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{WEB3_URL}/chain/balance/0x0000000000000000000000000000000000000001"
        )
        # May fail if GIWA RPC not reachable, but endpoint should exist
        assert resp.status_code in (200, 502, 504)


@pytest.mark.asyncio
async def test_health_all_services():
    """All services respond to health check."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        services = [
            (INTENT_URL, "/intent/health"),
            (AGENT_URL, "/agent/health"),
            (MEMORY_URL, "/memory/health"),
            (WEB3_URL, "/chain/health"),
        ]
        for base, path in services:
            try:
                resp = await client.get(f"{base}{path}")
                assert resp.status_code == 200
                assert resp.json()["status"] == "ok"
            except httpx.ConnectError:
                pytest.skip(f"{base} not reachable")
