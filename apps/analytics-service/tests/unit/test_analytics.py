"""Unit tests for analytics-service - models, summaries, events (fake Redis)."""

import pytest

from src.models import (
    AnalyticsEvent,
    ChainStats,
    PortfolioSummary,
    TokenBalance,
    TransactionHistory,
)
from src.summaries import generate_portfolio_summary


# ---------- models ----------

def test_portfolio_summary_defaults():
    s = PortfolioSummary(user_id="u1", wallet_address="0xabc", chain_id=91342)
    assert s.total_balance_usd == 0.0
    assert s.tokens == []
    assert s.summary_nl == ""


def test_token_balance():
    t = TokenBalance(symbol="ETH", name="Ethereum", balance="1.5")
    assert t.balance_usd == 0.0
    assert t.contract_address is None


def test_transaction_history_count():
    h = TransactionHistory(address="0xabc", chain_id=91342, transactions=[{"h": "1"}])
    assert h.total_count == 0  # explicit default; caller sets count


def test_chain_stats_and_event():
    c = ChainStats(chain_id=91342, block_number=100, gas_price="12", network_health="healthy")
    e = AnalyticsEvent(event_type="tx_submitted", metadata={"k": "v"})
    assert c.network_health == "healthy"
    assert e.user_id is None
    assert e.metadata == {"k": "v"}


# ---------- summaries ----------

ADDR = "0x1234567890abcdef1234567890abcdef12345678"


def test_summary_native_only():
    wei = str(2 * 10**18)
    s = generate_portfolio_summary(ADDR, 91342, wei)
    assert s.chain_id == 91342
    assert s.wallet_address == ADDR
    assert len(s.tokens) == 1
    assert s.tokens[0]["symbol"] == "ETH"
    assert abs(float(s.tokens[0]["balance"]) - 2.0) < 1e-9
    assert "0x1234...5678" in s.summary_nl
    assert "2.0000 ETH" in s.summary_nl
    assert s.total_balance_usd == 0.0


def test_summary_invalid_native_balance():
    s = generate_portfolio_summary(ADDR, 91342, "not-a-number")
    assert float(s.tokens[0]["balance"]) == 0.0


def test_summary_with_tokens_usd_total():
    tokens = [
        {"symbol": "USDC", "balance": "100", "balance_usd": 100.0},
        {"symbol": "WETH", "balance": "1", "balance_usd": 2500.0},
    ]
    s = generate_portfolio_summary(ADDR, 91342, str(10**18), token_balances=tokens)
    assert len(s.tokens) == 3
    assert s.total_balance_usd == 2600.0
    assert "$2600.00" in s.summary_nl
    assert "Holding 3 token(s) total" in s.summary_nl


def test_events_with_fake_redis():
    """track/get/count against a fake async Redis (no live Redis needed)."""
    import asyncio
    import json
    from src.events import track_event, get_event_count, get_events

    class FakeRedis:
        def __init__(self):
            self.lists = {}

        async def rpush(self, key, value):
            self.lists.setdefault(key, []).append(value)

        async def ltrim(self, key, start, end):
            lst = self.lists[key]
            if start != 0:
                self.lists[key] = lst[start:]

        async def llen(self, key):
            return len(self.lists.get(key, []))

        async def lrange(self, key, start, end):
            items = self.lists.get(key, [])
            if end == -1:
                return items[start:]
            return items[start:end + 1]

    async def run():
        r = FakeRedis()
        await track_event(r, "swap_executed", "u1", {"chain_id": 91342})
        await track_event(r, "swap_executed", None, {})
        assert await get_event_count(r, "swap_executed") == 2
        events = await get_events(r, "swap_executed")
        assert len(events) == 2
        assert events[0]["event_type"] == "swap_executed"
        assert events[0]["user_id"] == "u1"
        for i in range(20):
            await track_event(r, "noise", None, {"i": i})
        assert await get_event_count(r, "noise") == 20

    asyncio.run(run())


# COMPLIES WITH: AGENTS.md section 6/11
# SERVICE: analytics-service
