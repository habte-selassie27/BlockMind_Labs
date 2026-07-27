"""Unit tests for memory-service working memory (Redis)."""

import json
import pytest
import redis.asyncio as redis

from src.working import push_turn, get_turns, clear_turns


@pytest.fixture
async def r():
    client = redis.from_url("redis://localhost:6379")
    yield client
    await client.aclose()


@pytest.mark.asyncio
async def test_push_and_get_turns(r):
    await clear_turns(r, "test_user")
    await push_turn(r, "test_user", "user", "Hello")
    await push_turn(r, "test_user", "assistant", "Hi there")

    turns = await get_turns(r, "test_user")
    assert len(turns) == 2
    assert turns[0]["role"] == "user"
    assert turns[0]["content"] == "Hello"
    assert turns[1]["role"] == "assistant"
    assert turns[1]["content"] == "Hi there"


@pytest.mark.asyncio
async def test_trim_to_20_turns(r):
    await clear_turns(r, "test_user")
    for i in range(25):
        await push_turn(r, "test_user", "user", f"msg_{i}")

    turns = await get_turns(r, "test_user")
    assert len(turns) == 20
    assert turns[0]["content"] == "msg_5"  # oldest kept


@pytest.mark.asyncio
async def test_clear_turns(r):
    await push_turn(r, "test_user", "user", "test")
    await clear_turns(r, "test_user")
    turns = await get_turns(r, "test_user")
    assert len(turns) == 0
