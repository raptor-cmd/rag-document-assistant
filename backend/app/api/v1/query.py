import json

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from supabase import AsyncClient

from app.core.config import get_settings
from app.core.security import limiter
from app.models.query import DocumentMatch, ParentContext, QueryRequest
from app.services.retrieval_service import retrieve_parent_contexts, stream_rag_response

router = APIRouter()


def get_supabase(request: Request) -> AsyncClient:
    return request.app.state.supabase


def get_openai(request: Request) -> AsyncOpenAI:
    return request.app.state.openai


async def _event_stream(
    query: str,
    contexts: list[ParentContext],
    sources: list[DocumentMatch],
    openai_client: AsyncOpenAI,
):
    sources_payload = json.dumps([s.model_dump() for s in sources])
    yield f"data: {json.dumps({'type': 'sources', 'data': sources_payload})}\n\n"

    async for token in stream_rag_response(query, contexts, openai_client):
        yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

    yield "data: [DONE]\n\n"


@router.post(
    "/query",
    status_code=status.HTTP_200_OK,
    summary="Query the indexed documents with semantic search + streaming response",
    response_class=StreamingResponse,
)
@limiter.limit(lambda: get_settings().rate_limit_query)
async def query_documents(
    request: Request,
    body: QueryRequest,
    supabase: AsyncClient = Depends(get_supabase),
    openai_client: AsyncOpenAI = Depends(get_openai),
) -> StreamingResponse:
    contexts, sources = await retrieve_parent_contexts(
        query=body.query,
        supabase=supabase,
        openai_client=openai_client,
        match_count=body.match_count,
        match_threshold=body.match_threshold,
        document_ids=body.document_ids or None,
    )

    return StreamingResponse(
        _event_stream(body.query, contexts, sources, openai_client),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
