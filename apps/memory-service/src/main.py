"""Memory Service — FastAPI entry point.

Stores:
  - Working memory (Redis): last 20 turns per user
  - Semantic memory (Weaviate): vector search for relevant past interactions
  - User preferences (PostgreSQL): wallet, chain, risk tolerance, cached in Redis
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
import redis.asyncio as redis
import asyncpg
import httpx

from .routes import router, init_deps


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    pg = await asyncpg.create_pool(os.getenv("DATABASE_URL", "postgresql://localhost/blockmind"))
    http = httpx.AsyncClient(timeout=30.0)

    init_deps(r, pg, http)
    yield

    # Shutdown
    await http.aclose()
    await pg.close()
    await r.close()


app = FastAPI(
    title="Blockmind Memory Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


# ✅ COMPLIES WITH: AGENTS.md §2, §9
# ✅ SERVICE: memory-service
