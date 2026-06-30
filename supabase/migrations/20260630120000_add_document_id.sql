-- ============================================================
-- Añade document_id UUID para aislar búsquedas por sesión/upload
-- ============================================================

-- 1. Columna document_id en parent_documents
alter table parent_documents
    add column if not exists document_id uuid;

-- 2. Columna document_id en child_chunks (denormalizada para filtrar sin JOIN)
alter table child_chunks
    add column if not exists document_id uuid;

-- 3. Índice para filtrar por document_id eficientemente
create index if not exists idx_child_chunks_document_id
    on child_chunks (document_id);

-- 4. Reemplazar match_children con soporte para filtrado opcional por document_ids
create or replace function match_children(
    query_embedding      vector(1536),
    match_threshold      float,
    match_count          int,
    filter_document_ids  uuid[] default null
)
returns table (
    id           uuid,
    parent_id    uuid,
    document_id  uuid,
    content      text,
    metadata     jsonb,
    similarity   float
)
language sql stable
as $$
    select
        child_chunks.id,
        child_chunks.parent_id,
        child_chunks.document_id,
        child_chunks.content,
        child_chunks.metadata,
        1 - (child_chunks.embedding <=> query_embedding) as similarity
    from child_chunks
    where
        1 - (child_chunks.embedding <=> query_embedding) > match_threshold
        and (
            filter_document_ids is null
            or child_chunks.document_id = any(filter_document_ids)
        )
    order by child_chunks.embedding <=> query_embedding asc
    limit match_count;
$$;

-- 5. Permisos
grant execute on function match_children(vector, double precision, integer, uuid[]) to service_role;
