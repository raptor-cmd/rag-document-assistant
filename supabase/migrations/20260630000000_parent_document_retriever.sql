-- ============================================================
-- Parent-Document Retriever — migración de esquema RAG
-- Reemplaza la tabla 'documents' por dos tablas:
--   parent_documents  →  bloques grandes de texto (sin embedding)
--   child_chunks      →  fragmentos pequeños con embedding (FK al padre)
-- ============================================================

-- 1. Eliminar esquema antiguo
drop function if exists match_documents(vector, double precision, integer);
drop table if exists documents;

-- 2. Tabla de padres (texto completo ~2500 chars, sin embedding)
create table if not exists parent_documents (
    id         uuid primary key default gen_random_uuid(),
    content    text not null,
    metadata   jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Tabla de hijos (fragmentos ~400 chars con embedding, FK al padre)
create table if not exists child_chunks (
    id         uuid primary key default gen_random_uuid(),
    parent_id  uuid not null references parent_documents(id) on delete cascade,
    content    text not null,
    embedding  vector(1536),
    metadata   jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Índice HNSW sobre el embedding de los hijos
create index on child_chunks using hnsw (embedding vector_cosine_ops);

-- 5. Función RPC para búsqueda semántica sobre hijos
create or replace function match_children(
    query_embedding vector(1536),
    match_threshold float,
    match_count     int
)
returns table (
    id          uuid,
    parent_id   uuid,
    content     text,
    metadata    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        child_chunks.id,
        child_chunks.parent_id,
        child_chunks.content,
        child_chunks.metadata,
        1 - (child_chunks.embedding <=> query_embedding) as similarity
    from child_chunks
    where 1 - (child_chunks.embedding <=> query_embedding) > match_threshold
    order by child_chunks.embedding <=> query_embedding asc
    limit match_count;
$$;

-- 6. Permisos para service_role (backend FastAPI)
grant all on public.parent_documents to service_role;
grant all on public.child_chunks to service_role;
grant execute on function match_children(vector, double precision, integer) to service_role;
