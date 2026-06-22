from fastapi import APIRouter

from app.api.v1 import query, upload

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(upload.router, tags=["documents"])
api_router.include_router(query.router, tags=["query"])
