import io
import uuid

import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
from supabase import AsyncClient

from app.services.embedding_service import generate_embeddings_batch

PARENT_CHUNK_SIZE = 2500
PARENT_CHUNK_OVERLAP = 200
CHILD_CHUNK_SIZE = 400
CHILD_CHUNK_OVERLAP = 50
EMBEDDING_BATCH_SIZE = 100

_parent_splitter = RecursiveCharacterTextSplitter(
    chunk_size=PARENT_CHUNK_SIZE,
    chunk_overlap=PARENT_CHUNK_OVERLAP,
    length_function=len,
)

_child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHILD_CHUNK_SIZE,
    chunk_overlap=CHILD_CHUNK_OVERLAP,
    length_function=len,
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def split_into_parents(text: str) -> list[str]:
    return _parent_splitter.split_text(text)


def split_into_children(parent_text: str) -> list[str]:
    return _child_splitter.split_text(parent_text)


async def process_and_store_document(
    file_bytes: bytes,
    filename: str,
    supabase: AsyncClient,
    openai_client: AsyncOpenAI,
) -> tuple[int, str]:
    document_id = str(uuid.uuid4())
    text = extract_text_from_pdf(file_bytes)
    parents = split_into_parents(text)

    if not parents:
        return 0, document_id

    parent_rows = [
        {
            "document_id": document_id,
            "content": parent,
            "metadata": {"source": filename, "parent_index": idx},
        }
        for idx, parent in enumerate(parents)
    ]
    parent_result = await supabase.table("parent_documents").insert(parent_rows).execute()
    parent_ids = [row["id"] for row in parent_result.data]

    children_stored = 0
    for parent_id, parent_text in zip(parent_ids, parents):
        children = split_into_children(parent_text)
        if not children:
            continue

        for batch_start in range(0, len(children), EMBEDDING_BATCH_SIZE):
            batch = children[batch_start : batch_start + EMBEDDING_BATCH_SIZE]
            embeddings = await generate_embeddings_batch(batch, openai_client)

            child_rows = [
                {
                    "parent_id": parent_id,
                    "document_id": document_id,
                    "content": child,
                    "embedding": embedding,
                    "metadata": {"source": filename},
                }
                for child, embedding in zip(batch, embeddings)
            ]
            await supabase.table("child_chunks").insert(child_rows).execute()
            children_stored += len(child_rows)

    return children_stored, document_id
