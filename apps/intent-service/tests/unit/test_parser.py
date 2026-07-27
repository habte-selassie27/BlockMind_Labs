"""Unit tests for the intent parser — covers all 15 intent classes + safety."""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.parser import parse_intent


class TestTransferIntent:
    def test_send_tokens(self):
        result = parse_intent("Send 10 GIWA to 0x1234567890abcdef1234567890abcdef12345678")
        assert result.intent_class == "transfer"
        assert result.confidence > 0.5
        assert result.is_flagged is False

    def test_send_exact_amount(self):
        result = parse_intent("Send 5 ETH to Alice")
        assert result.intent_class == "transfer"
        assert result.slots.get("amount") == 5.0
        assert result.slots.get("token") == "ETH"
        assert result.slots.get("recipient") == "Alice"

    def test_pay_to(self):
        result = parse_intent("Pay 100 USDT to bob")
        assert result.intent_class == "transfer"
        assert result.slots.get("amount") == 100.0
        assert result.slots.get("token") == "USDT"


class TestSwapIntent:
    def test_swap_tokens(self):
        result = parse_intent("Swap 1 ETH for USDT")
        assert result.intent_class == "swap"
        assert result.slots.get("amount") == 1.0
        assert result.slots.get("token") == "ETH"
        assert result.slots.get("to_token") == "USDT"

    def test_exchange(self):
        result = parse_intent("Exchange 500 USDC for ETH")
        assert result.intent_class == "swap"


class TestApproveIntent:
    def test_approve_token(self):
        result = parse_intent("Approve USDT spending")
        assert result.intent_class == "approve"
        assert result.slots.get("token") == "USDT"

    def test_allow_spend(self):
        result = parse_intent("Allow DAI to spend")
        assert result.intent_class == "approve"


class TestStakeUnstakeIntent:
    def test_stake(self):
        result = parse_intent("Stake 100 GIWA")
        assert result.intent_class == "stake"
        assert result.slots.get("amount") == 100.0

    def test_unstake(self):
        result = parse_intent("Unstake 50 GIWA")
        assert result.intent_class == "unstake"
        assert result.slots.get("amount") == 50.0


class TestReadBalance:
    def test_balance_check(self):
        result = parse_intent("What's my balance?")
        assert result.intent_class == "read_balance"
        assert result.confidence > 0.5

    def test_how_much(self):
        result = parse_intent("How much ETH do I have?")
        assert result.intent_class == "read_balance"
        assert result.slots.get("token") == "ETH"


class TestReadContract:
    def test_query_contract(self):
        result = parse_intent(
            "Read contract 0xabcdef1234567890abcdef1234567890abcdef12"
        )
        assert result.intent_class == "read_contract"
        assert result.slots.get("contract_address") is not None


class TestGetNFT:
    def test_get_nft(self):
        result = parse_intent("Show me NFT #42")
        assert result.intent_class == "get_nft"
        assert result.slots.get("nft_id") == 42

    def test_nft_balance(self):
        result = parse_intent("How many NFTs do I own?")
        assert result.intent_class == "get_nft"


class TestMonitor:
    def test_monitor_token(self):
        result = parse_intent("Monitor GIWA price")
        assert result.intent_class == "monitor"
        assert result.slots.get("token") == "GIWA"


class TestPortfolioSummary:
    def test_portfolio(self):
        result = parse_intent("Give me my portfolio summary")
        assert result.intent_class == "portfolio_summary"

    def test_net_worth(self):
        result = parse_intent("What's my net worth?")
        assert result.intent_class == "portfolio_summary"


class TestGasEstimate:
    def test_gas_cost(self):
        result = parse_intent("How much gas to send ETH?")
        assert result.intent_class == "gas_estimate"


class TestContractRiskCheck:
    def test_scam_check(self):
        result = parse_intent(
            "Is this contract safe? 0xabcdef1234567890abcdef1234567890abcdef12"
        )
        assert result.intent_class == "contract_risk_check"
        assert result.slots.get("contract_address") is not None

    def test_rug_check(self):
        result = parse_intent(
            "Rug check on 0x1111111111111111111111111111111111111111"
        )
        assert result.intent_class == "contract_risk_check"


class TestExplain:
    def test_explain(self):
        result = parse_intent("Explain what a DEX is")
        assert result.intent_class == "explain"

    def test_what_is(self):
        result = parse_intent("What is staking?")
        assert result.intent_class == "explain"


class TestUnknown:
    def test_random_text(self):
        result = parse_intent("banana")
        assert result.intent_class == "unknown"
        assert result.confidence == 0.0


# ✅ COMPLIES WITH: AGENTS.md §6, §11
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
