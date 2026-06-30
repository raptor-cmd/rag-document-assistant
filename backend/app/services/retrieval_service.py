import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from supabase import AsyncClient

from app.models.query import DocumentMatch, ParentContext
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)

CHAT_MODEL = "gpt-4o-mini"
CHILD_MATCH_COUNT = 10
MAX_PARENT_CONTEXTS = 5
# Umbral de similitud forzado en el servicio (temporal para depuración).
# Ignora el valor del body para garantizar que la búsqueda traiga resultados.
SIMILARITY_THRESHOLD = 0.3

NO_CONTEXT_MESSAGE = (
    "No encontré información relevante en los documentos indexados para responder "
    "a tu pregunta. Intenta reformularla o sube un documento relacionado."
)

SYSTEM_PROMPT = (
    "You are a helpful assistant that works with document content. "
    "You can answer questions, write summaries, create new content inspired by the documents, "
    "analyze ideas, or perform any task the user requests — always grounded in the provided context. "
    "When generating creative content (sermons, essays, outlines, etc.), use the document as your "
    "source material and inspiration. Do not invent facts or data not present in the context.\n\n"
    "[INSTRUCCIÓN DE FORMATO EXCLUSIVA]\n"
    "- Responde siempre utilizando estrictamente formato GitHub Flavored Markdown (GFM) limpio y válido.\n"
    "- Cuando el usuario te pida comparar datos, resumir estructuras complejas o presentar métricas, "
    "utiliza OBLIGATORIAMENTE tablas de Markdown estructuradas (usando las barras verticales '|' y "
    "líneas de guiones '---' para las cabeceras).\n"
    "- No utilices bloques de texto crudo desalineados ni intentes simular tablas usando espacios o tabulaciones.\n"
    "- Si incluyes fragmentos de código, especifica siempre el lenguaje de programación inmediatamente "
    "después de los tres acentos graves (ej. ```python o ```typescript) para habilitar el resaltado "
    "de sintaxis en el cliente.\n"
    "- Mantén una jerarquía de títulos limpia usando '#' solo si es necesario, priorizando negritas "
    "('**') y listas ordenadas o desordenadas para mejorar la legibilidad."
)


async def retrieve_parent_contexts(
    query: str,
    supabase: AsyncClient,
    openai_client: AsyncOpenAI,
    match_count: int = 5,
    match_threshold: float = 0.5,
    document_ids: list[str] | None = None,
) -> tuple[list[ParentContext], list[DocumentMatch]]:
    embedding = await generate_embedding(query, openai_client)

    # Forzamos el umbral del servicio en lugar del valor del body para
    # garantizar que la búsqueda traiga resultados durante la depuración.
    effective_threshold = min(match_threshold, SIMILARITY_THRESHOLD)

    rpc_params: dict = {
        "query_embedding": embedding,
        "match_threshold": effective_threshold,
        "match_count": CHILD_MATCH_COUNT,
    }
    if document_ids:
        rpc_params["filter_document_ids"] = document_ids

    child_response = await supabase.rpc("match_children", rpc_params).execute()

    child_rows = child_response.data or []
    logger.info(
        "[RETRIEVAL] query=%r | threshold=%.3f | child_matches=%d | similarities=%s",
        query,
        effective_threshold,
        len(child_rows),
        [round(float(r["similarity"]), 3) for r in child_rows],
    )

    # --- Deduplicate: agrupar hijos ganadores por su parent_id ---
    seen_parent_ids: list[str] = []
    best_similarity: dict[str, float] = {}
    for row in child_rows:
        pid = str(row["parent_id"])
        sim = float(row["similarity"])
        if pid not in best_similarity:
            seen_parent_ids.append(pid)
            best_similarity[pid] = sim
        else:
            best_similarity[pid] = max(best_similarity[pid], sim)

    unique_parent_ids = seen_parent_ids[:MAX_PARENT_CONTEXTS]
    logger.info(
        "[RETRIEVAL] unique_parent_ids=%d -> %s",
        len(unique_parent_ids),
        unique_parent_ids,
    )

    # --- Fallback global: si no hay coincidencias semánticas pero sí document_ids,
    # cargamos todos los padres del documento (resúmenes, creaciones, preguntas globales) ---
    if not unique_parent_ids and document_ids:
        logger.info(
            "[RETRIEVAL] Sin matches semánticos — activando fallback global para document_ids=%s",
            document_ids,
        )
        global_response = (
            await supabase.table("parent_documents")
            .select("id, content, metadata")
            .in_("document_id", document_ids)
            .execute()
        )
        for row in global_response.data or []:
            pid = str(row["id"])
            unique_parent_ids.append(pid)
            best_similarity[pid] = 0.0

    # --- Fetch: recuperar los Documentos Padre completos por su id ---
    contexts: list[ParentContext] = []
    sources: list[DocumentMatch] = []

    if unique_parent_ids:
        parent_response = (
            await supabase.table("parent_documents")
            .select("id, content, metadata")
            .in_("id", unique_parent_ids)
            .execute()
        )
        parent_by_id = {
            str(row["id"]): row for row in (parent_response.data or [])
        }

        for pid in unique_parent_ids:
            row = parent_by_id.get(pid)
            if not row:
                logger.warning("[RETRIEVAL] parent_id=%s sin fila en parent_documents", pid)
                continue
            source = (row.get("metadata") or {}).get("source", "unknown")
            contexts.append(
                ParentContext(
                    id=pid,
                    content=row["content"],
                    source=source,
                )
            )
            sources.append(
                DocumentMatch(
                    id=pid,
                    content=row["content"][:300],
                    similarity=best_similarity[pid],
                )
            )

    logger.info(
        "[RETRIEVAL] parent_contexts_fetched=%d | total_context_chars=%d",
        len(contexts),
        sum(len(c.content) for c in contexts),
    )

    return contexts, sources


async def stream_rag_response(
    query: str,
    contexts: list[ParentContext],
    openai_client: AsyncOpenAI,
) -> AsyncGenerator[str, None]:
    # Fallback seguro: si no hay padres recuperados, no llamamos al LLM con un
    # contexto vacío (eso causa alucinaciones tipo "no tengo acceso al documento").
    if not contexts:
        logger.warning("[RAG] Sin contexto de padres — devolviendo mensaje de fallback.")
        yield NO_CONTEXT_MESSAGE
        return

    context_text = "\n\n---\n\n".join(
        f"[Source {i + 1} — {ctx.source}]\n{ctx.content}"
        for i, ctx in enumerate(contexts)
    )

    user_message = f"Context:\n{context_text}\n\nQuestion: {query}"

    # Log del contexto EXACTO que viaja a OpenAI (para verificar Padres vs Hijos).
    logger.info(
        "[RAG] Prompt context (%d chars) enviado a OpenAI:\n%s",
        len(context_text),
        context_text,
    )

    stream = await openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        stream=True,
        temperature=0.5,
        max_tokens=4096,
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content
