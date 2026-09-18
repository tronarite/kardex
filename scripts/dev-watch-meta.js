#!/usr/bin/env node
/**
 * Equivalente nativo (sin Docker) de scripts/docker-entrypoint-meta.sh:
 * sincroniza public/config.js -> etiquetas SEO/redes una vez al arrancar
 * y se queda vigilando el archivo para volver a sincronizar solo cuando
 * lo guardas, sin reiniciar nada. inotifywait (Linux) no existe en
 * macOS, así que aquí se usa fs.watch de Node en su lugar — mismo
 * comportamiento observable, sin depender de fswatch ni otra
 * herramienta externa.
 *
 * Lo arranca scripts/dev-server.sh; no hace falta ejecutarlo a mano.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PUBLIC_DIR = process.env.KARDEX_PUBLIC_DIR || path.join(__dirname, "..", "public");
const CONFIG_PATH = path.join(PUBLIC_DIR, "config.js");
const SYNC_SCRIPT = path.join(__dirname, "sync-meta.js");

function syncOnce() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log("[dev-watch-meta] no hay config.js en public/ todavía (copia config.example.js), se omite");
    return;
  }
  const result = spawnSync(process.execPath, [SYNC_SCRIPT], { stdio: "inherit" });
  if (result.status !== 0) {
    console.warn("[dev-watch-meta] aviso: fallo al sincronizar, se sigue sirviendo el HTML tal cual");
  }
}

syncOnce();

// Debounce: un solo guardado del editor puede disparar varios eventos
// fs.watch seguidos (rename + change) — sin esto se re-sincronizaría
// más de una vez por guardado.
let pending = null;
fs.watch(PUBLIC_DIR, (_eventType, filename) => {
  if (filename !== "config.js") return;
  clearTimeout(pending);
  pending = setTimeout(syncOnce, 150);
});

console.log(`[dev-watch-meta] vigilando ${CONFIG_PATH} (Ctrl+C o dev-server-stop.sh para parar)`);
