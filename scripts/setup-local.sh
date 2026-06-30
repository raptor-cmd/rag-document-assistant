#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-local.sh
# Prepara el entorno de desarrollo local:
#   1. Comprueba prerrequisitos (Docker, Supabase CLI)
#   2. Crea los archivos .env a partir de .env.example si no existen
#   3. Solicita la OPENAI_API_KEY si está vacía
#   4. Arranca Supabase local
#   5. Inyecta automáticamente SUPABASE_URL y SUPABASE_SERVICE_KEY en backend/.env
#      (reemplaza 127.0.0.1 → host.docker.internal para que Docker alcance el host)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT/backend/.env"
FRONTEND_ENV="$ROOT/frontend/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }
step()  { echo -e "\n${BOLD}▶ $*${NC}"; }

# ── 1. Prerrequisitos ─────────────────────────────────────────────────────────
step "Comprobando prerrequisitos"

command -v docker   >/dev/null 2>&1 || error "Docker no está instalado. Instálalo desde https://docs.docker.com/engine/install/ubuntu/"
docker info         >/dev/null 2>&1 || error "Docker no está en ejecución. Inicia el servicio con: sudo systemctl start docker"
command -v supabase >/dev/null 2>&1 || error "Supabase CLI no encontrado. Instálalo con: npm install -g supabase"

info "Docker y Supabase CLI disponibles."

# ── 2. Crear archivos .env si no existen ──────────────────────────────────────
step "Configurando archivos .env"

if [ ! -f "$BACKEND_ENV" ]; then
    cp "$ROOT/backend/.env.example" "$BACKEND_ENV"
    info "Creado backend/.env desde backend/.env.example"
else
    info "backend/.env ya existe, no se sobreescribe."
fi

if [ ! -f "$FRONTEND_ENV" ]; then
    cp "$ROOT/frontend/.env.example" "$FRONTEND_ENV"
    info "Creado frontend/.env desde frontend/.env.example"
else
    info "frontend/.env ya existe, no se sobreescribe."
fi

# ── 3. OPENAI_API_KEY ─────────────────────────────────────────────────────────
step "Verificando OPENAI_API_KEY"

CURRENT_KEY=$(grep -E "^OPENAI_API_KEY=" "$BACKEND_ENV" | cut -d'=' -f2- | tr -d '[:space:]')
if [ -z "$CURRENT_KEY" ]; then
    warn "OPENAI_API_KEY está vacía en backend/.env"
    read -rsp "  Ingresa tu OpenAI API key (Enter para saltar): " USER_KEY
    echo ""
    if [ -n "$USER_KEY" ]; then
        sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$USER_KEY|" "$BACKEND_ENV"
        info "OPENAI_API_KEY guardada en backend/.env"
    else
        warn "Sin OPENAI_API_KEY el backend no podrá generar respuestas de IA."
    fi
else
    info "OPENAI_API_KEY ya configurada."
fi

# ── 4. Arrancar Supabase ──────────────────────────────────────────────────────
step "Arrancando Supabase local"
info "Esto puede tardar varios minutos la primera vez (descarga de imágenes Docker)..."

cd "$ROOT"
supabase start

# ── 5. Extraer e inyectar credenciales ───────────────────────────────────────
step "Inyectando credenciales de Supabase en backend/.env"

STATUS=$(supabase status 2>&1)

SUPA_URL=$(echo "$STATUS" | grep -E "^\s*API URL:" | awk '{print $NF}')
SUPA_KEY=$(echo "$STATUS" | grep -E "service_role key:" | awk '{print $NF}')

[ -z "$SUPA_URL" ] && error "No se pudo leer la API URL de 'supabase status'. Comprueba que Supabase arrancó correctamente."
[ -z "$SUPA_KEY" ] && error "No se pudo leer la service_role key de 'supabase status'. Comprueba que Supabase arrancó correctamente."

# El backend corre dentro de Docker: 127.0.0.1 del host = host.docker.internal
SUPA_URL_DOCKER=$(echo "$SUPA_URL" | sed 's/127\.0\.0\.1/host.docker.internal/g')

sed -i "s|^SUPABASE_URL=.*|SUPABASE_URL=$SUPA_URL_DOCKER|" "$BACKEND_ENV"
sed -i "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SUPA_KEY|" "$BACKEND_ENV"

info "SUPABASE_URL       → $SUPA_URL_DOCKER"
info "SUPABASE_SERVICE_KEY → [inyectada]"

# ── 6. Resumen ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✓ Entorno listo.${NC} Lanza la aplicación con:"
echo ""
echo "     docker compose up --build"
echo ""
echo "  Servicios:"
echo "    Frontend:        http://localhost:3000"
echo "    API docs:        http://localhost:8000/docs"
echo "    Supabase Studio: http://localhost:54323"
echo ""
