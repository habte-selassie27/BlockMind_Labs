"""FastAPI routes for analytics-service."""

from typing import Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from .chain import get_chain_stats, get_balance, get_transaction_count
from .summaries import generate_portfolio_summary, generate_tx_summary
from .events import track_event, get_event_count, get_events

router = APIRouter()

_r: Any = None
_http: Any = None


def init_deps(r: Any, http: Any):
    global _r, _http
    _r = r
    _http = http


def get_r() -> Any:
    if not _r:
        raise HTTPException(500, "Redis not initialized")
    return _r


def get_http() -> Any:
    if not _http:
        raise HTTPException(500, "HTTP client not initialized")
    return _http


class PortfolioRequest(BaseModel):
    address: str
    chain_id: int = 91342


class EventRequest(BaseModel):
    event_type: str
    user_id: str | None = None
    metadata: dict = {}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "analytics-service"}


@router.get("/chain/stats")
async def chain_stats(http: Any = Depends(get_http)):
    try:
        stats = await get_chain_stats(http)
        return stats
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch chain stats: {e}")


@router.get("/balance/{address}")
async def balance(address: str, chain_id: int = 91342, http: Any = Depends(get_http)):
    try:
        bal = await get_balance(http, address)
        return {"address": address, "chain_id": chain_id, "balance": bal}
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch balance: {e}")


@router.post("/portfolio", response_model=None)
async def portfolio_summary(req: PortfolioRequest, http: Any = Depends(get_http)):
    try:
        native_balance = await get_balance(http, req.address)
        summary = generate_portfolio_summary(req.address, req.chain_id, native_balance)
        return summary
    except Exception as e:
        raise HTTPException(502, f"Failed to generate portfolio summary: {e}")


@router.post("/events")
async def create_event(req: EventRequest, r: Any = Depends(get_r)):
    await track_event(r, req.event_type, req.user_id, req.metadata)
    return {"tracked": True}


@router.get("/events/{event_type}")
async def list_events(event_type: str, limit: int = 100, r: Any = Depends(get_r)):
    events = await get_events(r, event_type, limit)
    count = await get_event_count(r, event_type)
    return {"event_type": event_type, "total": count, "events": events}


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: analytics-service
