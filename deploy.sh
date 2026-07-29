#!/usr/bin/env bash
# Despliegue del frontend (nginx). Corte breve al recrear el contenedor en 80/443.
# En el servidor: /opt/plataforma-ciudadanos/app/plataforma_ciudadanos_frontend
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/plataforma-ciudadanos/app/plataforma_ciudadanos_frontend}"
cd "$APP_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Directorio: $APP_DIR"

if [[ -x "$SCRIPT_DIR/free-memory.sh" ]]; then
  echo "==> Liberando memoria / swap antes del build..."
  # Preferir sudo si hace falta para drop_caches; si falla, el script sigue con avisos.
  if [[ "$(id -u)" -eq 0 ]]; then
    "$SCRIPT_DIR/free-memory.sh"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$SCRIPT_DIR/free-memory.sh" || "$SCRIPT_DIR/free-memory.sh"
  else
    "$SCRIPT_DIR/free-memory.sh"
  fi
else
  echo "AVISO: no se encontró free-memory.sh; el build puede colgarse por falta de RAM."
fi

echo "==> Construyendo imagen web (el sitio sigue sirviendo hasta el up)..."
# Limitar paralelismo del builder para VPS con poca RAM (evita OOM al compilar Vite).
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
docker compose build web

echo "==> Recreando contenedor web..."
docker compose up -d web

echo "==> Esperando healthcheck del frontend (máx. 60 s)..."
deadline=$((SECONDS + 60))
until docker compose ps web 2>/dev/null | grep -qE '\(healthy\)|healthy'; do
  if (( SECONDS >= deadline )); then
    echo "ADVERTENCIA: healthcheck no reportó healthy; revisa: docker compose logs web --tail 40"
    docker compose ps web
    exit 0
  fi
  sleep 2
done

docker compose ps web
echo "==> Frontend desplegado."
