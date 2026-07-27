"""Blockmind Intent Service — FastAPI routes."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .models import ParsedIntent
from .parser import parse_intent

app = FastAPI(
    title="Blockmind Intent Service",
    description="NLP intent parsing for natural language → on-chain actions",
    version="0.1.0",
)


class ParseRequest(BaseModel):
    """Request body for intent parsing."""

    message: str


class ParseResponse(BaseModel):
    """Response body for intent parsing."""

    intent: ParsedIntent


@app.get("/health")
async def health():
    return {"status": "ok", "service": "intent-service"}


@app.post("/v1/intent/parse", response_model=ParseResponse)
async def parse_intent_endpoint(req: ParseRequest) -> ParseResponse:
    """Parse a natural language message into a structured intent."""
    intent = parse_intent(req.message)
    return ParseResponse(intent=intent)


# ✅ COMPLIES WITH: AGENTS.md §9, API.md
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
