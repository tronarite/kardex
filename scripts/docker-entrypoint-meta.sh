#!/bin/sh
# Se ejecuta automáticamente al arrancar el contenedor (nginx:1.27-alpine
# corre todo lo que haya en /docker-entrypoint.d/*.sh antes de arrancar
# nginx — es un mecanismo propio de la imagen oficial, no algo que
# montamos nosotros a mano).
#
# 1. Sincroniza una vez las etiquetas estáticas de SEO/redes desde
#    config.js (ver scripts/sync-meta.js).
# 2. Se queda vigilando ese archivo en segundo plano — si lo editas y
#    guardas mientras el contenedor sigue arriba, se vuelve a sincronizar
#    solo, sin reiniciar nada. Así "editar config.js y recargar el
#    navegador" sigue siendo instantáneo también para esas etiquetas, no
#    solo para lo que ya actualizaba script.js en el propio navegador.
set -e

WEBROOT="/usr/share/nginx/html"
export KARDEX_PUBLIC_DIR="$WEBROOT"

sync_once() {
  if [ -f "$WEBROOT/config.js" ]; then
    node /app/scripts/sync-meta.js || echo "[sync-meta] aviso: fallo al sincronizar, se sigue sirviendo el HTML tal cual"
  else
    echo "[sync-meta] no hay config.js en public/ todavía (copia config.example.js), se omite"
  fi
}

sync_once

# Vigilancia en segundo plano — & al final del subshell para no bloquear
# el arranque de nginx, que es lo siguiente que corre este directorio de
# entrypoints.
(
  while inotifywait -qq -e close_write,move,create,delete "$WEBROOT" --include 'config\.js$' 2>/dev/null; do
    sync_once
  done
) &
