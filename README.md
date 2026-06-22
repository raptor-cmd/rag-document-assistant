# RAG Document Assistant

Upload PDFs and ask questions about their content using semantic search + GPT-4o mini.

## Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Database | Supabase (pgvector) | Supabase Cloud |
| Backend | FastAPI + Python 3.11 | Render |
| Frontend | Next.js 15 + TypeScript + Tailwind | Vercel |

## Quick Start (Local Dev)

### Prerequisites
- Docker Desktop
- Supabase CLI (`npm install -g supabase`)
- Node.js 20+

### 1. Start Supabase locally

```bash
supabase start
# Note the API URL and service_role key from the output
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env with your Supabase and OpenAI keys
```

### 3. Start all services

```bash
# docker-compose.override.yml is picked up automatically for hot-reload
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| Supabase Studio | http://localhost:54323 |

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
|--------|------|-------------|
| `GET` | `/health` | Liveness + DB connectivity check |
| `POST` | `/api/v1/upload` | Upload and index a PDF |
| `POST` | `/api/v1/query` | Semantic search + streaming answer |

## Security

- Non-root Docker users (`uid=1001`) in production stages
- Rate limiting via `slowapi` (configurable in `.env`)
- CORS with explicit allowed origins
- Security headers on all responses
- Secrets via env vars only — never in images or git
