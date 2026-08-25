/**
 * ADVANCED LINK PORTFOLIO — SCRIPT
 * Hub personal de enlaces y proyectos con diseño minimalista y técnico.
 */

// ==========================================================================
// CONFIGURACIÓN DE IDENTIDAD Y PROYECTOS
// Personaliza aquí tus datos, título y enlaces.
// ==========================================================================
const SITE_TITLE = "DEV_HUB";
const OPERATOR_AUTHOR = "Tu Nombre / Alias";
const OPERATOR_SUBTITLE = "DESARROLLO SOFTWARE // INGENIERÍA & SISTEMAS";
const CONTACT_EMAIL = "contacto@ejemplo.com";

const UNITS = [
  {
    code: "01",
    name: "PROYECTO EJEMPLO",
    description: "Descripción del proyecto o plataforma en producción.",
    url: "https://ejemplo.com",
    status: "ONLINE", // Proyecto en producción (Verde)
    displayUrl: "ejemplo.com"
  },
  {
    code: "02",
    name: "PORTFOLIO FOTOGRÁFICO",
    description: "Galería fotográfica y archivos visuales personales.",
    url: "https://foto.ejemplo.com",
    status: "EN DESARROLLO", // En desarrollo / construcción (Azul)
    displayUrl: "foto.ejemplo.com"
  },
  {
    code: "03",
    name: "GITHUB",
    description: "Código, herramientas y proyectos open source.",
    url: "https://github.com/tuusuario",
    status: "REPOSITORIO", // Enlace a código / perfil (Violeta)
    displayUrl: "github.com/tuusuario"
  },
  {
    code: "04",
    name: "LAST.FM",
    description: "Historial musical y estadísticas en tiempo real.",
    url: "https://www.last.fm/user/tuusuario",
    status: "MÚSICA", // Enlace a streaming / scrobble (Carmesí)
    displayUrl: "last.fm/user/tuusuario"
  }
];

// ==========================================================================
// UTILIDADES & DETECCIÓN DE PREFERENCIAS
// ==========================================================================
const prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Resuelve la clase CSS correspondiente según el estado del proyecto
 */
const getStatusClass = (status = "") => {
  const s = status.toLowerCase().trim();
  if (s.includes("dev") || s.includes("build") || s.includes("wip") || s.includes("desarrollo") || s.includes("construc")) {
    return "building";
  }
  if (s.includes("standby") || s.includes("pause") || s.includes("pausa") || s.includes("idle")) {
    return "standby";
  }
  if (s.includes("source") || s.includes("repo") || s.includes("link") || s.includes("git") || s.includes("código") || s.includes("codigo") || s.includes("extern")) {
    return "source";
  }
  if (s.includes("scrobble") || s.includes("music") || s.includes("música") || s.includes("musica") || s.includes("audio") || s.includes("stream") || s.includes("media") || s.includes("last")) {
    return "media";
  }
  if (s.includes("off") || s.includes("arch") || s.includes("down") || s.includes("inactivo")) {
    return "offline";
  }
  return "online"; // por defecto / activo
};

/**
 * Formatea fecha actual para el registro del pie (YYYY-MM-DD HH:mm:ss)
 */
const getSystemTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// ==========================================================================
// RENDERIZADO DE PROYECTOS / ENLACES
// ==========================================================================
const createUnitCardElement = (unit) => {
  const card = document.createElement("article");
  card.className = "unit-card animate-init";
  card.setAttribute("role", "listitem");

  const statusClass = getStatusClass(unit.status);
  const displayLink = unit.displayUrl || unit.url.replace(/^https?:\/\//, "");

  card.innerHTML = `
    <a href="${unit.url}" target="_blank" rel="noopener noreferrer" class="unit-link">
      <div class="unit-header">
        <div class="unit-designation">
          <span class="unit-code">${unit.code}</span>
          <span class="unit-sep">::</span>
          <span class="unit-name">${unit.name}</span>
        </div>
        <div class="unit-badge ${statusClass}">
          <span class="indicator-dot" aria-hidden="true"></span>
          <span class="badge-label">[${unit.status}]</span>
        </div>
      </div>
      <p class="unit-desc">${unit.description}</p>
      <div class="unit-footer">
        <span class="unit-url">→ ${displayLink}</span>
      </div>
    </a>
  `;

  return card;
};

/**
 * Inserta las tarjetas en el DOM y gestiona la animación secuencial escalonada
 */
const renderUnits = () => {
  const container = document.getElementById("units-list");
  if (!container) return;

  container.innerHTML = "";
  const cardElements = [];

  UNITS.forEach((unit) => {
    const cardEl = createUnitCardElement(unit);
    container.appendChild(cardEl);
    cardElements.push(cardEl);
  });

  if (prefersReducedMotion()) {
    // Si el usuario prefiere movimiento reducido, mostrar inmediatamente
    cardElements.forEach((el) => {
      el.classList.remove("animate-init");
      el.classList.add("is-visible");
    });
    return;
  }

  // Animación escalonada (90ms entre cada elemento)
  cardElements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.remove("animate-init");
      el.classList.add("is-visible");
    }, 90 * (index + 1));
  });
};

// ==========================================================================
// SECUENCIA DE ENTRADA (BOOT TYPEWRITER)
// ==========================================================================
const runBootSequence = (onComplete) => {
  const nameEl = document.getElementById("operator-name");
  if (!nameEl) {
    if (onComplete) onComplete();
    return;
  }

  if (prefersReducedMotion()) {
    nameEl.textContent = SITE_TITLE;
    if (onComplete) onComplete();
    return;
  }

  nameEl.textContent = "";
  let charIndex = 0;
  const typingDelay = 65; // milisegundos por carácter

  const typeInterval = setInterval(() => {
    if (charIndex < SITE_TITLE.length) {
      nameEl.textContent += SITE_TITLE.charAt(charIndex);
      charIndex++;
    } else {
      clearInterval(typeInterval);
      if (onComplete) {
        setTimeout(onComplete, 140);
      }
    }
  }, typingDelay);
};

// ==========================================================================
// GESTIÓN DEL TEMA ADAPTATIVO (AUTO / CLARO / OSCURO)
// ==========================================================================
const initThemeManager = () => {
  const toggleBtn = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-label");
  const themeIcon = document.getElementById("theme-icon");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const getSystemTheme = () => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
      const currentEffective = getSystemTheme();
      if (themeLabel) themeLabel.textContent = "AUTO";
      if (themeIcon) themeIcon.textContent = "◐";
      if (themeMeta) themeMeta.setAttribute("content", currentEffective === "dark" ? "#0B0C0E" : "#F6F7F9");
    } else if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (themeLabel) themeLabel.textContent = "DARK";
      if (themeIcon) themeIcon.textContent = "🌙";
      if (themeMeta) themeMeta.setAttribute("content", "#0B0C0E");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      if (themeLabel) themeLabel.textContent = "LIGHT";
      if (themeIcon) themeIcon.textContent = "☀️";
      if (themeMeta) themeMeta.setAttribute("content", "#F6F7F9");
    }
  };

  const savedTheme = localStorage.getItem("theme-preference") || "auto";
  applyTheme(savedTheme);

  // Escuchar cambios de preferencia del sistema operativo en tiempo real
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem("theme-preference") || "auto") === "auto") {
      applyTheme("auto");
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = localStorage.getItem("theme-preference") || "auto";
      let nextTheme = "auto";
      if (current === "auto") {
        nextTheme = getSystemTheme() === "dark" ? "light" : "dark";
      } else if (current === "dark") {
        nextTheme = "light";
      } else {
        nextTheme = "auto";
      }
      localStorage.setItem("theme-preference", nextTheme);
      applyTheme(nextTheme);
    });
  }
};

// ==========================================================================
// GESTIÓN DE CONTACTO Y COPIADO AL PORTAPAPELES
// ==========================================================================
const initContactManager = () => {
  const emailLink = document.getElementById("contact-email-link");
  const emailText = document.getElementById("contact-email-text");
  const copyBtn = document.getElementById("copy-email-btn");
  const copyBtnText = document.getElementById("copy-btn-text");

  if (emailLink && CONTACT_EMAIL) {
    emailLink.href = `mailto:${CONTACT_EMAIL}`;
  }
  if (emailText && CONTACT_EMAIL) {
    emailText.textContent = CONTACT_EMAIL;
  }

  if (copyBtn && copyBtnText) {
    copyBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(CONTACT_EMAIL);
        } else {
          // Fallback para navegadores antiguos
          const tempInput = document.createElement("input");
          tempInput.value = CONTACT_EMAIL;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          document.body.removeChild(tempInput);
        }

        // Feedback visual
        copyBtn.classList.add("copied");
        copyBtnText.textContent = "¡Copiado! ✓";

        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtnText.textContent = "Copiar";
        }, 2000);
      } catch (err) {
        console.error("Error al copiar correo:", err);
      }
    });
  }
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Inicializar gestor de tema claro/oscuro
  initThemeManager();

  // 2. Inicializar gestor de contacto
  initContactManager();

  // 3. Actualizar autor si está definido
  const authorEl = document.getElementById("operator-author");
  if (authorEl && OPERATOR_AUTHOR) {
    authorEl.textContent = OPERATOR_AUTHOR;
  }

  // 4. Actualizar subtítulo si está definido
  const subEl = document.getElementById("operator-subtitle");
  if (subEl && OPERATOR_SUBTITLE) {
    subEl.innerHTML = OPERATOR_SUBTITLE.split("//")
      .map(part => part.trim())
      .join(' <span class="sep">//</span> ');
  }

  // 5. Actualizar fecha en el pie
  const timestampEl = document.getElementById("sync-timestamp");
  if (timestampEl) {
    timestampEl.textContent = getSystemTimestamp();
  }

  // 6. Ejecutar secuencia de arranque y renderizado
  runBootSequence(() => {
    renderUnits();
  });
});
