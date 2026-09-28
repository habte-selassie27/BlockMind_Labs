"""GIWA-native intent tests — UP ID, bridge, network, explorer, batch, discover."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.parser import parse_intent


class TestBridge:
    def test_bridge_basic(self):
        r = parse_intent("Bridge 0.1 ETH from Sepolia to GIWA")
        assert r.intent_class == "bridge"
        assert r.slots.get("amount") == 0.1
        assert r.slots.get("token") == "ETH"
        assert r.slots.get("from_chain") == "sepolia"
        assert r.slots.get("to_chain") == "giwa"
        assert r.slots.get("from_chain_id") == 11155111

    def test_bridge_status(self):
        r = parse_intent("Bridge status for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        assert r.intent_class == "bridge_status"
        assert r.slots.get("tx_hash") is not None


class TestResolveIdentity:
    def test_resolve_up(self):
        r = parse_intent("Resolve alice.up")
        assert r.intent_class == "resolve_identity"
        assert r.slots.get("up_id") == "alice.up"

    def test_send_to_up(self):
        r = parse_intent("Send 10 tokens to alice.up")
        assert r.intent_class == "transfer"
        assert r.slots.get("recipient") == "alice.up"
        assert r.slots.get("up_id") == "alice.up"


class TestCreateIdentity:
    def test_create_up(self):
        r = parse_intent("Create my UP ID bob.up")
        assert r.intent_class == "create_identity"
        assert r.slots.get("requested_up_id") == "bob.up"

    def test_smart_wallet(self):
        r = parse_intent("Create my GIWA smart wallet")
        assert r.intent_class == "create_identity"


class TestNetworkStats:
    def test_network(self):
        r = parse_intent("How is GIWA doing right now?")
        assert r.intent_class == "network_stats"

    def test_congested(self):
        r = parse_intent("Is GIWA congested?")
        assert r.intent_class == "network_stats"


class TestExplain:
    def test_explain_tx(self):
        r = parse_intent("Explain transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        assert r.intent_class == "explain_transaction"
        assert r.slots.get("tx_hash") is not None

    def test_explain_address(self):
        r = parse_intent("Explain address 0x1111111111111111111111111111111111111111")
        assert r.intent_class == "explain_address"
        assert r.slots.get("address") is not None

    def test_debug(self):
        r = parse_intent("Debug transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        assert r.intent_class == "debug_transaction"


class TestBatch:
    def test_batch(self):
        r = parse_intent("Prepare my GIWA wallet for DeFi")
        assert r.intent_class == "batch_execute"

    def test_batch_approve_stake(self):
        r = parse_intent("Prepare my wallet for DeFi with approve and stake")
        assert r.intent_class == "batch_execute"
        assert r.slots.get("batch_type") == "approve_and_stake"


class TestDiscover:
    def test_discover(self):
        r = parse_intent("What can I do on GIWA? Find me a DeFi app")
        assert r.intent_class == "discover"
        assert r.slots.get("category") == "defi"

# ✅ COMPLIES WITH: AGENTS.md §6, §11
# ✅ SERVICE: intent-service
