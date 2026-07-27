from pydantic import BaseModel, Field


class PortfolioSummary(BaseModel):
    """NL-friendly portfolio summary."""
    user_id: str
    wallet_address: str
    chain_id: int
    total_balance_usd: float = 0.0
    tokens: list[dict] = Field(default_factory=list)
    recent_transactions: list[dict] = Field(default_factory=list)
    summary_nl: str = ""


class TokenBalance(BaseModel):
    """Single token balance."""
    symbol: str
    name: str
    balance: str
    balance_usd: float = 0.0
    contract_address: str | None = None


class TransactionHistory(BaseModel):
    """Transaction history for an address."""
    address: str
    chain_id: int
    transactions: list[dict] = Field(default_factory=list)
    total_count: int = 0


class ChainStats(BaseModel):
    """Chain-level statistics."""
    chain_id: int
    block_number: int
    gas_price: str
    network_health: str


class AnalyticsEvent(BaseModel):
    """Event tracked for analytics."""
    event_type: str
    user_id: str | None = None
    metadata: dict = Field(default_factory=dict)


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: analytics-service
