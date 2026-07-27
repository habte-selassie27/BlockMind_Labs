"""Analytics Service — FastAPI entry point.

Provides:
  - Chain statistics (block number, gas price, network health)
  - Portfolio summaries (NL-friendly)
  - Analytics event tracking
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
import redis.asyncio as redis
import httpx

from .routes import router, init_deps


@asynccontextmanager
async def lifespan(app: FastAPI):
    r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    http = httpx.AsyncClient(timeout=30.0)
    init_deps(r, http)
    yield
    await http.aclose()
    await r.close()


app = FastAPI(
    title="Blockmind Analytics Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


# ✅ COMPLIES WITH: AGENTS.md §2, §9
# ✅ SERVICE: analytics-service
