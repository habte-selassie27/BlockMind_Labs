"""Ambiguity detection and clarification suggestions."""

from __future__ import annotations

_AMBIGUITY_CHECKS: dict[str, list[tuple[str, str]]] = {
    "transfer": [
        ("amount", "How much would you like to send?"),
        ("token", "Which token would you like to send?"),
        ("recipient", "Who should I send it to?"),
    ],
    "swap": [
        ("amount", "How much would you like to swap?"),
        ("token", "Which token are you swapping from?"),
        ("to_token", "Which token do you want to receive?"),
    ],
    "approve": [
        ("token", "Which token do you want to approve?"),
        ("amount", "What spending limit should I set?"),
    ],
    "stake": [
        ("amount", "How much would you like to stake?"),
        ("token", "Which token are you staking?"),
    ],
    "unstake": [
        ("amount", "How much would you like to unstake?"),
        ("token", "Which token are you unstaking?"),
    ],
    "read_balance": [],
    "read_contract": [
        ("contract_address", "Which contract address should I query?"),
    ],
    "get_nft": [
        ("nft_id", "Which NFT would you like to view?"),
    ],
    "monitor": [
        ("token", "Which token or address should I monitor?"),
    ],
    "portfolio_summary": [],
    "gas_estimate": [
        ("recipient", "Which transaction should I estimate gas for?"),
    ],
    "contract_risk_check": [
        ("contract_address", "Which contract address should I check?"),
    ],
    "explain": [],
}


def detect_ambiguities(
    intent_class: str, slots: dict[str, str | float | None]
) -> tuple[list[str], str | None]:
    """Return (ambiguities, suggested_clarification) for a parsed intent.

    Checks whether critical slots for the given intent class are missing.
    """
    checks = _AMBIGUITY_CHECKS.get(intent_class, [])
    missing: list[str] = []
    first_question: str | None = None

    for slot_name, question in checks:
        if slot_name not in slots or slots[slot_name] is None:
            missing.append(slot_name)
            if first_question is None:
                first_question = question

    return missing, first_question


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
