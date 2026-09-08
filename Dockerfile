FROM nginx:1.27-alpine

# nodejs: ejecuta scripts/sync-meta.js (lee config.js y rellena las
# etiquetas de SEO/redes + genera og-image.png). inotify-tools: vigila
# config.js para volver a sincronizar solo, sin reiniciar el contenedor.
# librsvg (rsvg-convert): rasteriza el SVG de og-image a PNG. ttf-dejavu +
# fontconfig: sin fuentes instaladas, rsvg-convert no tiene con qué
# dibujar el texto (Alpine no trae ninguna por defecto) — DejaVu cubre
# bien acentos/ñ y tiene variante serif + monoespaciada.
RUN apk add --no-cache nodejs inotify-tools librsvg ttf-dejavu fontconfig && \
    fc-cache -f

# Set non-root permissions & copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web assets
COPY public/ /usr/share/nginx/html/

# Script de sincronización (ver el propio archivo) + el hook que lo lanza
# solo al arrancar. /docker-entrypoint.d/*.sh es un mecanismo de la imagen
# oficial de nginx: ejecuta todo lo de ahí antes de arrancar nginx.
COPY scripts/sync-meta.js /app/scripts/sync-meta.js
COPY scripts/docker-entrypoint-meta.sh /docker-entrypoint.d/40-sync-meta.sh
# Quita cualquier \r que se haya colado (típico al clonar/editar en
# Windows sin el .gitattributes del repo activo): un CRLF en el shebang
# ("#!/bin/sh\r") hace que el contenedor no arranque ("not found", bucle
# de reinicio) — visto en producción, no es hipotético.
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-sync-meta.sh && \
    chmod +x /docker-entrypoint.d/40-sync-meta.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
