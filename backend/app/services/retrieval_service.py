from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from supabase import AsyncClient

from app.models.query import DocumentMatch
from app.services.embedding_service import generate_embedding

CHAT_MODEL = "gpt-4o-mini"
MAX_CONTEXT_CHUNKS = 5

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions based strictly on the "
    "provided document context. If the answer is not found in the context, say "
    "so clearly. Do not fabricate information."
)


async def retrieve_similar_documents(
    query: str,
    supabase: AsyncClient,
    openai_client: AsyncOpenAI,
    match_count: int = 5,
    match_threshold: float = 0.5,
) -> list[DocumentMatch]:
    embedding = await generate_embedding(query, openai_client)

    response = await supabase.rpc(
        "match_documents",
        {
            "query_embedding": embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
        },
    ).execute()

    return [
        DocumentMatch(
            id=str(row["id"]),
            content=row["content"],
            similarity=row["similarity"],
        )
        for row in (response.data or [])
    ]


async def stream_rag_response(
    query: str,
    matches: list[DocumentMatch],
    openai_client: AsyncOpenAI,
) -> AsyncGenerator[str, None]:
    context = "\n\n---\n\n".join(
        f"[Source {i + 1}]\n{match.content}"
        for i, match in enumerate(matches[:MAX_CONTEXT_CHUNKS])
    )

    user_message = f"Context:\n{context}\n\nQuestion: {query}"

    stream = await openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        stream=True,
        temperature=0.2,
        max_tokens=1024,
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content
