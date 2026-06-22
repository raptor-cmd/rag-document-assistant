import io

import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
from supabase import AsyncClient

from app.services.embedding_service import generate_embeddings_batch

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_BATCH_SIZE = 100


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def split_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
    )
    return splitter.split_text(text)


async def process_and_store_document(
    file_bytes: bytes,
    filename: str,
    supabase: AsyncClient,
    openai_client: AsyncOpenAI,
) -> int:
    text = extract_text_from_pdf(file_bytes)
    chunks = split_text(text)

    if not chunks:
        return 0

    stored_count = 0
    for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        embeddings = await generate_embeddings_batch(batch, openai_client)

        rows = [
            {
                "content": chunk,
                "embedding": embedding,
                "metadata": {"source": filename, "chunk_index": i + j},
            }
            for j, (chunk, embedding) in enumerate(zip(batch, embeddings))
        ]

        await supabase.table("documents").insert(rows).execute()
        stored_count += len(rows)

    return stored_count
