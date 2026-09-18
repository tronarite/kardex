#!/bin/sh
# Para el servidor dev nativo arrancado por scripts/dev-server.sh
# (nginx + watcher de config.js).
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.dev-runtime"

if [ -f "$RUNTIME_DIR/nginx.pid" ]; then
  nginx -c "$RUNTIME_DIR/nginx.conf" -s stop 2>/dev/null || kill "$(cat "$RUNTIME_DIR/nginx.pid")" 2>/dev/null || true
  rm -f "$RUNTIME_DIR/nginx.pid"
  echo "✓ nginx (dev) parado"
else
  echo "nginx (dev) no estaba corriendo"
fi

if [ -f "$RUNTIME_DIR/watch-meta.pid" ]; then
  kill "$(cat "$RUNTIME_DIR/watch-meta.pid")" 2>/dev/null || true
  rm -f "$RUNTIME_DIR/watch-meta.pid"
  echo "✓ vigilancia de config.js parada"
fi
