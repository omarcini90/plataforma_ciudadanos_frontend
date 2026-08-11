#!/usr/bin/env bash
# Libera RAM / page cache / swap y limpia residuos de Docker para que
# `deploy.sh` (build de Vite en Docker) no se cuelgue por falta de memoria.
#
# Uso (en el servidor Linux):
#   ./free-memory.sh
#   sudo ./free-memory.sh          # recomendado (drop_caches / swap)
#   FREE_MEMORY_AGGRESSIVE=1 ./free-memory.sh
#
# Se invoca automáticamente al inicio de deploy.sh.
set -euo pipefail

AGGRESSIVE="${FREE_MEMORY_AGGRESSIVE:-0}"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif have_cmd sudo; then
    sudo "$@"
  else
    return 1
  fi
}

mem_snapshot() {
  if [[ -r /proc/meminfo ]]; then
    awk '
      /^MemAvailable:/ { avail=$2 }
      /^MemTotal:/     { total=$2 }
      /^SwapTotal:/    { swapt=$2 }
      /^SwapFree:/     { swapf=$2 }
      END {
        printf "  RAM disponible: %.1f / %.1f GiB\n", avail/1024/1024, total/1024/1024
        if (swapt > 0)
          printf "  Swap libre:     %.1f / %.1f GiB\n", swapf/1024/1024, swapt/1024/1024
        else
          print "  Swap:           no configurado"
      }
    ' /proc/meminfo
  elif have_cmd free; then
    free -h | sed 's/^/  /'
  else
    echo "  (sin /proc/meminfo ni free; omite resumen)"
  fi
}

echo "==> Memoria antes:"
mem_snapshot

# Vaciar page cache / dentries / inodes (Linux). No mata procesos.
if [[ "$(uname -s)" == "Linux" ]]; then
  echo "==> Sincronizando discos (sync)..."
  sync || true

  echo "==> Liberando page cache del kernel..."
  if run_root sh -c 'echo 3 > /proc/sys/vm/drop_caches'; then
    echo "  OK: drop_caches=3"
  else
    echo "  AVISO: no se pudo escribir /proc/sys/vm/drop_caches (ejecuta con sudo)."
  fi

  # Reciclar swap: mueve páginas usadas de swap a RAM si hay espacio, o las descarta al desactivar.
  if [[ -r /proc/swaps ]] && awk 'NR>1 { found=1 } END { exit !found }' /proc/swaps; then
    echo "==> Reciclando swap (swapoff/swapon)..."
    if run_root swapoff -a && run_root swapon -a; then
      echo "  OK: swap reiniciado"
    else
      echo "  AVISO: no se pudo reiniciar swap (poca RAM o sin privilegios). Continuando..."
    fi
  else
    echo "==> Sin particiones/archivos de swap activos; se omite reciclado."
    # En VPS ~2 GiB el build de Vite suele colgarse sin swap. Crear uno temporal.
    SWAP_FILE="${SWAP_FILE:-/swapfile-plataforma}"
    SWAP_SIZE_MB="${SWAP_SIZE_MB:-2048}"
    echo "==> Creando swap temporal (${SWAP_SIZE_MB} MiB) en ${SWAP_FILE}..."
    if [[ -f "$SWAP_FILE" ]]; then
      if run_root swapon "$SWAP_FILE" 2>/dev/null; then
        echo "  OK: swap reactivado ($SWAP_FILE)"
      else
        echo "  AVISO: existe $SWAP_FILE pero no se pudo activar."
      fi
    elif run_root dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB" status=none \
      && run_root chmod 600 "$SWAP_FILE" \
      && run_root mkswap "$SWAP_FILE" >/dev/null \
      && run_root swapon "$SWAP_FILE"; then
      echo "  OK: swap temporal activo ($SWAP_FILE)"
    else
      echo "  AVISO: no se pudo crear swap; el build puede colgarse por OOM."
    fi
  fi
else
  echo "==> Host no-Linux ($(uname -s)): se omite drop_caches/swap."
fi

# Docker: el build de Vite suele dejar capas e imágenes huérfanas que llenan disco/RAM.
if have_cmd docker; then
  echo "==> Limpiando residuos de Docker (build cache / dangling)..."
  docker builder prune -f >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true

  if [[ "$AGGRESSIVE" == "1" ]]; then
    echo "==> Modo agresivo: prune de sistema Docker (sin volúmenes)..."
    docker system prune -f >/dev/null 2>&1 || true
  fi
else
  echo "==> Docker no está en PATH; se omite prune."
fi

# Empujar al kernel a reclamar memoria inactiva cuanto antes.
if [[ "$(uname -s)" == "Linux" ]] && [[ -w /proc/sys/vm/swappiness || "$(id -u)" -eq 0 ]] || have_cmd sudo; then
  # No cambia swappiness de forma permanente; solo fuerza un reclaim suave vía sync ya hecho.
  :
fi

echo "==> Memoria después:"
mem_snapshot
echo "==> Listo."
