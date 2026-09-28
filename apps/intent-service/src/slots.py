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

# TX hash pattern (0x + 64 hex)
_TX_HASH_RE = re.compile(r"\b(0x[0-9a-fA-F]{64})\b")

# UP ID pattern: alice.up, bob.giwa, alice.up.id, etc. — GIWA playground style
_UP_ID_RE = re.compile(r"\b([a-zA-Z0-9_-]+\.(?:up|giwa)(?:\.up)?)\b", re.IGNORECASE)

# Amount patterns: "10 giwa", "0.5 eth", "$100"
_AMOUNT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(giwa|eth|usdt|usdc|dai|wbtc|wei|gwei)?\b",
    re.IGNORECASE,
)

# NFT patterns
_NFT_ID_RE = re.compile(r"\bnft\s*(?:#?(\d+))?\b", re.IGNORECASE)

# Bridge direction
_BRIDGE_RE = re.compile(r"bridge\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+from\s+(\w+)\s+to\s+(\w+)", re.IGNORECASE)


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
    """Extract a recipient address, UP ID, or ENS-like name."""
    # Check for UP ID first (GIWA-native)
    up_match = _UP_ID_RE.search(text)
    if up_match:
        return up_match.group(1).lower()

    # Check for hex address
    addr_match = _ADDRESS_RE.search(text)
    if addr_match:
        return addr_match.group(1).lower()

    # Check for named recipient (e.g., "to Alice")
    to_match = re.search(r"\bto\s+([A-Za-z][A-Za-z0-9_\.]*)\b", text)
    if to_match:
        candidate = to_match.group(1)
        # Filter out common stop words
        if candidate.lower() not in {"the", "my", "a", "an"}:
            return candidate

    return None


def extract_up_id(text: str) -> str | None:
    """Extract UP ID (e.g., alice.up) from text."""
    m = _UP_ID_RE.search(text)
    if m:
        return m.group(1).lower()
    return None


def extract_tx_hash(text: str) -> str | None:
    """Extract TX hash (0x + 64 hex)."""
    m = _TX_HASH_RE.search(text)
    if m:
        return m.group(1).lower()
    return None


def extract_bridge_params(text: str) -> dict[str, str | float | None]:
    """Extract bridge amount, token, from_chain, to_chain."""
    params: dict[str, str | float | None] = {}
    lower = text.lower()
    # Amount + token (prefer amount-adjacent)
    amt = extract_amount(text)
    m_amt = _AMOUNT_RE.search(text)
    tok = None
    if m_amt and m_amt.group(2):
        raw = m_amt.group(2).lower()
        tok = _TOKEN_ALIASES.get(raw, raw.upper())
    if tok is None:
        tok = extract_token(text)
    if amt is not None:
        params["amount"] = amt
    if tok:
        params["token"] = tok
    # Direction: from X to Y or to GIWA / from Sepolia
    from_match = re.search(r"from\s+([a-z\s]+?)(?:\s+to\b|\s*$)", text, re.IGNORECASE)
    to_match = re.search(r"to\s+([a-z\s]+?)(?:\s*$|\s+on|\.)", text, re.IGNORECASE)
    if from_match:
        params["from_chain"] = from_match.group(1).strip().lower()
        # Resolve to chain_id if known
        cid = _CHAIN_IDS.get(params["from_chain"])  # type: ignore
        if cid:
            params["from_chain_id"] = cid
    if to_match:
        params["to_chain"] = to_match.group(1).strip().lower()
        cid = _CHAIN_IDS.get(params["to_chain"])  # type: ignore
        if cid:
            params["to_chain_id"] = cid
    # Fallback: detect chain names anywhere
    for chain_name, cid in _CHAIN_IDS.items():
        if chain_name in lower:
            if "from_chain" not in params and f"from {chain_name}" in lower:
                params["from_chain"] = chain_name
                params["from_chain_id"] = cid
            if "to_chain" not in params and f"to {chain_name}" in lower:
                params["to_chain"] = chain_name
                params["to_chain_id"] = cid
    return params


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
    # Prefer token adjacent to amount (e.g., "0.1 ETH") over global alias
    amount_token = None
    m_amt = _AMOUNT_RE.search(text)
    if m_amt and m_amt.group(2):
        raw = m_amt.group(2).lower()
        amount_token = _TOKEN_ALIASES.get(raw, raw.upper())
    token = amount_token or extract_token(text)
    chain = extract_chain(text)
    chain_id = extract_chain_id(text)
    up_id = extract_up_id(text)
    tx_hash = extract_tx_hash(text)

    if amount is not None:
        slots["amount"] = amount
    if token is not None:
        slots["token"] = token
    if chain is not None:
        slots["chain"] = chain
    if chain_id is not None:
        slots["chain_id"] = chain_id
    if up_id is not None:
        slots["up_id"] = up_id
        # Also set recipient as UP ID for convenience
        if "recipient" not in slots:
            slots["recipient"] = up_id
    if tx_hash is not None:
        slots["tx_hash"] = tx_hash
        slots["transaction_hash"] = tx_hash

    # Intent-specific slots
    if intent_class in ("transfer", "swap", "approve", "stake", "unstake", "bridge", "bridge_status"):
        recipient = extract_recipient(text)
        if recipient:
            slots["recipient"] = recipient
        # Also expose explicit up_id alias
        if up_id and "up_id" not in slots:
            slots["up_id"] = up_id

    if intent_class == "bridge" or intent_class == "bridge_status":
        bridge_params = extract_bridge_params(text)
        for k, v in bridge_params.items():
            # For bridge, allow bridge_params to correct token/chain
            if k == "token" and v:
                slots[k] = v
            elif k not in slots:
                slots[k] = v
        # Ensure token defaults to ETH for bridge if not specified
        if "token" not in slots and "amount" in slots:
            slots["token"] = "ETH"

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

    if intent_class in ("resolve_identity", "create_identity", "verify_identity"):
        if up_id:
            slots["up_id"] = up_id
            slots["identity"] = up_id
        # Also capture raw name for create_identity: "create UP ID alice.up"
        name_match = re.search(r"(?:create|register|make)\s+(?:my\s+)?(?:up\s+id\s+)?([a-z0-9_-]+\.(?:up|giwa))", text, re.IGNORECASE)
        if name_match:
            slots["requested_up_id"] = name_match.group(1).lower()

    if intent_class in ("explain_transaction", "debug_transaction"):
        if tx_hash:
            slots["tx_hash"] = tx_hash
        else:
            # Check for 0x hash even if not full 64 (partial for demo)
            addr = extract_contract_address(text)
            if addr:
                slots["contract_address"] = addr

    if intent_class in ("explain_address",):
        addr = extract_contract_address(text)
        if addr:
            slots["address"] = addr
            slots["contract_address"] = addr
        if up_id:
            slots["up_id"] = up_id

    if intent_class in ("batch_execute",):
        # Detect multi-step keywords for chaining
        if "approve" in text.lower() and "stake" in text.lower():
            slots["batch_type"] = "approve_and_stake"
        elif "deposit" in text.lower() and "stake" in text.lower():
            slots["batch_type"] = "deposit_and_stake"
        else:
            slots["batch_type"] = "multi_step"

    if intent_class in ("discover",):
        # Extract category: defi, nft, etc.
        cat_match = re.search(r"\b(defi|nft|bridge|social|gaming|infrastructure|staking)\b", text, re.IGNORECASE)
        if cat_match:
            slots["category"] = cat_match.group(1).lower()

    if intent_class == "read_balance":
        pass  # Wallet comes from JWT, not user input

    if intent_class in ("read_contract", "contract_risk_check"):
        contract = extract_contract_address(text)
        if contract:
            slots["contract_address"] = contract
        if up_id:
            slots["up_id"] = up_id

    if intent_class == "get_nft":
        nft_id = extract_nft_id(text)
        if nft_id is not None:
            slots["nft_id"] = nft_id

    return slots


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
