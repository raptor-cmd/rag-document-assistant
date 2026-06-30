import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from supabase import acreate_client

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.security import SecurityHeadersMiddleware, limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — initializing clients...")
    app.state.supabase = await acreate_client(
        settings.supabase_url,
        settings.supabase_service_key,
    )
    app.state.openai = AsyncOpenAI(api_key=settings.openai_api_key)
    logger.info("Clients initialized successfully.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="RAG Document Assistant",
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(api_router)


@app.get("/health", tags=["system"], include_in_schema=True)
async def health_check(request: Request) -> JSONResponse:
    db_status = "ok"
    http_status = status.HTTP_200_OK
    overall = "ok"

    try:
        await request.app.state.supabase.table("child_chunks").select("id").limit(1).execute()
    except Exception as exc:
        logger.warning("Health check — DB error: %s", exc)
        db_status = f"error: {type(exc).__name__}"
        overall = "degraded"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall,
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "database": db_status,
            },
        },
    )
