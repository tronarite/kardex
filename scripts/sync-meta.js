#!/usr/bin/env node
/**
 * Sincroniza las etiquetas "estáticas" de SEO/redes con los datos de
 * config.js: <title>, meta description, og:title/og:description/og:url,
 * twitter:title/twitter:description, <link rel="canonical"> en
 * index.html, más robots.txt, sitemap.xml y ld.json.
 *
 * Por qué existe: bots como los de Discord, Twitter/X, WhatsApp o
 * Slack — y en parte también Google — leen estas etiquetas directamente
 * del HTML servido, sin ejecutar JavaScript. Si se rellenaran solo desde
 * el navegador (como el <h1> con tu nombre, que sí lo hace script.js), la
 * previsualización al compartir el enlace saldría en blanco o genérica.
 * Este script es el punto intermedio: no hace falta editar esos archivos
 * a mano, pero tampoco hace falta un build step en Docker — nginx sigue
 * sirviendo los archivos de public/ tal cual, este script solo los deja
 * ya escritos antes de que los sirvas.
 *
 * Con Docker esto es automático: el contenedor lo ejecuta solo al
 * arrancar y cada vez que guardas config.js (ver
 * scripts/docker-entrypoint-meta.sh) — no hace falta ejecutar nada a
 * mano. Este archivo también se puede correr suelto para probarlo o si
 * sirves el sitio sin Docker:
 *
 *   node scripts/sync-meta.js
 *
 * Nota: index.html, robots.txt, sitemap.xml y ld.json SÍ están en git (a
 * diferencia de config.js). Publicar con tus datos reales los deja
 * "sucios" en tu copia local — trátalos igual que config.js:
 *
 *   git update-index --skip-worktree public/index.html public/ld.json \
 *     public/robots.txt public/sitemap.xml
 *
 * (revierte con --no-skip-worktree si alguna vez necesitas tocar de
 * verdad la plantilla, no solo tus datos).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// KARDEX_PUBLIC_DIR lo fija el contenedor Docker (sirve desde
// /usr/share/nginx/html, no desde public/ del repo) — en local, sin la
// variable, apunta al public/ de este mismo proyecto.
const PUBLIC_DIR = process.env.KARDEX_PUBLIC_DIR || path.join(__dirname, "..", "public");
const CONFIG_PATH = path.join(PUBLIC_DIR, "config.js");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error("✗ No se encuentra public/config.js — cópialo primero desde la plantilla:");
  console.error("    cp public/config.example.js public/config.js");
  process.exit(1);
}

// config.js es un <script> plano (const SITE_CONFIG = {...}; const UNITS = [...];),
// sin module.exports — se ejecuta en un sandbox para leer sus variables
// sin tener que parsear el objeto a mano. Ojo: un "const" de nivel
// superior NO cuelga del objeto global aunque se ejecute con
// runInContext (es una particularidad del propio motor de JS, no un bug
// de Node) — por eso se añade esa línea final para engancharlo a mano.
const configSource = fs.readFileSync(CONFIG_PATH, "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${configSource}\nthis.SITE_CONFIG = SITE_CONFIG;`, sandbox, { filename: "config.js" });

const config = sandbox.SITE_CONFIG;
if (!config) {
  console.error("✗ config.js no define SITE_CONFIG — revisa el archivo.");
  process.exit(1);
}

const siteUrl = (config.siteUrl || "https://tu-dominio.example/").replace(/\/?$/, "/");
const title = config.pageTitle || `${config.operatorName} — Índice`;
// "//" separa visualmente el rol en dos partes en pantalla; en texto plano
// (meta tags) queda mejor como un separador normal.
const roleFlat = (config.operatorRole || "").replace(/\s*\/\/\s*/g, " · ").trim();
const description = config.operatorName
  ? `Índice personal de proyectos y enlaces de ${config.operatorName}.${roleFlat ? ` ${roleFlat}.` : ""}`
  : "Índice personal de proyectos y enlaces, con estética editorial minimalista y modo claro/oscuro adaptativo.";

let warnings = 0;
const replaceOne = (content, pattern, replacement, label, file) => {
  if (!pattern.test(content)) {
    console.warn(`  ! [${file}] no se encontró el patrón para "${label}" — no se tocó`);
    warnings++;
    return content;
  }
  return content.replace(pattern, replacement);
};

const sleepSync = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/**
 * Escribe vía archivo temporal + rename (en vez de sobrescribir en sitio)
 * y reintenta unas cuantas veces con espera creciente. Visto en producción
 * (Windows + Docker Desktop, backend WSL2): justo tras un "git pull", el
 * antivirus o el propio git pueden tener el archivo bloqueado un instante
 * ("EACCES: permission denied") — no es hipotético, tumbó la sincronización
 * real de un despliegue. El rename es más resistente a ese tipo de bloqueo
 * puntual que escribir directamente encima del archivo abierto.
 */
const writeFileAtomic = (targetPath, content, attempts = 5) => {
  const tmpPath = `${targetPath}.tmp-${process.pid}`;
  for (let i = 1; i <= attempts; i++) {
    try {
      fs.writeFileSync(tmpPath, content);
      fs.renameSync(tmpPath, targetPath);
      return;
    } catch (err) {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* no existía, da igual */ }
      if (i === attempts) throw err;
      sleepSync(200 * i);
    }
  }
};

// ---- index.html ----
const indexPath = path.join(PUBLIC_DIR, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

html = replaceOne(html, /<title>.*?<\/title>/, `<title>${title}</title>`, "title", "index.html");
html = replaceOne(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`, "meta description", "index.html");
html = replaceOne(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`, "og:title", "index.html");
html = replaceOne(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${roleFlat || description}">`, "og:description", "index.html");
html = replaceOne(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${siteUrl}">`, "og:url", "index.html");
html = replaceOne(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`, "twitter:title", "index.html");
html = replaceOne(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${roleFlat || description}">`, "twitter:description", "index.html");
html = replaceOne(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${siteUrl}">`, "canonical", "index.html");

writeFileAtomic(indexPath, html);
console.log("✓ index.html");

// ---- ld.json ----
const ldPath = path.join(PUBLIC_DIR, "ld.json");
const ld = JSON.parse(fs.readFileSync(ldPath, "utf8"));
ld.name = config.operatorName || ld.name;
ld.description = roleFlat || ld.description;
ld.url = siteUrl;
writeFileAtomic(ldPath, `${JSON.stringify(ld, null, 2)}\n`);
console.log("✓ ld.json");

// ---- robots.txt ----
const robotsPath = path.join(PUBLIC_DIR, "robots.txt");
let robots = fs.readFileSync(robotsPath, "utf8");
robots = replaceOne(robots, /Sitemap: .*/, `Sitemap: ${siteUrl}sitemap.xml`, "Sitemap", "robots.txt");
writeFileAtomic(robotsPath, robots);
console.log("✓ robots.txt");

// ---- sitemap.xml ----
const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = replaceOne(sitemap, /<loc>[^<]*<\/loc>/, `<loc>${siteUrl}</loc>`, "loc", "sitemap.xml");
writeFileAtomic(sitemapPath, sitemap);
console.log("✓ sitemap.xml");

console.log(`\nListo — dominio usado: ${siteUrl}`);
if (warnings > 0) {
  console.log(`${warnings} aviso(s) arriba: revisa esos archivos, puede que su formato haya cambiado.`);
}
console.log("Revisa el resultado con `git diff` antes de desplegar o commitear.");
