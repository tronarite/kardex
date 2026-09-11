/**
 * ÍNDICE — PERSONAL LINK HUB
 * Renderizado, tema adaptativo y contacto. Los datos personalizables viven
 * en config.js (SITE_CONFIG, UNITS); este archivo no debería necesitar
 * cambios para personalizar el sitio.
 */

// ==========================================================================
// UTILIDADES
// ==========================================================================
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "type" describe SOLO la fase del proyecto (color del punto). Para la
// categoría (REPOSITORIO, MÚSICA, SERVICIO...) usa "label", que es texto
// libre y no toca el color — así una entrada puede combinar cualquier
// categoría con cualquier estado (ver ejemplos en config.js).
const DEFAULT_STATUS_LABELS = {
  activo: "ACTIVO",
  desarrollo: "EN DESARROLLO",
  pausa: "EN PAUSA",
  proximamente: "PRÓXIMAMENTE",
  inactivo: "INACTIVO"
};

const VALID_STATUS_TYPES = new Set(Object.keys(DEFAULT_STATUS_LABELS));

const VALID_THEME_PACKS = new Set(["terracota", "vino", "mostaza", "azul", "petroleo", "monocromo"]);

/**
 * Aplica el pack de tema elegido en config.js (SITE_CONFIG.theme). Cada pack
 * trae ya coordinadas su versión clara y su versión oscura — cuál de las
 * dos se ve depende del sistema o del botón de tema, no de esto. Si no se
 * indica, o no es una opción válida, se queda con "terracota" (el valor
 * por defecto ya definido en :root en style.css).
 */
const applyThemePack = (theme) => {
  if (theme && VALID_THEME_PACKS.has(theme)) {
    document.documentElement.dataset.themePack = theme;
  }
};

/**
 * Resuelve { type, label } finales a partir de lo que haya en config.js.
 * - Si no se indica "type", se asume "activo" (caso más común al añadir un enlace).
 * - Si se indica un "type" que no existe (típicamente un error tipográfico),
 *   se muestra en gris "inactivo" para que el error salte a la vista.
 * - Si no se indica "label", se usa el texto por defecto de ese "type".
 */
const resolveStatus = (type, label) => {
  const resolvedType = type === undefined ? "activo" : (VALID_STATUS_TYPES.has(type) ? type : "inactivo");
  const resolvedLabel = label || DEFAULT_STATUS_LABELS[resolvedType];
  return { type: resolvedType, label: resolvedLabel };
};

// Catálogo de DISPONIBILIDAD PERSONAL (SITE_CONFIG.availability), separado
// del catálogo de proyectos: "en pausa" para un proyecto no es lo mismo
// que "estoy de vacaciones" para una persona.
const DEFAULT_AVAILABILITY_LABELS = {
  disponible: "DISPONIBLE",
  ocupado: "OCUPADO",
  vacaciones: "DE VACACIONES",
  "no-disponible": "NO DISPONIBLE"
};

const VALID_AVAILABILITY_TYPES = new Set(Object.keys(DEFAULT_AVAILABILITY_LABELS));

const resolveAvailability = (type, label) => {
  const resolvedType =
    type === undefined ? "disponible" : (VALID_AVAILABILITY_TYPES.has(type) ? type : "no-disponible");
  const resolvedLabel = label || DEFAULT_AVAILABILITY_LABELS[resolvedType];
  return { type: resolvedType, label: resolvedLabel };
};

const getSystemTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

// ==========================================================================
// RENDERIZADO DEL ÍNDICE DE PROYECTOS
// ==========================================================================
const createFlagElement = (type, label) => {
  const flag = document.createElement("span");
  flag.className = `row-flag status-${type}`;

  const dot = document.createElement("span");
  dot.className = "flag-dot";
  dot.setAttribute("aria-hidden", "true");

  flag.appendChild(dot);
  flag.appendChild(document.createTextNode(label));
  return flag;
};

const createUnitRow = (unit, index) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  const link = document.createElement("a");
  link.className = "index-link";
  link.href = unit.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const number = document.createElement("span");
  number.className = "row-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const body = document.createElement("span");
  body.className = "row-body";

  const head = document.createElement("span");
  head.className = "row-head";

  const name = document.createElement("span");
  name.className = "row-name";
  name.textContent = unit.name;

  const status = resolveStatus(unit.type, unit.label);
  head.appendChild(name);
  head.appendChild(createFlagElement(status.type, status.label));

  if (unit.priceRange) {
    const price = document.createElement("span");
    price.className = "row-price";
    price.textContent = unit.priceRange;
    head.appendChild(price);
  }

  const desc = document.createElement("span");
  desc.className = "row-desc";
  desc.textContent = unit.description;

  body.appendChild(head);
  body.appendChild(desc);

  const url = document.createElement("span");
  url.className = "row-url";
  // "ctaText" sustituye del todo el texto de la URL por un texto propio —
  // útil para enlaces que no tiene sentido mostrar como URL. Si no se
  // indica, se genera a partir de "displayUrl"/"url" como siempre.
  const ctaText = unit.ctaText || null;
  if (ctaText) {
    url.textContent = `${ctaText} →`;
  } else {
    const displayLink = unit.displayUrl || unit.url.replace(/^https?:\/\//, "");
    url.textContent = `${displayLink} →`;
  }

  link.appendChild(number);
  link.appendChild(body);
  link.appendChild(url);
  row.appendChild(link);

  return row;
};

/**
 * Ordena las unidades colocando las que tienen "order" exactamente en esa
 * posición (1 = primera), y rellenando el resto de huecos con las que no
 * indican "order", en su orden relativo original. Si dos unidades piden
 * la misma posición, gana la que esté antes en la lista.
 */
const sortUnitsByOrder = (units) => {
  const withIndex = units.map((unit, index) => ({ unit, index }));

  const ordered = withIndex
    .filter(({ unit }) => unit.order !== undefined && unit.order !== null)
    .sort((a, b) => a.unit.order - b.unit.order || a.index - b.index);

  const unordered = withIndex.filter(
    ({ unit }) => unit.order === undefined || unit.order === null
  );

  const result = [];
  let orderedPtr = 0;
  let unorderedPtr = 0;

  for (let position = 1; position <= units.length; position++) {
    const nextOrdered = ordered[orderedPtr];
    if (nextOrdered && nextOrdered.unit.order <= position) {
      result.push(nextOrdered.unit);
      orderedPtr++;
    } else if (unorderedPtr < unordered.length) {
      result.push(unordered[unorderedPtr].unit);
      unorderedPtr++;
    } else if (nextOrdered) {
      result.push(nextOrdered.unit);
      orderedPtr++;
    }
  }

  return result;
};

// Entrada escalonada de filas de renderUnits.
const animateRowsIn = (rows) => {
  if (prefersReducedMotion()) {
    rows.forEach((row) => {
      row.classList.remove("animate-init");
      row.classList.add("is-visible");
    });
    return;
  }

  rows.forEach((row, index) => {
    setTimeout(() => {
      row.classList.remove("animate-init");
      row.classList.add("is-visible");
    }, 70 * (index + 1));
  });
};

const renderUnits = (units) => {
  const container = document.getElementById("content-list");
  if (!container) return;

  // Si a un proyecto le falta "name" o "url" (obligatorios), se salta ese
  // proyecto en vez de romper el índice entero — y avisa por consola para
  // que sea fácil detectar cuál es el que falta completar.
  const validUnits = units.filter((unit) => {
    const isValid = Boolean(unit.name) && Boolean(unit.url);
    if (!isValid) {
      console.warn(
        `Kardex: se ha omitido un proyecto de config.js por faltarle "name" o "url":`,
        unit
      );
    }
    return isValid;
  });

  const sortedUnits = sortUnitsByOrder(validUnits);

  container.innerHTML = "";
  const rows = sortedUnits.map((unit, index) => {
    const row = createUnitRow(unit, index);
    container.appendChild(row);
    return row;
  });

  animateRowsIn(rows);
};

// ==========================================================================
// IDENTIDAD Y DISPONIBILIDAD
// ==========================================================================
const renderIdentity = (config) => {
  document.title = config.pageTitle || `${config.operatorName} — Índice`;

  const nameEl = document.getElementById("operator-name");
  if (nameEl && config.operatorName) {
    nameEl.textContent = config.operatorName;
  }

  const roleEl = document.getElementById("operator-subtitle");
  if (roleEl && config.operatorRole) {
    roleEl.innerHTML = "";
    config.operatorRole.split("//").forEach((part, index, arr) => {
      roleEl.appendChild(document.createTextNode(part.trim()));
      if (index < arr.length - 1) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "//";
        roleEl.appendChild(document.createTextNode(" "));
        roleEl.appendChild(sep);
        roleEl.appendChild(document.createTextNode(" "));
      }
    });
  }

  const flagEl = document.getElementById("status-flag");
  if (flagEl && config.availability) {
    const status = resolveAvailability(config.availability.type, config.availability.label);
    const text = flagEl.querySelector(".flag-text");
    flagEl.className = `flag status-${status.type}`;
    if (text) text.textContent = status.label;
  }

  const timestampEl = document.getElementById("sync-timestamp");
  if (timestampEl) {
    timestampEl.textContent = getSystemTimestamp();
  }
};

// ==========================================================================
// GESTIÓN DEL TEMA (auto / claro / oscuro)
// ==========================================================================
const initThemeManager = () => {
  const toggleBtn = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-label");
  if (!toggleBtn) return;

  const LABELS = { auto: "AUTO", dark: "DARK", light: "LIGHT" };

  const applyTheme = (theme) => {
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    toggleBtn.dataset.state = theme;
    if (themeLabel) themeLabel.textContent = LABELS[theme];
  };

  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const savedTheme = localStorage.getItem("theme-preference") || "auto";
  applyTheme(savedTheme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem("theme-preference") || "auto") === "auto") {
      applyTheme("auto");
    }
  });

  toggleBtn.addEventListener("click", () => {
    const current = localStorage.getItem("theme-preference") || "auto";
    let next = "auto";
    if (current === "auto") {
      next = getSystemTheme() === "dark" ? "light" : "dark";
    } else if (current === "dark") {
      next = "light";
    }
    localStorage.setItem("theme-preference", next);
    applyTheme(next);
  });
};

// ==========================================================================
// CONTACTO Y COPIADO AL PORTAPAPELES
// ==========================================================================
const initContactManager = (config, ids = {}) => {
  const emailLink = document.getElementById(ids.emailLink || "contact-email-link");
  const emailText = document.getElementById(ids.emailText || "contact-email-text");
  const copyBtn = document.getElementById(ids.copyBtn || "copy-email-btn");
  const copyBtnText = document.getElementById(ids.copyBtnText || "copy-btn-text");
  const copyStatus = document.getElementById(ids.copyStatus || "copy-status");
  const email = config.contactEmail;

  if (emailLink && email) emailLink.href = `mailto:${email}`;
  if (emailText && email) emailText.textContent = email;

  if (!copyBtn || !copyBtnText || !email) return;

  const defaultLabel = copyBtnText.textContent;

  copyBtn.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = email;
        tempInput.setAttribute("aria-hidden", "true");
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }

      copyBtn.classList.add("copied");
      copyBtnText.textContent = "Copiado ✓";
      if (copyStatus) copyStatus.textContent = "Correo copiado al portapapeles.";

      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtnText.textContent = defaultLabel;
      }, 2000);
    } catch (err) {
      if (copyStatus) copyStatus.textContent = "No se pudo copiar el correo.";
      console.error("Error al copiar correo:", err);
    }
  });
};

// ==========================================================================
// [Página estática] BLOQUEO REAL DE FILAS TAPADAS
// A partir de 860px la lista de enlaces es la ÚNICA parte de la página con
// scroll (ver .index-scroll en style.css) — la entradilla y el título de
// arriba no se mueven nunca. En cuanto una fila queda aunque sea mínimamente
// detrás de la zona de desvanecido de arriba, deja de poder pulsarse DE
// VERDAD (pointer-events, no solo queda tapada visualmente) y sale del
// orden de tabulación con teclado. En móvil (menos de 860px) toda la
// página se desplaza normal y esto no aplica.
// ==========================================================================
const FADE_ZONE_PX = 28; // debe coincidir con "black 1.75rem" del mask-image de .index-scroll en style.css

const initListFadeGuard = () => {
  const scrollArea = document.getElementById("index-scroll");
  if (!scrollArea) return;

  const isDesktopLayout = () => window.matchMedia("(min-width: 860px)").matches;

  let ticking = false;

  const update = () => {
    ticking = false;

    const active = isDesktopLayout();
    const listRect = scrollArea.getBoundingClientRect();
    const topBoundary = active ? listRect.top + FADE_ZONE_PX : -Infinity;
    const bottomBoundary = active ? listRect.bottom - FADE_ZONE_PX : Infinity;

    scrollArea.querySelectorAll(".index-row").forEach((row) => {
      const rowRect = row.getBoundingClientRect();
      const obscured = active && (rowRect.top < topBoundary || rowRect.bottom > bottomBoundary);
      row.classList.toggle("is-obscured", obscured);

      const link = row.querySelector(".index-link");
      if (!link) return;
      if (obscured) {
        link.setAttribute("tabindex", "-1");
      } else {
        link.removeAttribute("tabindex");
      }
    });
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  scrollArea.addEventListener("scroll", requestUpdate);
  window.addEventListener("resize", requestUpdate);

  // renderUnits sustituye el contenido de #content-list — hay que
  // recalcular qué queda tapado cada vez que cambia.
  const list = document.getElementById("content-list");
  if (list) {
    new MutationObserver(requestUpdate).observe(list, { childList: true });
  }

  update();
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initThemeManager();
  applyThemePack(SITE_CONFIG.theme);
  renderIdentity(SITE_CONFIG);
  initContactManager(SITE_CONFIG);
  renderUnits(UNITS);
  initListFadeGuard();
});
