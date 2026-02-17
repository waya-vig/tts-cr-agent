from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin_knowledge, auth, copilot, cr, health, knowledge, market, shops


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: startup and shutdown events."""
    # Startup: ensure Pinecone index exists
    if settings.pinecone_api_key:
        try:
            from app.services.pinecone_service import ensure_index

            await ensure_index()
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(f"Pinecone init skipped: {e}")
    yield
    # Shutdown (close DB connections, etc.)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(shops.router, prefix="/api/v1")
app.include_router(cr.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")
app.include_router(copilot.router, prefix="/api/v1")
app.include_router(admin_knowledge.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.app_name} API"}
