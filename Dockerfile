FROM nginx:1.27-alpine

# nodejs: ejecuta scripts/sync-meta.js (lee config.js y rellena solo las
# etiquetas de SEO/redes). inotify-tools: vigila config.js para volver a
# sincronizar automáticamente cuando lo edites, sin reiniciar el contenedor.
RUN apk add --no-cache nodejs inotify-tools

# Set non-root permissions & copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web assets
COPY public/ /usr/share/nginx/html/

# Script de sincronización (ver el propio archivo) + el hook que lo lanza
# solo al arrancar. /docker-entrypoint.d/*.sh es un mecanismo de la imagen
# oficial de nginx: ejecuta todo lo de ahí antes de arrancar nginx.
COPY scripts/sync-meta.js /app/scripts/sync-meta.js
COPY scripts/docker-entrypoint-meta.sh /docker-entrypoint.d/40-sync-meta.sh
RUN chmod +x /docker-entrypoint.d/40-sync-meta.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
