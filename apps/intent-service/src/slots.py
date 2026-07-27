"""Slot extraction — pull structured values from natural language input."""

from __future__ import annotations

import re

# Known token symbols and names (expandable)
_TOKEN_ALIASES: dict[str, str] = {
    "giwa": "GIWA",
    "giwa token": "GIWA",
    "eth": "ETH",
    "ethereum": "ETH",
    "usdt": "USDT",
    "tether": "USDT",
    "usdc": "USDC",
    "dai": "DAI",
    "wbtc": "WBTC",
    "wrapped bitcoin": "WBTC",
}

# Chain name to chain ID mapping
_CHAIN_IDS: dict[str, int] = {
    "giwa": 9134,
    "giwa mainnet": 9134,
    "giwa testnet": 91342,
    "ethereum": 1,
    "eth mainnet": 1,
    "sepolia": 11155111,
    "base": 8453,
    "arbitrum": 42161,
    "optimism": 10,
    "polygon": 137,
    "bsc": 56,
    "bnb chain": 56,
}

# Address pattern (0x followed by 40 hex chars)
_ADDRESS_RE = re.compile(r"\b(0x[0-9a-fA-F]{40})\b")

# Amount patterns: "10 giwa", "0.5 eth", "$100"
_AMOUNT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(giwa|eth|usdt|usdc|dai|wbtc|wei|gwei)?\b",
    re.IGNORECASE,
)

# NFT patterns
_NFT_ID_RE = re.compile(r"\bnft\s*(?:#?(\d+))?\b", re.IGNORECASE)


def extract_amount(text: str) -> float | None:
    """Extract a numeric amount from user text."""
    match = _AMOUNT_RE.search(text)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def extract_token(text: str) -> str | None:
    """Extract a token symbol from user text."""
    lower = text.lower()
    for alias, symbol in _TOKEN_ALIASES.items():
        if alias in lower:
            return symbol
    # Check for raw symbols in uppercase
    for word in text.split():
        clean = word.strip(".,!?;:'\"").upper()
        if clean in {"ETH", "USDT", "USDC", "DAI", "WBTC", "GIWA", "BTC"}:
            return clean
    return None


def extract_recipient(text: str) -> str | None:
    """Extract a recipient address or ENS-like name."""
    # Check for hex address
    addr_match = _ADDRESS_RE.search(text)
    if addr_match:
        return addr_match.group(1).lower()

    # Check for named recipient (e.g., "to Alice")
    to_match = re.search(r"\bto\s+([A-Za-z][A-Za-z0-9_]*)", text)
    if to_match:
        return to_match.group(1)

    return None


def extract_chain(text: str) -> str | None:
    """Extract chain name from user text."""
    lower = text.lower()
    for chain_name in _CHAIN_IDS:
        if chain_name in lower:
            return chain_name
    return None


def extract_chain_id(text: str) -> int | None:
    """Extract chain ID from user text."""
    chain = extract_chain(text)
    if chain:
        return _CHAIN_IDS.get(chain)
    return None


def extract_contract_address(text: str) -> str | None:
    """Extract a contract address for risk-check intents."""
    addr_match = _ADDRESS_RE.search(text)
    if addr_match:
        return addr_match.group(1).lower()
    return None


def extract_nft_id(text: str) -> int | None:
    """Extract NFT token ID."""
    match = _NFT_ID_RE.search(text)
    if match and match.group(1):
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def extract_slots(
    text: str, intent_class: str
) -> dict[str, str | float | None]:
    """Extract relevant slots based on the classified intent.

    Returns a dict conforming to ParsedIntent.slots.
    """
    slots: dict[str, str | float | None] = {}

    # Universal slots
    amount = extract_amount(text)
    token = extract_token(text)
    chain = extract_chain(text)
    chain_id = extract_chain_id(text)

    if amount is not None:
        slots["amount"] = amount
    if token is not None:
        slots["token"] = token
    if chain is not None:
        slots["chain"] = chain
    if chain_id is not None:
        slots["chain_id"] = chain_id

    # Intent-specific slots
    if intent_class in ("transfer", "swap", "approve", "stake", "unstake"):
        recipient = extract_recipient(text)
        if recipient:
            slots["recipient"] = recipient

    if intent_class == "swap":
        # Try to extract "to" token
        to_match = re.search(
            r"(?:to|for)\s+(\w+)", text, re.IGNORECASE
        )
        if to_match:
            target = to_match.group(1)
            target_symbol = _TOKEN_ALIASES.get(target.lower(), target.upper())
            if target_symbol and target_symbol != slots.get("token"):
                slots["to_token"] = target_symbol

    if intent_class == "read_balance":
        # For balance reads, recipient is the wallet to check
        pass  # Wallet comes from JWT, not user input

    if intent_class in ("read_contract", "contract_risk_check"):
        contract = extract_contract_address(text)
        if contract:
            slots["contract_address"] = contract

    if intent_class == "get_nft":
        nft_id = extract_nft_id(text)
        if nft_id is not None:
            slots["nft_id"] = nft_id

    return slots


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
