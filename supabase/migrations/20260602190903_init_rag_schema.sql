-- 1. Habilitar la extensión de vectores
create extension if not exists vector;

-- 2. Crear la tabla para almacenar los fragmentos de los documentos
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    embedding vector(1536), -- 1536 dimensiones para text-embedding-3-small
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Crear un índice de tipo HNSW para optimizar las búsquedas por similitud de coseno
create index on documents using hnsw (embedding vector_cosine_ops);

-- 4. Crear la función RPC para la búsqueda semántica desde FastAPI
create or replace function match_documents (
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
language sql stable
as $$
    select
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) as similarity
    from documents
    where 1 - (documents.embedding <=> query_embedding) > match_threshold
    order by documents.embedding <=> query_embedding asc
    limit match_count;
$$;

-- 5. Permisos para service_role (usado por el backend FastAPI)
grant all on public.documents to service_role;
grant execute on function match_documents(vector, double precision, integer) to service_role;