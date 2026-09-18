#!/bin/sh
# Levanta Kardex en local SIN Docker: nginx nativo (Homebrew) sirviendo
# public/ con la MISMA nginx.conf que usa producción/Docker (fuente
# única de verdad — solo se sustituyen "root" y "listen" al generar el
# server block, ver más abajo) + el watcher de config.js
# (dev-watch-meta.js) que reemplaza al inotifywait del contenedor.
#
# Uso:
#   scripts/dev-server.sh              # arranca en :8090 (igual que Docker)
#   KARDEX_DEV_PORT=3000 scripts/dev-server.sh   # otro puerto
# Parar:
#   scripts/dev-server-stop.sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_DIR="$ROOT_DIR/public"
RUNTIME_DIR="$ROOT_DIR/.dev-runtime"
PORT="${KARDEX_DEV_PORT:-8090}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "✗ nginx no está instalado. Instálalo con: brew install nginx" >&2
  exit 1
fi

if [ ! -f "$PUBLIC_DIR/config.js" ]; then
  echo "✗ No existe public/config.js — cópialo primero:" >&2
  echo "    cp public/config.example.js public/config.js" >&2
  exit 1
fi

mkdir -p "$RUNTIME_DIR"

if [ -f "$RUNTIME_DIR/nginx.pid" ] && kill -0 "$(cat "$RUNTIME_DIR/nginx.pid")" 2>/dev/null; then
  echo "El servidor dev ya está corriendo en http://localhost:$PORT"
  exit 0
fi

# Server block derivado de nginx.conf: mismas cabeceras de seguridad,
# CSP, cache y rutas (/servicios, /qr, 404) que se usarán en producción
# — solo cambian root (carpeta local en vez de la ruta dentro del
# contenedor) y listen (puerto sin privilegios, no el 80).
sed \
  -e "s#root /usr/share/nginx/html;#root $PUBLIC_DIR;#" \
  -e "s#listen 80;#listen $PORT;#" \
  "$ROOT_DIR/nginx.conf" > "$RUNTIME_DIR/server.conf"

MIME_TYPES="$(brew --prefix nginx 2>/dev/null)/etc/nginx/mime.types"
[ -f "$MIME_TYPES" ] || MIME_TYPES="/opt/homebrew/etc/nginx/mime.types"

cat > "$RUNTIME_DIR/nginx.conf" <<EOF
worker_processes 1;
error_log $RUNTIME_DIR/error.log;
pid $RUNTIME_DIR/nginx.pid;
events { worker_connections 1024; }
http {
    include $MIME_TYPES;
    default_type application/octet-stream;
    sendfile on;
    access_log $RUNTIME_DIR/access.log;
    gzip on;
    include $RUNTIME_DIR/server.conf;
}
EOF

nginx -c "$RUNTIME_DIR/nginx.conf"

nohup node "$ROOT_DIR/scripts/dev-watch-meta.js" > "$RUNTIME_DIR/watch-meta.log" 2>&1 &
echo $! > "$RUNTIME_DIR/watch-meta.pid"

echo "✓ Kardex dev (sin Docker) arrancado en http://localhost:$PORT"
echo "  Logs: $RUNTIME_DIR/error.log · $RUNTIME_DIR/watch-meta.log"
echo "  Para pararlo: scripts/dev-server-stop.sh"
