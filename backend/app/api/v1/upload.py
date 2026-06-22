from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from openai import AsyncOpenAI
from supabase import AsyncClient

from app.core.config import Settings, get_settings
from app.core.security import limiter
from app.models.upload import UploadResponse
from app.services.document_service import process_and_store_document

router = APIRouter()

ALLOWED_MIME_TYPES = {"application/pdf"}


def get_supabase(request: Request) -> AsyncClient:
    return request.app.state.supabase


def get_openai(request: Request) -> AsyncOpenAI:
    return request.app.state.openai


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF document for indexing",
)
@limiter.limit(lambda: get_settings().rate_limit_upload)
async def upload_document(
    request: Request,
    file: UploadFile,
    settings: Settings = Depends(get_settings),
    supabase: AsyncClient = Depends(get_supabase),
    openai_client: AsyncOpenAI = Depends(get_openai),
) -> UploadResponse:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported.",
        )

    file_bytes = await file.read()

    if len(file_bytes) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum size of {settings.max_file_size_mb} MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    chunks_stored = await process_and_store_document(
        file_bytes=file_bytes,
        filename=file.filename or "unknown.pdf",
        supabase=supabase,
        openai_client=openai_client,
    )

    return UploadResponse(
        message="Document indexed successfully.",
        filename=file.filename or "unknown.pdf",
        chunks_stored=chunks_stored,
    )
