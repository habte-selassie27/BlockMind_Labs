from pydantic import BaseModel, Field


class AgentContext(BaseModel):
    """Context loaded for the agent-runtime to use."""
    user_id: str
    recent_turns: list[dict] = Field(default_factory=list)
    relevant_memories: list[dict] = Field(default_factory=list)
    wallet_address: str | None = None
    preferred_chain: int | None = None
    transaction_history_summary: str | None = None
    risk_tolerance: str = "moderate"


class MemoryEntry(BaseModel):
    """A single memory stored in Weaviate."""
    user_id: str
    role: str  # "user" or "assistant"
    content: str
    embedding: list[float] | None = None
    metadata: dict = Field(default_factory=dict)


class UserPreferences(BaseModel):
    """User preferences stored in PostgreSQL."""
    user_id: str
    wallet_address: str | None = None
    default_chain: int = 91342  # GIWA Sepolia
    risk_tolerance: str = "moderate"
    tx_summary: str | None = None


class WorkingMemoryItem(BaseModel):
    """A single turn in working memory (Redis list)."""
    role: str
    content: str
    timestamp: float


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: memory-service
