"""FastAPI routes for memory-service."""

from typing import Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from .context import load_context, save_conversation_turn
from .working import get_turns, clear_turns
from .preferences import get_user_preferences, upsert_user_preferences
from .models import AgentContext

router = APIRouter()

_r: Any = None
_pg: Any = None
_http: Any = None


def init_deps(r: Any, pg: Any, http: Any):
    global _r, _pg, _http
    _r = r
    _pg = pg
    _http = http


def get_r() -> Any:
    if not _r:
        raise HTTPException(500, "Redis not initialized")
    return _r


def get_pg() -> Any:
    if not _pg:
        raise HTTPException(500, "PostgreSQL not initialized")
    return _pg


def get_http() -> Any:
    if not _http:
        raise HTTPException(500, "HTTP client not initialized")
    return _http


# ── Request / Response models ────────────────────────────────────────────

class LoadContextRequest(BaseModel):
    user_id: str
    query: str
    query_embedding: list[float] | None = None


class SaveTurnRequest(BaseModel):
    user_id: str
    role: str = Field(pattern="^(user|assistant)$")
    content: str
    embedding: list[float] | None = None


class PreferencesRequest(BaseModel):
    user_id: str
    wallet_address: str | None = None
    default_chain: int = 91342
    risk_tolerance: str = "moderate"
    tx_summary: str | None = None


# ── Routes ───────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok", "service": "memory-service"}


@router.post("/context/load", response_model=AgentContext)
async def load_context_endpoint(
    req: LoadContextRequest,
    r: Any = Depends(get_r),
    pg: Any = Depends(get_pg),
    http: Any = Depends(get_http),
):
    ctx = await load_context(r, pg, http, req.user_id, req.query, req.query_embedding)
    return ctx


@router.post("/context/turn")
async def save_turn(
    req: SaveTurnRequest,
    r: Any = Depends(get_r),
    pg: Any = Depends(get_pg),
    http: Any = Depends(get_http),
):
    await save_conversation_turn(r, pg, http, req.user_id, req.role, req.content, req.embedding)
    return {"saved": True}


@router.get("/context/turns/{user_id}")
async def get_turns_endpoint(
    user_id: str,
    limit: int = 20,
    r: Any = Depends(get_r),
):
    turns = await get_turns(r, user_id, limit)
    return {"turns": turns}


@router.delete("/context/turns/{user_id}")
async def clear_turns_endpoint(
    user_id: str,
    r: Any = Depends(get_r),
):
    await clear_turns(r, user_id)
    return {"cleared": True}


@router.get("/preferences/{user_id}")
async def get_prefs(
    user_id: str,
    r: Any = Depends(get_r),
    pg: Any = Depends(get_pg),
):
    prefs = await get_user_preferences(pg, r, user_id)
    if not prefs:
        raise HTTPException(404, "User preferences not found")
    return prefs


@router.put("/preferences")
async def upsert_prefs(
    req: PreferencesRequest,
    r: Any = Depends(get_r),
    pg: Any = Depends(get_pg),
):
    prefs = await upsert_user_preferences(
        pg, r, req.user_id, req.wallet_address,
        req.default_chain, req.risk_tolerance, req.tx_summary,
    )
    return prefs


# ✅ COMPLIES WITH: AGENTS.md §9, §10
# ✅ SERVICE: memory-service
