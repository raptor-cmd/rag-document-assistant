# RAG Document Assistant

Upload PDFs and ask questions about their content using semantic search + GPT-4o mini.

## Stack

| Layer | Technology | Deployment |
| ----- | ---------- | ---------- |
| Database | Supabase (pgvector) | Supabase Cloud |
| Backend | FastAPI + Python 3.11 | Render |
| Frontend | Next.js 15 + TypeScript + Tailwind | Vercel |

## Quick Start (Local Dev)

### Prerequisites

- Docker (`sudo apt install docker.io docker-compose-v2` en Ubuntu, luego `sudo usermod -aG docker $USER`)
- Supabase CLI (`npm install -g supabase`)
- Node.js 20+ (solo para instalar el CLI)

### 1. Ejecutar el script de configuración

El script copia los `.env`, solicita la `OPENAI_API_KEY` si no está configurada,
arranca Supabase e inyecta automáticamente las credenciales en `backend/.env`.

```bash
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

> El script reemplaza internamente `127.0.0.1` → `host.docker.internal` en
> `SUPABASE_URL` para que el contenedor Docker del backend pueda alcanzar
> el Supabase que corre en el host.

### 2. Lanzar los servicios

```bash
# docker-compose.override.yml se carga automáticamente (hot-reload)
docker compose up --build
```

| Service | URL |
| ------- | --- |
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8000/docs> |
| Supabase Studio | <http://localhost:54323> |

### Parar los servicios

```bash
docker compose down        # para los contenedores de la app
supabase stop              # para los contenedores de Supabase
```

## Deployment

### Backend → Render

1. Connect your GitHub repo to Render
2. Set **Root Directory** to `./backend`
3. Set **Dockerfile Path** to `./Dockerfile`
4. Add all env vars from `backend/.env.example` in the Render dashboard

### Frontend → Vercel

1. Import the repo to Vercel
2. Set **Root Directory** to `./frontend`
3. Add `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`

### Database → Supabase Cloud

1. Create a project at supabase.com
2. Run the migration: **SQL Editor** → paste contents of `supabase/migrations/20260602190903_init_rag_schema.sql`
3. Copy the Project URL and service_role key into your Render env vars

## API Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Liveness + DB connectivity check |
| `POST` | `/api/v1/upload` | Upload and index a PDF |
| `POST` | `/api/v1/query` | Semantic search + streaming answer |

## Security

- Non-root Docker users (`uid=1001`) in production stages
- Rate limiting via `slowapi` (configurable in `.env`)
- CORS with explicit allowed origins
- Security headers on all responses
- Secrets via env vars only — never in images or git

---

## Adaptaciones para desarrollo local (portátil)

Cambios realizados para ejecutar el proyecto en un equipo con recursos limitados:

### `supabase/config.toml` — servicios deshabilitados

Los siguientes servicios de Supabase se han desactivado porque no son necesarios
para que el backend RAG funcione. Esto reduce el consumo de RAM en ~650 MB:

| Servicio | Motivo para desactivar |
| -------- | --------------------- |
| `realtime` | WebSockets en tiempo real — no usados por la app |
| `inbucket` | Servidor de email de prueba — no necesario |
| `edge_runtime` | Funciones Deno — no usadas |
| `analytics` | Logflare/pg adicional — no necesario para RAG |

Los servicios que permanecen activos son los mínimos imprescindibles:
`db` (PostgreSQL + pgvector), `api` (PostgREST), `auth` (JWT), `studio` (UI).

### `scripts/setup-local.sh` — script de configuración automática

Automatiza los pasos manuales del primer arranque:

1. Comprueba que Docker y Supabase CLI están disponibles.
2. Crea `backend/.env` y `frontend/.env` desde sus `.env.example` si no existen.
3. Solicita la `OPENAI_API_KEY` de forma interactiva si está vacía (entrada oculta).
4. Arranca Supabase local (`supabase start`).
5. Lee `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` de `supabase status` e inyecta
   los valores en `backend/.env` — sin necesidad de copiar y pegar manualmente.
   Convierte `127.0.0.1` → `host.docker.internal` para que el contenedor Docker
   del backend pueda alcanzar Supabase corriendo en el host.

No se añaden ni repiten variables de entorno: el script únicamente rellena las
que ya existen vacías en `backend/.env.example`.
