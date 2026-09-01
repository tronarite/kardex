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

// Etiqueta por defecto para cada "type" cuando config.js no especifica "label".
const DEFAULT_STATUS_LABELS = {
  online: "ONLINE",
  dev: "EN DESARROLLO",
  standby: "EN PAUSA",
  source: "REPOSITORIO",
  media: "MÚSICA",
  servicios: "SERVICIOS",
  offline: "INACTIVO"
};

const VALID_STATUS_TYPES = new Set(Object.keys(DEFAULT_STATUS_LABELS));

const VALID_THEME_PACKS = new Set(["terracota", "azul", "verde", "monocromo"]);

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
 * - Si no se indica "type", se asume "online" (caso más común al añadir un enlace).
 * - Si se indica un "type" que no existe (típicamente un error tipográfico),
 *   se muestra en gris "offline" para que el error salte a la vista.
 * - Si no se indica "label", se usa el texto por defecto de ese "type".
 */
const resolveStatus = (type, label) => {
  const resolvedType = type === undefined ? "online" : (VALID_STATUS_TYPES.has(type) ? type : "offline");
  const resolvedLabel = label || DEFAULT_STATUS_LABELS[resolvedType];
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
  flag.className = "row-flag";

  const dot = document.createElement("span");
  dot.className = `flag-dot flag-dot--${type}`;
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
  const displayLink = unit.displayUrl || unit.url.replace(/^https?:\/\//, "");
  url.textContent = `${displayLink} →`;

  link.appendChild(number);
  link.appendChild(body);
  link.appendChild(url);
  row.appendChild(link);

  return row;
};

const renderUnits = (units) => {
  const container = document.getElementById("units-list");
  if (!container) return;

  container.innerHTML = "";
  const rows = units.map((unit, index) => {
    const row = createUnitRow(unit, index);
    container.appendChild(row);
    return row;
  });

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
    const status = resolveStatus(config.availability.type, config.availability.label);
    const dot = flagEl.querySelector(".flag-dot");
    const text = flagEl.querySelector(".flag-text");
    if (dot) dot.className = `flag-dot flag-dot--${status.type}`;
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
const initContactManager = (config) => {
  const emailLink = document.getElementById("contact-email-link");
  const emailText = document.getElementById("contact-email-text");
  const copyBtn = document.getElementById("copy-email-btn");
  const copyBtnText = document.getElementById("copy-btn-text");
  const copyStatus = document.getElementById("copy-status");
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
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initThemeManager();
  applyThemePack(SITE_CONFIG.theme);
  renderIdentity(SITE_CONFIG);
  initContactManager(SITE_CONFIG);
  renderUnits(UNITS);
});
