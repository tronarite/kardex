#!/usr/bin/env node
/**
 * Sincroniza las etiquetas "estáticas" de SEO/redes con los datos de
 * config.js: <title>, meta description, og:title/og:description/og:url,
 * twitter:title/twitter:description, <link rel="canonical"> en
 * index.html (y en servicios.html [BETA], su "gemelo" para la ruta
 * /servicios — ver el comentario dentro de ese archivo), más robots.txt,
 * sitemap.xml, ld.json y — generadas de cero, no solo texto —
 * og-image.png y og-servicios-image.png, las imágenes que se ven al
 * compartir el enlace (Discord, WhatsApp, Twitter/X...).
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
 * Nota: index.html, servicios.html, robots.txt, sitemap.xml, ld.json,
 * og-image.png y og-servicios-image.png SÍ están en git (a diferencia de
 * config.js). Publicar con tus datos reales los deja "sucios" en tu copia
 * local — trátalos igual que config.js:
 *
 *   git update-index --skip-worktree public/index.html public/servicios.html \
 *     public/ld.json public/robots.txt public/sitemap.xml \
 *     public/og-image.png public/og-servicios-image.png
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

// ---- og-servicios-image.png [BETA]: los mismos 4 puntos a favor de la
// vista de servicios (ver .services-highlights en index.html), como
// imagen de previsualización al compartir /servicios. Contenido fijo
// (no viene de config.js, igual que en el propio index.html) — si algún
// día cambias los textos o iconos ahí, cambia también esta lista para
// que no se desincronicen. ----
const SERVICE_HIGHLIGHTS = [
  {
    label: "Más rápido",
    desc: "Optimizo tu equipo para que vaya fluido, sin ralentizaciones ni cuelgues.",
    icon: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  },
  {
    label: "Menos errores",
    desc: "Reviso conflictos y programas innecesarios antes de que den problemas de verdad.",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.2-5.4 5.4a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 1 1 1.4-1.4l1.9 1.9 4.7-4.7a1 1 0 0 1 1.4 1.4Z",
  },
  {
    label: "Seguro",
    desc: "Tu equipo y tus datos, tratados con el mismo cuidado que si fueran los míos.",
    icon: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z",
  },
  {
    label: "Trato cercano",
    desc: "Soluciones reales, explicadas en claro y sin venderte de más.",
    icon: "M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4.4 3.3A1 1 0 0 1 3 19.5V5a1 1 0 0 1 1-1Z",
  },
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

const buildServicesOgImageSvg = (cfg, palette) => {
  const textDim = mixHex(palette.text, palette.bg, 0.6);
  const monoStack = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";
  const serifStack = "Georgia, 'DejaVu Serif', 'Times New Roman', serif";
  const sansStack = "-apple-system, 'DejaVu Sans', Roboto, sans-serif";

  // Rejilla 2x2: misma idea que .services-highlights en la propia página,
  // adaptada a un lienzo fijo de 1200x630 (aquí sí puede ser fija, a
  // diferencia del layout real, que es responsive).
  const marginX = 90;
  const colGap = 70;
  const rowGap = 46;
  const colWidth = (1200 - marginX * 2 - colGap) / 2;
  const iconTextGap = 50; // separación entre el icono y el texto de cada punto

  // Alto real de cada fila = icono/label (34px) + hueco (14px) + 2 líneas
  // de descripción (26px de interlineado) — las 4 descripciones actuales
  // caben siempre en 2 líneas a este ancho de columna; si algún día se
  // alargan y necesitan una tercera, se solaparían con la fila de abajo
  // (revisa visualmente og-servicios-image.png tras tocar los textos).
  const rowHeight = 34 + 14 + 26 * 2;
  const gridTop = 260;
  const rowYs = [gridTop, gridTop + rowHeight + rowGap];

  const cells = SERVICE_HIGHLIGHTS.map((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = marginX + col * (colWidth + colGap);
    const y = rowYs[row];
    const lines = wrapWords(item.desc, 40, 2);
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
// Misma lógica para index.html y su "gemelo" servicios.html (ver el
// comentario dentro de ese archivo) — cada uno con sus propios valores,
// para que compartir /servicios tenga su propia previsualización en vez
// de repetir la del índice.
const syncHtmlMeta = (filePath, fileLabel, tags) => {
  let content = fs.readFileSync(filePath, "utf8");
  content = replaceOne(content, /<title>.*?<\/title>/, `<title>${tags.title}</title>`, "title", fileLabel);
  content = replaceOne(content, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${tags.description}">`, "meta description", fileLabel);
  content = replaceOne(content, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${tags.ogTitle}">`, "og:title", fileLabel);
  content = replaceOne(content, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${tags.ogDescription}">`, "og:description", fileLabel);
  content = replaceOne(content, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${tags.url}">`, "og:url", fileLabel);
  content = replaceOne(content, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${tags.twitterTitle}">`, "twitter:title", fileLabel);
  content = replaceOne(content, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${tags.twitterDescription}">`, "twitter:description", fileLabel);
  content = replaceOne(content, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${tags.url}">`, "canonical", fileLabel);
  writeFileAtomic(filePath, content);
  console.log(`✓ ${fileLabel}`);
};

// ---- index.html ----
const indexPath = path.join(PUBLIC_DIR, "index.html");
syncHtmlMeta(indexPath, "index.html", {
  title,
  description,
  ogTitle: title,
  ogDescription: roleFlat || description,
  twitterTitle: title,
  twitterDescription: roleFlat || description,
  url: siteUrl,
});

// ---- servicios.html [BETA] ----
// Mismo título que pinta script.js en el <head> real al entrar en la
// vista (ver initViewSwitcher) — "Servicios — {nombre}" o solo
// "Servicios" si no hay operatorName configurado.
const servicesTagline = "Más rápido · Menos errores · Seguro · Trato cercano";
const servicesTitle = config.operatorName ? `Servicios — ${config.operatorName}` : "Servicios";
const servicesDescription = config.operatorName
  ? `Ejemplos orientativos de en qué puede ayudarte ${config.operatorName} con tus equipos: ${servicesTagline.toLowerCase()}.`
  : `Ejemplos orientativos de servicios: ${servicesTagline.toLowerCase()}.`;
const serviciosPath = path.join(PUBLIC_DIR, "servicios.html");
if (fs.existsSync(serviciosPath)) {
  syncHtmlMeta(serviciosPath, "servicios.html", {
    title: servicesTitle,
    description: servicesDescription,
    ogTitle: servicesTitle,
    ogDescription: servicesTagline,
    twitterTitle: servicesTitle,
    twitterDescription: servicesTagline,
    url: `${siteUrl}servicios`,
  });
} else {
  console.warn("  ! servicios.html no encontrado — se omite (¿está activada la vista de servicios? ver README)");
  warnings++;
}

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

// ---- og-image.png ----
const ogImagePath = path.join(PUBLIC_DIR, "og-image.png");
const palette = THEME_PALETTES[config.theme] || THEME_PALETTES.terracota;
if (rasterizeSvg(buildOgImageSvg(config, palette), ogImagePath)) {
  console.log("✓ og-image.png");
} else {
  console.warn("  ! og-image.png: no se encontró rsvg-convert ni sips — no se ha regenerado, se sigue sirviendo la que ya había");
  warnings++;
}

// ---- og-servicios-image.png [BETA] ----
if (fs.existsSync(serviciosPath)) {
  const ogServiciosImagePath = path.join(PUBLIC_DIR, "og-servicios-image.png");
  if (rasterizeSvg(buildServicesOgImageSvg(config, palette), ogServiciosImagePath)) {
    console.log("✓ og-servicios-image.png");
  } else {
    console.warn("  ! og-servicios-image.png: no se encontró rsvg-convert ni sips — no se ha regenerado, se sigue sirviendo la que ya había");
    warnings++;
  }
}

console.log(`\nListo — dominio usado: ${siteUrl}`);
if (warnings > 0) {
  console.log(`${warnings} aviso(s) arriba: revisa esos archivos, puede que su formato haya cambiado.`);
}
console.log("Revisa el resultado con `git diff` antes de desplegar o commitear.");
