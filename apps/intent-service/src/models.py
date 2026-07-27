from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ParsedIntent(BaseModel):
    """Canonical intent schema — AGENTS.md §10.

    No field may be added, removed, or renamed without updating AGENTS.md first.
    """

    intent_class: Literal[
        "transfer",
        "swap",
        "approve",
        "stake",
        "unstake",
        "bridge",
        "read_balance",
        "read_contract",
        "get_nft",
        "monitor",
        "portfolio_summary",
        "gas_estimate",
        "contract_risk_check",
        "explain",
        "unknown",
    ]
    confidence: float = Field(ge=0.0, le=1.0)
    slots: dict[str, str | float | None]
    ambiguities: list[str]
    suggested_clarification: str | None
    raw_input: str
    language_detected: str
    is_flagged: bool = False


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
