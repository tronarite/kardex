#!/usr/bin/env node
/**
 * Sincroniza las etiquetas "estáticas" de SEO/redes con los datos de
 * config.js: <title>, meta description/author, og:*, twitter:*,
 * <link rel="canonical">, el "?v=" de cache-busting del favicon
 * (SITE_CONFIG.faviconVersion) y el bloque <script type="application/ld+json">
 * (inline) en index.html, más robots.txt y sitemap.xml.
 *
 * Qué partes se generan depende de SITE_CONFIG.sections (portfolio/services,
 * ver config.example.js):
 *   - Con las dos activas: index.html es el índice de proyectos y además se
 *     genera servicios.html para la ruta /servicios (con su propia imagen
 *     og-servicios-image.png), dos <loc> en sitemap.xml.
 *   - Con solo "services": index.html se sincroniza directamente con las
 *     etiquetas de servicios (es la portada) — no hay servicios.html
 *     aparte, un solo <loc> en sitemap.xml.
 *   - Con solo "portfolio" (o sin "sections"): comportamiento de siempre,
 *     sin nada de servicios.
 *
 * Genera además de cero (no solo texto) og-image.png, la imagen de
 * previsualización al compartir el enlace (Discord, WhatsApp, Twitter/X...)
 * — con el contenido de servicios en vez de identidad si index.html es la
 * portada de servicios. servicios.html, cuando existe, se construye ENTERA
 * a partir de index.html ya sincronizado — mismo <body>, solo cambian el
 * <head> (meta propios) y el <noscript> — así su estructura nunca se
 * desincroniza.
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
 * Nota: index.html, servicios.html (si existe), robots.txt, sitemap.xml
 * y og-image.png SÍ están en git (a diferencia de config.js). Publicar con
 * tus datos reales los deja "sucios" en tu copia local — trátalos igual
 * que config.js:
 *
 *   git update-index --skip-worktree public/index.html public/servicios.html \
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
vm.runInContext(
  `${configSource}
   this.SITE_CONFIG = SITE_CONFIG;
   this.SERVICES = typeof SERVICES !== "undefined" ? SERVICES : [];`,
  sandbox,
  { filename: "config.js" }
);

const config = sandbox.SITE_CONFIG;
if (!config) {
  console.error("✗ config.js no define SITE_CONFIG — revisa el archivo.");
  process.exit(1);
}
const services = Array.isArray(sandbox.SERVICES) ? sandbox.SERVICES : [];

// Qué partes del sitio están activas — mismo criterio de defecto que
// resolveSections() en script.js: sin "sections", o con las dos en false,
// se cae al índice de proyectos solo.
const rawSections = config.sections || {};
const sectionsPortfolio = rawSections.portfolio !== false;
const sectionsServices = rawSections.services === true;
const SECTIONS =
  !sectionsPortfolio && !sectionsServices
    ? { portfolio: true, services: false }
    : { portfolio: sectionsPortfolio, services: sectionsServices };

// Con las dos secciones activas, /servicios es una ruta real y distinta de
// "/" (genera servicios.html aparte). Con solo "services", index.html ES
// la vista de servicios — no hace falta un archivo aparte.
const hasServicesRoute = SECTIONS.portfolio && SECTIONS.services;
const indexIsServices = SECTIONS.services && !SECTIONS.portfolio;

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

// ---- og-image.png para la vista de servicios: los "puntos a favor" de
// SITE_CONFIG.servicesHighlights, como imagen de previsualización al
// compartir el enlace. ----

// Mismo set de iconos que SERVICE_HIGHLIGHT_ICONS en script.js — un nombre
// corto en vez de un SVG libre en config.js. Un valor desconocido cae en
// "check" en vez de romper la imagen.
const SERVICE_HIGHLIGHT_ICON_PATHS = {
  rayo: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  check: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.2-5.4 5.4a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 1 1 1.4-1.4l1.9 1.9 4.7-4.7a1 1 0 0 1 1.4 1.4Z",
  escudo: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z",
  chat: "M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4.4 3.3A1 1 0 0 1 3 19.5V5a1 1 0 0 1 1-1Z",
  reloj: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2ZM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8Zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67Z",
  estrella: "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21Z",
  grafico: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6Z",
  herramienta: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.9 2.4 7.3 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2-2c.4-.4.4-1 0-1.4Z",
  corazon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z",
  bombilla: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z",
};

// Se usa si config.js no trae "servicesHighlights" (campo opcional).
const DEFAULT_SERVICE_HIGHLIGHTS = [
  { icon: "rayo", label: "Más rápido", desc: "Optimizo tu equipo para que vaya fluido, sin ralentizaciones ni cuelgues." },
  { icon: "check", label: "Menos errores", desc: "Reviso conflictos y programas innecesarios antes de que den problemas de verdad." },
  { icon: "escudo", label: "Seguro", desc: "Tu equipo y tus datos, tratados con el mismo cuidado que si fueran los míos." },
  { icon: "chat", label: "Trato cercano", desc: "Soluciones reales, explicadas en claro y sin venderte de más." },
];

// Reparte "text" en como mucho "maxLines" líneas de hasta "maxChars"
// caracteres, sin cortar palabras — SVG <text> no hace word-wrap solo,
// hay que calcular los saltos de línea a mano. Si sobran palabras tras
// llenar todas las líneas permitidas, la última se recorta con "…".
const wrapWords = (text, maxChars, maxLines) => {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  let i = 0;

  while (i < words.length && lines.length < maxLines) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = "";
      continue; // reintenta esta misma palabra ya en la línea nueva
    }
    current = candidate;
    i++;
  }
  if (current) lines.push(current);

  if (i < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]+$/, "")}…`;
  }
  return lines;
};

const buildServicesOgImageSvg = (cfg, palette, highlights) => {
  const textDim = mixHex(palette.text, palette.bg, 0.6);
  const monoStack = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";
  const serifStack = "Georgia, 'DejaVu Serif', 'Times New Roman', serif";
  const sansStack = "-apple-system, 'DejaVu Sans', Roboto, sans-serif";

  // Rejilla 2x2: misma idea que .services-highlights en la propia página,
  // adaptada a un lienzo fijo de 1200x630 (aquí sí puede ser fija, a
  // diferencia del layout real, que es responsive).
  const marginX = 90;
  const colGap = 70;
  const rowGap = 52;
  const colWidth = (1200 - marginX * 2 - colGap) / 2;
  const iconTextGap = 50; // separación entre el icono y el texto de cada punto

  // Alto de fila reservado para el peor caso: icono/label (34px) + hueco
  // (14px) + hasta 3 líneas de descripción (26px de interlineado). Así
  // las dos filas quedan bien separadas aunque una descripción sea más
  // larga que las demás.
  const rowHeight = 34 + 14 + 26 * 3;
  const gridTop = 278;
  const rowYs = [gridTop, gridTop + rowHeight + rowGap];

  const cells = highlights.slice(0, 4).map((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = marginX + col * (colWidth + colGap);
    const y = rowYs[row];
    const lines = wrapWords(item.desc || "", 40, 3);
    const descText = lines
      // x del tspan relativo al <g> ya trasladado (no volver a sumar "x":
      // eso duplicaba el desplazamiento y sacaba la descripción de la
      // columna derecha fuera del lienzo).
      .map((line, i) => `<tspan x="${iconTextGap}" dy="${i === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`)
      .join("");

    return `
  <g transform="translate(${x}, ${y})">
    <g transform="scale(1.4167)" fill="${palette.accent}">
      <path d="${item.icon}"/>
    </g>
    <text x="${iconTextGap}" y="24" font-family="${monoStack}" font-size="25" font-weight="700" fill="${palette.text}">${escapeXml(item.label)}</text>
    <text y="48" font-family="${sansStack}" font-size="20" fill="${textDim}">${descText}</text>
  </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${palette.bg}"/>
  <text x="${marginX}" y="130" font-family="${monoStack}" font-size="24" font-weight="700" letter-spacing="4" fill="${textDim}">${escapeXml((cfg.operatorName || "").toUpperCase())}</text>
  <text x="${marginX}" y="200" font-family="${serifStack}" font-size="72" fill="${palette.text}">SERVICIOS</text>
  ${cells}
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

// ---- Datos de servicios, calculados siempre (los use index.html como
// portada de servicios, servicios.html como ruta aparte, o ninguno de los
// dos si "sections.services" está desactivado) ----
const servicesTitle = config.operatorName ? `Servicios — ${config.operatorName}` : "Servicios";
const servicesDescription = config.operatorName
  ? `Servicios de ${config.operatorName} para tus equipos y tu negocio: ejemplos orientativos de en qué puedo ayudarte, sin catálogo cerrado ni tarifas fijas. Escríbeme y lo vemos.`
  : "Ejemplos orientativos de servicios para tus equipos y tu negocio, sin catálogo cerrado ni tarifas fijas.";
const servicesOgDescription =
  config.servicesOgDescription ||
  "Más rápido, menos errores, seguro y con trato cercano: ejemplos orientativos de en qué puedo ayudarte con tu equipo.";

const sortedServices = services
  .map((s, i) => ({ s, i }))
  .sort((a, b) => (a.s.order ?? Infinity) - (b.s.order ?? Infinity) || a.i - b.i)
  .map(({ s }) => s)
  .filter((s) => s && s.name);

const noscriptList = sortedServices.length
  ? `        <ol class="index-list">
${sortedServices
  .map(
    (s) =>
      `          <li class="index-row"><span class="row-body"><span class="row-head"><span class="row-name">${escapeXml(s.name)}</span></span>${
        s.description ? `<span class="row-desc">${escapeXml(s.description)}</span>` : ""
      }</span></li>`
  )
  .join("\n")}
        </ol>`
  : `        <p class="row-desc">Todavía no hay servicios listados.</p>`;

const contactEmail = config.contactEmail || "";
const servicesNoscript = `<noscript>
        <h1>${escapeXml(servicesTitle)}</h1>
        <p class="row-desc">Ejemplos orientativos de en qué puedo ayudarte con tu equipo, sin catálogo cerrado ni tarifas fijas. Para la versión interactiva necesitas activar JavaScript.</p>
${noscriptList}
        ${
          contactEmail
            ? `<p class="row-desc">¿Te interesa alguno? Escribe a <a href="mailto:${escapeXml(contactEmail)}">${escapeXml(contactEmail)}</a>.</p>`
            : ""
        }
      </noscript>`;

const buildServicesJsonLd = (url, type) => ({
  "@context": "https://schema.org",
  "@type": type,
  name: servicesTitle,
  description: servicesDescription,
  url,
  inLanguage: "es",
  ...(type === "WebPage" ? { isPartOf: { "@type": "WebSite", name: config.operatorName || "Kardex", url: siteUrl } } : {}),
  ...(config.operatorName ? { about: { "@type": "Person", name: config.operatorName } } : {}),
  ...(sortedServices.length
    ? {
        mainEntity: {
          "@type": "ItemList",
          itemListElement: sortedServices.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Service",
              name: s.name,
              ...(s.description ? { description: s.description } : {}),
              ...(config.operatorName ? { provider: { "@type": "Person", name: config.operatorName } } : {}),
            },
          })),
        },
      }
    : {}),
});

const rawHighlights =
  Array.isArray(config.servicesHighlights) && config.servicesHighlights.length
    ? config.servicesHighlights
    : DEFAULT_SERVICE_HIGHLIGHTS;
const highlights = rawHighlights
  .filter((h) => h && h.label)
  .map((h) => ({
    label: h.label,
    desc: h.desc || "",
    icon: SERVICE_HIGHLIGHT_ICON_PATHS[h.icon] || SERVICE_HIGHLIGHT_ICON_PATHS.check,
  }));

// ---- index.html ----
const indexPath = path.join(PUBLIC_DIR, "index.html");
const rawIndexHtml = fs.readFileSync(indexPath, "utf8");

const indexJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: config.operatorName || "Kardex",
  description: roleFlat || description,
  url: siteUrl,
  inLanguage: "es",
};

let indexHtmlSynced = applyMeta(
  rawIndexHtml,
  "index.html",
  indexIsServices
    ? {
        title: servicesTitle,
        description: servicesDescription,
        ogDescription: servicesOgDescription,
        image: `${siteUrl}og-image.png`,
        imageAlt: config.operatorName ? `Servicios de ${config.operatorName}` : "Servicios",
        url: siteUrl,
        jsonLd: buildServicesJsonLd(siteUrl, "WebSite"),
      }
    : {
        title,
        description,
        ogDescription: roleFlat || description,
        image: `${siteUrl}og-image.png`,
        imageAlt: config.operatorName ? `Índice personal de ${config.operatorName}` : "Índice personal",
        url: siteUrl,
        jsonLd: indexJsonLd,
      }
);
if (indexIsServices) {
  indexHtmlSynced = replaceOne(
    indexHtmlSynced,
    /<noscript>[\s\S]*?<\/noscript>/,
    servicesNoscript,
    "noscript",
    "index.html"
  );
}
writeFileAtomic(indexPath, indexHtmlSynced);
console.log("✓ index.html");

// ---- servicios.html (solo si "portfolio" y "services" están activos a
// la vez) ----
// Se genera ENTERA a partir de index.html (ya sincronizado): mismo
// <body>, solo cambian el <head> (meta propios) y el <noscript> (lista
// real de servicios en vez de la de proyectos, para que un crawler que
// no ejecuta JS —o Google en su primer pase— vea contenido de verdad).
const serviciosPath = path.join(PUBLIC_DIR, "servicios.html");
if (hasServicesRoute) {
  const servicesUrl = `${siteUrl}servicios`;

  let serviciosHtml = applyMeta(indexHtmlSynced, "servicios.html", {
    title: servicesTitle,
    description: servicesDescription,
    ogDescription: servicesOgDescription,
    image: `${siteUrl}og-servicios-image.png`,
    imageAlt: config.operatorName ? `Servicios de ${config.operatorName}` : "Servicios",
    url: servicesUrl,
    jsonLd: buildServicesJsonLd(servicesUrl, "WebPage"),
  });
  serviciosHtml = replaceOne(
    serviciosHtml,
    /<noscript>[\s\S]*?<\/noscript>/,
    servicesNoscript,
    "noscript",
    "servicios.html"
  );
  writeFileAtomic(serviciosPath, serviciosHtml);
  console.log("✓ servicios.html");
} else if (fs.existsSync(serviciosPath)) {
  fs.unlinkSync(serviciosPath);
  console.log("✓ servicios.html (borrado — sections.portfolio/services no están los dos activos)");
}

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

// (El JSON-LD ya no es un archivo aparte: va inline en el HTML, ver
// applyMeta arriba — Google ignora el src en un
// <script type="application/ld+json">.)

// ---- robots.txt ----
const robotsPath = path.join(PUBLIC_DIR, "robots.txt");
let robots = fs.readFileSync(robotsPath, "utf8");
robots = replaceOne(robots, /Sitemap: .*/, `Sitemap: ${siteUrl}sitemap.xml`, "Sitemap", "robots.txt");
writeFileAtomic(robotsPath, robots);
console.log("✓ robots.txt");

// ---- sitemap.xml ----
// Un <loc> por la raíz siempre; uno más para /servicios solo si es una
// ruta real y distinta (las dos secciones activas a la vez).
const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = replaceOne(sitemap, /<loc>https?:\/\/[^<]*?\/<\/loc>/, `<loc>${siteUrl}</loc>`, "loc raíz", "sitemap.xml");
if (hasServicesRoute) {
  if (/<loc>https?:\/\/[^<]*?\/servicios<\/loc>/.test(sitemap)) {
    sitemap = sitemap.replace(/<loc>https?:\/\/[^<]*?\/servicios<\/loc>/, `<loc>${siteUrl}servicios</loc>`);
  } else {
    sitemap = sitemap.replace(
      /<\/urlset>/,
      `  <url>\n    <loc>${siteUrl}servicios</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>`
    );
  }
} else {
  sitemap = sitemap.replace(/\s*<url>\s*<loc>https?:\/\/[^<]*?\/servicios<\/loc>[\s\S]*?<\/url>/, "");
}
writeFileAtomic(sitemapPath, sitemap);
console.log("✓ sitemap.xml");

// ---- og-image.png ----
// Contenido de identidad (nombre/rol) normalmente, o de servicios si
// index.html es la portada de servicios (SECTIONS.services sin portfolio).
const ogImagePath = path.join(PUBLIC_DIR, "og-image.png");
const palette = THEME_PALETTES[config.theme] || THEME_PALETTES.terracota;
const ogSvg = indexIsServices ? buildServicesOgImageSvg(config, palette, highlights) : buildOgImageSvg(config, palette);
if (rasterizeSvg(ogSvg, ogImagePath)) {
  console.log("✓ og-image.png");
} else {
  console.warn("  ! og-image.png: no se encontró rsvg-convert ni sips — no se ha regenerado, se sigue sirviendo la que ya había");
  warnings++;
}

// ---- og-servicios-image.png (solo si /servicios es una ruta real y
// distinta de "/") ----
const ogServiciosImagePath = path.join(PUBLIC_DIR, "og-servicios-image.png");
if (hasServicesRoute) {
  if (rasterizeSvg(buildServicesOgImageSvg(config, palette, highlights), ogServiciosImagePath)) {
    console.log("✓ og-servicios-image.png");
  } else {
    console.warn("  ! og-servicios-image.png: no se encontró rsvg-convert ni sips — no se ha regenerado, se sigue sirviendo la que ya había");
    warnings++;
  }
} else if (fs.existsSync(ogServiciosImagePath)) {
  fs.unlinkSync(ogServiciosImagePath);
  console.log("✓ og-servicios-image.png (borrada — sections.portfolio/services no están los dos activos)");
}

console.log(`\nListo — dominio usado: ${siteUrl}`);
if (warnings > 0) {
  console.log(`${warnings} aviso(s) arriba: revisa esos archivos, puede que su formato haya cambiado.`);
}
console.log("Revisa el resultado con `git diff` antes de desplegar o commitear.");
