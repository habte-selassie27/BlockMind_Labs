"""Unit tests for memory-service models."""

from src.models import AgentContext, MemoryEntry, UserPreferences


def test_agent_context_defaults():
    ctx = AgentContext(user_id="u1")
    assert ctx.recent_turns == []
    assert ctx.relevant_memories == []
    assert ctx.wallet_address is None
    assert ctx.preferred_chain is None
    assert ctx.risk_tolerance == "moderate"


def test_agent_context_full():
    ctx = AgentContext(
        user_id="u1",
        recent_turns=[{"role": "user", "content": "hi"}],
        relevant_memories=[{"content": "past tx", "role": "assistant"}],
        wallet_address="0xABC",
        preferred_chain=9134,
        transaction_history_summary="3 transfers",
        risk_tolerance="aggressive",
    )
    assert ctx.wallet_address == "0xABC"
    assert ctx.preferred_chain == 9134
    assert ctx.risk_tolerance == "aggressive"


def test_user_preferences_defaults():
    prefs = UserPreferences(user_id="u1")
    assert prefs.default_chain == 91342
    assert prefs.risk_tolerance == "moderate"
    assert prefs.wallet_address is None


def test_memory_entry():
    entry = MemoryEntry(
        user_id="u1",
        role="user",
        content="test",
        embedding=[0.1, 0.2, 0.3],
    )
    assert entry.embedding == [0.1, 0.2, 0.3]
    assert entry.metadata == {}
