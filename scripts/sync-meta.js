#!/usr/bin/env node
/**
 * Sincroniza las etiquetas "estáticas" de SEO/redes con los datos de
 * config.js: <title>, meta description/author, og:*, twitter:*,
 * <link rel="canonical">, el "?v=" de cache-busting del favicon
 * (SITE_CONFIG.faviconVersion) y el bloque <script type="application/ld+json">
 * (inline) en index.html, más robots.txt y sitemap.xml.
 *
 * Genera además de cero (no solo texto) og-image.png, la imagen de
 * previsualización al compartir el enlace (Discord, WhatsApp, Twitter/X...).
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
 * Nota: index.html, robots.txt, sitemap.xml y og-image.png SÍ están en git
 * (a diferencia de config.js). Publicar con tus datos reales los deja
 * "sucios" en tu copia local — trátalos igual que config.js:
 *
 *   git update-index --skip-worktree public/index.html \
 *     public/robots.txt public/sitemap.xml public/og-image.png
 *
 * (revierte con --no-skip-worktree si alguna vez necesitas tocar de
 * verdad la plantilla, no solo tus datos).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const os = require("os");
const { execFileSync } = require("child_process");

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
// de Node) — por eso se añaden esas líneas finales para engancharlo a mano.
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

// Cache-busting del favicon (SITE_CONFIG.faviconVersion). Se pone/actualiza
// "?v=N" solo en el <link ... href="favicon.svg..."> del HTML; si no hay
// versión, se deja "favicon.svg" a secas. Vive en config.js justamente
// para que sobreviva a "git pull" sin reeditar el HTML a mano.
const faviconVersion = config.faviconVersion;
const applyFaviconVersion = (content) =>
  content.replace(
    /href="favicon\.svg(?:\?v=[^"]*)?"/g,
    () => (faviconVersion ? `href="favicon.svg?v=${faviconVersion}"` : `href="favicon.svg"`)
  );

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

// ---- og-image.png: paleta por tema (mismo criterio que style.css) ----
// Solo los tonos "claros" de cada theme-pack — og-image se ve siempre
// sobre fondo claro en la previsualización de cualquier app, no cambia
// con el modo oscuro del visitante.
const THEME_PALETTES = {
  terracota: { bg: "#F5F3EC", text: "#17140F", accent: "#A6321C" },
  vino: { bg: "#F7F0F1", text: "#1C1013", accent: "#7A2436" },
  mostaza: { bg: "#F7F3E9", text: "#1C1810", accent: "#8A6A16" },
  azul: { bg: "#E6EBF7", text: "#0E1729", accent: "#1668E6" },
  petroleo: { bg: "#EEF3F1", text: "#0F211D", accent: "#0F5C56" },
  monocromo: { bg: "#FFFFFF", text: "#111111", accent: "#3A3A3A" },
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
// Mismo criterio que --text-dim/--text-muted en style.css
// (color-mix(text, bg)), reimplementado a mano: este script no tiene
// motor CSS a mano para usar color-mix() de verdad.
const mixHex = (hexA, hexB, pctA) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(a.map((v, i) => v * pctA + b[i] * (1 - pctA)));
};

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

// Reduce el tamaño de letra si el texto es tan largo que se saldría del
// lienzo (1200×630) — nombres/roles cortos como los de la plantilla se
// quedan en el tamaño grande de siempre; uno mucho más largo se ajusta
// solo en vez de desbordar.
const fitFontSize = (text, maxWidth, startSize, minSize, avgCharWidthEm) => {
  let size = startSize;
  while (size > minSize && text.length * size * avgCharWidthEm > maxWidth) {
    size -= 2;
  }
  return size;
};

const buildOgImageSvg = (cfg, palette) => {
  const name = cfg.operatorName || "Kardex";
  const roleParts = (cfg.operatorRole || "").split("//").map((s) => s.trim()).filter(Boolean);
  const textDim = mixHex(palette.text, palette.bg, 0.6);
  const textMuted = mixHex(palette.text, palette.bg, 0.38);
  const fold = mixHex(palette.text, palette.bg, 0.25);

  const maxTextWidth = 1200 - 118 * 2;
  const nameSize = fitFontSize(name, maxTextWidth, 64, 34, 0.52);
  const roleSize = fitFontSize(roleParts.join(" // "), maxTextWidth, 26, 16, 0.6);

  const roleSpans = roleParts
    .map((part, i) => {
      const sep = i < roleParts.length - 1 ? `<tspan fill="${palette.accent}" font-weight="700"> // </tspan>` : "";
      return `<tspan>${escapeXml(part)}</tspan>${sep}`;
    })
    .join("");

  const monoStack = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";
  const serifStack = "Georgia, 'DejaVu Serif', 'Times New Roman', serif";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${palette.bg}"/>
  <g transform="translate(118,204) scale(2.1875)">
    <rect width="64" height="64" fill="${palette.text}"/>
    <rect x="6" y="6" width="52" height="52" fill="#FFFFFF"/>
    <path d="M42 6 L58 6 L58 22 Z" fill="${palette.text}"/>
    <path d="M42 6 L58 22 L42 22 Z" fill="${fold}"/>
    <line x1="16" y1="28" x2="40" y2="28" stroke="${palette.text}" stroke-width="3" stroke-linecap="square"/>
    <line x1="16" y1="37" x2="48" y2="37" stroke="${palette.text}" stroke-width="3" stroke-linecap="square"/>
    <line x1="16" y1="46" x2="32" y2="46" stroke="${palette.text}" stroke-width="3" stroke-linecap="square"/>
  </g>
  <text x="118" y="415" font-family="${monoStack}" font-size="24" font-weight="700" letter-spacing="4" fill="${textMuted}">ÍNDICE PERSONAL</text>
  <text x="118" y="500" font-family="${serifStack}" font-size="${nameSize}" fill="${palette.text}">${escapeXml(name)}</text>
  <text x="118" y="600" font-family="${monoStack}" font-size="${roleSize}" fill="${textDim}" xml:space="preserve">${roleSpans}</text>
</svg>`;
};

/**
 * Rasteriza el SVG a PNG probando, en orden, las herramientas que puede
 * haber disponibles: rsvg-convert (Linux/Docker, instalado vía apk en el
 * Dockerfile) y sips (macOS, para poder probar el script en local sin
 * instalar nada nuevo). Si no encuentra ninguna, no revienta el resto de
 * la sincronización — solo avisa y deja el og-image.png que ya hubiera.
 */
const rasterizeSvg = (svgContent, outPath) => {
  const tmpSvg = path.join(os.tmpdir(), `kardex-og-${process.pid}.svg`);
  const tmpOut = path.join(os.tmpdir(), `kardex-og-${process.pid}.png`);
  fs.writeFileSync(tmpSvg, svgContent);

  const attempts = [
    () => execFileSync("rsvg-convert", ["-w", "1200", "-h", "630", "-o", tmpOut, tmpSvg], { stdio: "ignore" }),
    () => execFileSync("sips", ["-s", "format", "png", tmpSvg, "--out", tmpOut], { stdio: "ignore" }),
  ];

  let ok = false;
  for (const attempt of attempts) {
    try {
      attempt();
      ok = fs.existsSync(tmpOut);
      if (ok) break;
    } catch (_) {
      /* prueba la siguiente herramienta */
    }
  }

  try { fs.unlinkSync(tmpSvg); } catch (_) { /* da igual */ }
  if (!ok) return false;

  writeFileAtomic(outPath, fs.readFileSync(tmpOut));
  try { fs.unlinkSync(tmpOut); } catch (_) { /* da igual */ }
  return true;
};

// ---- HTML: título + meta tags de SEO/redes ----
// applyMeta() es pura (devuelve el HTML modificado, no escribe).
const applyMeta = (content, fileLabel, tags) => {
  const set = (pattern, replacement, label) => {
    content = replaceOne(content, pattern, replacement, label, fileLabel);
  };
  set(/<title>.*?<\/title>/, `<title>${tags.title}</title>`, "title");
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${tags.description}">`, "meta description");
  set(/<meta name="author" content="[^"]*">/, `<meta name="author" content="${config.operatorName || ""}">`, "author");
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${tags.title}">`, "og:title");
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${tags.ogDescription}">`, "og:description");
  set(/<meta property="og:site_name" content="[^"]*">/, `<meta property="og:site_name" content="${config.operatorName || ""}">`, "og:site_name");
  set(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${tags.image}">`, "og:image");
  set(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${tags.imageAlt}">`, "og:image:alt");
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${tags.url}">`, "og:url");
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${tags.title}">`, "twitter:title");
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${tags.ogDescription}">`, "twitter:description");
  set(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${tags.image}">`, "twitter:image");
  set(/<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${tags.imageAlt}">`, "twitter:image:alt");
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${tags.url}">`, "canonical");

  content = applyFaviconVersion(content);

  // Datos estructurados: bloque <script type="application/ld+json"> INLINE
  // (Google ignora el atributo src en este tipo de script). Se reemplaza
  // con función para no interpretar "$..." del JSON como grupos de captura.
  if (tags.jsonLd) {
    const ldPattern = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
    if (ldPattern.test(content)) {
      const json = JSON.stringify(tags.jsonLd, null, 2)
        .replace(/</g, "\\u003c") // que un "</script>" en un valor no cierre el bloque
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      content = content.replace(ldPattern, () => `<script type="application/ld+json">\n${json}\n  </script>`);
    } else {
      console.warn(`  ! [${fileLabel}] no se encontró el <script type="application/ld+json"> — no se tocó`);
      warnings++;
    }
  }
  return content;
};

// ---- index.html ----
const indexPath = path.join(PUBLIC_DIR, "index.html");
const indexJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: config.operatorName || "Kardex",
  description: roleFlat || description,
  url: siteUrl,
  inLanguage: "es",
};
const indexHtmlSynced = applyMeta(fs.readFileSync(indexPath, "utf8"), "index.html", {
  title,
  description,
  ogDescription: roleFlat || description,
  image: `${siteUrl}og-image.png`,
  imageAlt: config.operatorName ? `Índice personal de ${config.operatorName}` : "Índice personal",
  url: siteUrl,
  jsonLd: indexJsonLd,
});
writeFileAtomic(indexPath, indexHtmlSynced);
console.log("✓ index.html");

// ---- 404.html: solo la versión del favicon ----
// (no lleva meta de SEO/redes propias; lo único que sincroniza es el
// "?v=" del favicon, para que no se quede desfasado del resto).
const notFoundPath = path.join(PUBLIC_DIR, "404.html");
if (fs.existsSync(notFoundPath)) {
  const before = fs.readFileSync(notFoundPath, "utf8");
  const after = applyFaviconVersion(before);
  if (after !== before) {
    writeFileAtomic(notFoundPath, after);
    console.log("✓ 404.html (favicon)");
  }
}

// (El JSON-LD ya no es un archivo aparte: va inline en index.html, ver
// applyMeta arriba — Google ignora el src en un
// <script type="application/ld+json">.)

// ---- robots.txt ----
const robotsPath = path.join(PUBLIC_DIR, "robots.txt");
let robots = fs.readFileSync(robotsPath, "utf8");
robots = replaceOne(robots, /Sitemap: .*/, `Sitemap: ${siteUrl}sitemap.xml`, "Sitemap", "robots.txt");
writeFileAtomic(robotsPath, robots);
console.log("✓ robots.txt");

// ---- sitemap.xml ----
const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = replaceOne(sitemap, /<loc>https?:\/\/[^<]*?\/<\/loc>/, `<loc>${siteUrl}</loc>`, "loc raíz", "sitemap.xml");
writeFileAtomic(sitemapPath, sitemap);
console.log("✓ sitemap.xml");

// ---- og-image.png ----
const ogImagePath = path.join(PUBLIC_DIR, "og-image.png");
const palette = THEME_PALETTES[config.theme] || THEME_PALETTES.terracota;
if (rasterizeSvg(buildOgImageSvg(config, palette), ogImagePath)) {
  console.log("✓ og-image.png");
} else {
  console.warn("  ! og-image.png: no se encontró rsvg-convert ni sips — no se ha regenerado, se sigue sirviendo la que ya había");
  warnings++;
}


console.log(`\nListo — dominio usado: ${siteUrl}`);
if (warnings > 0) {
  console.log(`${warnings} aviso(s) arriba: revisa esos archivos, puede que su formato haya cambiado.`);
}
console.log("Revisa el resultado con `git diff` antes de desplegar o commitear.");
