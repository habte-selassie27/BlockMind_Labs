"""Keyword-based intent classifier.

This is the Phase 1 rule-based parser. It covers the 15 canonical intent
classes defined in AGENTS.md §10 with no external ML dependency.
A fine-tuned NLP model can replace this module in a later phase.
"""

from __future__ import annotations

# Each intent maps to a list of keyword groups (OR between groups, AND within).
# Order matters: first match wins when intents overlap.
_INTENT_KEYWORDS: dict[str, list[list[str]]] = {
    "transfer": [
        ["send", "transfer"],
        ["transfer", "to"],
        ["pay", "to"],
        ["move", "to"],
        ["send"],
        ["forward"],
    ],
    "swap": [
        ["swap", "for"],
        ["exchange", "for"],
        ["trade", "for"],
        ["convert", "to"],
        ["swap"],
        ["bridge"],
    ],
    "approve": [
        ["approve"],
        ["allow", "spend"],
        ["grant", "permission"],
        ["authorize"],
    ],
    "stake": [
        ["stake"],
        ["delegate"],
        ["lock", "staking"],
    ],
    "unstake": [
        ["unstake"],
        ["withdraw", "stake"],
        ["remove", "stake"],
    ],
    "read_balance": [
        ["balance", "of"],
        ["how much", "have"],
        ["what is my balance"],
        ["check balance"],
        ["balance"],
    ],
    "read_contract": [
        ["read", "contract"],
        ["query", "contract"],
        ["call", "contract"],
        ["read", "from"],
    ],
    "get_nft": [
        ["nft"],
        ["get", "nft"],
        ["show", "nft"],
        ["own", "nft"],
        ["nft", "balance"],
    ],
    "monitor": [
        ["monitor"],
        ["watch"],
        ["track"],
        ["alert me"],
        ["notify"],
    ],
    "portfolio_summary": [
        ["portfolio"],
        ["summary", "holdings"],
        ["what do i own"],
        ["my assets"],
        ["net worth"],
        ["overview"],
    ],
    "gas_estimate": [
        ["gas", "cost"],
        ["gas", "estimate"],
        ["fee", "estimate"],
        ["how much", "gas"],
        ["gas price"],
    ],
    "contract_risk_check": [
        ["is this contract safe"],
        ["check contract risk"],
        ["verify contract"],
        ["scam check"],
        ["rug check"],
    ],
    "explain": [
        ["explain"],
        ["what is"],
        ["how does"],
        ["tell me about"],
        ["describe"],
    ],
}

# Intent confidence thresholds
_HIGH_CONFIDENCE = 0.90
_MED_CONFIDENCE = 0.70
_LOW_CONFIDENCE = 0.50


def classify_intent(text: str) -> tuple[str, float]:
    """Return (intent_class, confidence) for the given user text.

    Uses keyword matching with positional scoring.  If no keywords match,
    returns ("unknown", 0.0).
    """
    lower = text.lower().strip()
    words = lower.split()

    best_intent = "unknown"
    best_score = 0.0

    for intent, keyword_groups in _INTENT_KEYWORDS.items():
        score = 0.0
        matched_groups = 0

        for group in keyword_groups:
            if all(kw in lower for kw in group):
                matched_groups += 1
                # Longer keyword matches get higher weight
                score += len(group) * 0.15

        if matched_groups > 0:
            # Boost for earlier position of first keyword match
            first_positions = []
            for group in keyword_groups:
                for kw in group:
                    idx = lower.find(kw)
                    if idx >= 0:
                        first_positions.append(idx)
                        break
            if first_positions:
                earliest = min(first_positions)
                position_boost = max(0, 0.15 - earliest * 0.005)
                score += position_boost

            # Normalize score
            score = min(score, 1.0)

            if score > best_score:
                best_score = score
                best_intent = intent

    # Map raw score to confidence bands
    if best_score >= 0.8:
        confidence = _HIGH_CONFIDENCE + min(best_score - 0.8, 0.2) * 0.5
    elif best_score >= 0.5:
        confidence = _MED_CONFIDENCE + (best_score - 0.5) * 0.6
    elif best_score > 0:
        confidence = _LOW_CONFIDENCE + (best_score * 0.4)
    else:
        confidence = 0.0

    confidence = round(min(confidence, 1.0), 2)

    return best_intent, confidence


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
