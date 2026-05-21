#!/usr/bin/env bash
# Despliegue del frontend (nginx). Corte breve al recrear el contenedor en 80/443.
# En el servidor: /opt/plataforma-ciudadanos/app/plataforma_ciudadanos_frontend
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/plataforma-ciudadanos/app/plataforma_ciudadanos_frontend}"
cd "$APP_DIR"

echo "==> Directorio: $APP_DIR"
echo "==> Construyendo imagen web (el sitio sigue sirviendo hasta el up)..."
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
