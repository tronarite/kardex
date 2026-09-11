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

// "/servicios" es el único valor especial de "url": en vez de un enlace de
// verdad, script.js lo reconoce (createUnitRow) y lo convierte en el botón
// que dispara la transición a la vista de servicios de esta misma página
// (ver initViewSwitcher) — no es una página distinta, así que no lleva
// target="_blank" ni rel de enlace externo. Es una ruta real (no un hash)
// para que https://tudominio.example/servicios sea una URL "de verdad"
// compartible/indexable — nginx.conf tiene una regla exacta para servir
// index.html en esa ruta (ver el comentario en nginx.conf).
const SERVICES_VIEW_URL = "/servicios";

// Rellenadas más abajo (initViewSwitcher e initContactModal, cada una en
// su sección). Declaradas aquí arriba porque createUnitRow/createServiceRow
// ya necesitan poder llamarlas antes de que esos bloques existan en el
// archivo.
let goToServicesView = () => {};
let goToIndexView = () => {};
let openContactModal = () => {};

const createUnitRow = (unit, index) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  const isServicesTrigger = unit.url === SERVICES_VIEW_URL;

  const link = document.createElement("a");
  link.className = "index-link";
  link.href = unit.url;
  if (!isServicesTrigger) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } else {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goToServicesView();
    });
  }

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
  // "ctaText" sustituye del todo el texto de la URL por un texto propio
  // (ej. "Ver servicios") — útil para enlaces que no tiene sentido mostrar
  // como URL (rutas internas, anclas...). Si no se indica, se sigue
  // generando a partir de "displayUrl"/"url" como siempre. El enlace a la
  // vista de servicios usa "Ver servicios" por defecto si no se personaliza.
  const ctaText = unit.ctaText || (isServicesTrigger ? "Ver servicios" : null);
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

// Entrada escalonada de filas, reutilizada por renderUnits y renderServices
// (misma lista, dos fuentes de datos distintas).
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
// VISTA DE SERVICIOS
// No es una página distinta: es la misma index.html cambiando de contenido
// (ver initViewSwitcher más abajo, que orquesta la transición y llama a
// renderServices en el momento justo). Se apoya en SERVICES (config.js) y
// reutiliza la lista/fila del índice de proyectos (.index-row, .row-*).
//
// Deliberadamente SIN precio ni tarifa por hora en cada tarjeta: son
// ejemplos orientativos de lo que se puede hacer, no un catálogo cerrado.
// El CTA de cada fila no abre un mailto directo — lleva al bloque de
// contacto del propio masthead (#contact-block), donde la persona elige
// ella misma el canal (email, teléfono si lo revela...) en vez de que se lo
// impongamos aquí.
// ==========================================================================
const createServiceRow = (service, index) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  // <button>, no <a>: no navega a ningún sitio, abre el modal de contacto
  // (ver openContactModal/initContactModal) — .index-link ya trae los
  // resets necesarios para que un botón se vea igual que el enlace normal.
  const link = document.createElement("button");
  link.type = "button";
  link.className = "index-link";
  link.addEventListener("click", () => openContactModal(link));

  const number = document.createElement("span");
  number.className = "row-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const body = document.createElement("span");
  body.className = "row-body";

  const head = document.createElement("span");
  head.className = "row-head";

  const name = document.createElement("span");
  name.className = "row-name";
  name.textContent = service.name;
  head.appendChild(name);

  body.appendChild(head);

  if (service.description) {
    const desc = document.createElement("span");
    desc.className = "row-desc";
    desc.textContent = service.description;
    body.appendChild(desc);
  }

  const cta = document.createElement("span");
  cta.className = "row-url";
  cta.textContent = "¿Hablamos? →";

  link.appendChild(number);
  link.appendChild(body);
  link.appendChild(cta);
  row.appendChild(link);

  return row;
};

// Mismo criterio que sortUnitsByOrder pero simplificado (sin repartir huecos
// entre "order" y sin-"order" intercalados): aquí solo hace falta un orden
// estable, no reproducir esa lógica exacta.
const sortServicesByOrder = (services) => {
  return services
    .map((service, index) => ({ service, index }))
    .sort((a, b) => {
      const ao = a.service.order ?? Infinity;
      const bo = b.service.order ?? Infinity;
      return ao - bo || a.index - b.index;
    })
    .map(({ service }) => service);
};

const renderServices = (services) => {
  const container = document.getElementById("content-list");
  const emptyEl = document.getElementById("services-empty");
  if (!container) return;

  const validServices = (services || []).filter((service) => {
    const isValid = Boolean(service && service.name);
    if (!isValid) {
      console.warn("Kardex: se ha omitido un servicio de config.js por faltarle \"name\":", service);
    }
    return isValid;
  });

  const sorted = sortServicesByOrder(validServices);

  container.innerHTML = "";
  const rows = sorted.map((service, index) => {
    const row = createServiceRow(service, index);
    container.appendChild(row);
    return row;
  });

  if (emptyEl) emptyEl.hidden = sorted.length > 0;

  animateRowsIn(rows);
};

/**
 * "Verificación humana" del teléfono — nombre honesto de lo que es:
 * un filtro básico, NO una verificación real. El número no se escribe en
 * el HTML hasta que alguien hace clic, así que un scraper que solo lee el
 * texto visible de la página no se lo lleva gratis. Esto NO protege contra
 * alguien que pida directamente /config.js (ahí el número sigue en texto
 * plano) — una verificación real necesitaría un backend/CAPTCHA, que este
 * sitio estático no tiene. Se documenta así de claro para no prometer más
 * seguridad de la que esto da.
 *
 * "ids" permite reutilizar la misma lógica en dos sitios (el bloque de
 * contacto del masthead y su versión ampliada del modal, ver
 * initContactModal) sin duplicar el manejador de clic.
 */
const initPhoneReveal = (config, ids = {}) => {
  const revealBtn = document.getElementById(ids.revealBtn || "phone-reveal-btn");
  const note = document.getElementById(ids.note || "phone-gate-note");
  const phoneLink = document.getElementById(ids.phoneLink || "phone-link");
  const phone = config.contactPhone;

  if (!revealBtn || !phoneLink || !phone) return;

  revealBtn.addEventListener("click", () => {
    phoneLink.textContent = phone;
    phoneLink.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
    phoneLink.hidden = false;
    revealBtn.hidden = true;
    if (note) note.hidden = true;
    phoneLink.focus();
  });
};

/**
 * Enlace directo a WhatsApp (wa.me), a partir del mismo
 * SITE_CONFIG.contactPhone que usa initPhoneReveal — un único número que
 * alimenta tanto el "mostrar teléfono" como este botón, en vez de pedir un
 * campo de config aparte. wa.me solo necesita los dígitos con el prefijo
 * de país, sin "+" ni espacios (contactPhone ya lo lleva, ej. "+34 600 000
 * 000" → "34600000000"). A diferencia del teléfono, aquí no tiene sentido
 * "ocultarlo hasta el clic": el número ya va en el propio href en cuanto
 * se pinta la vista de servicios (ver initViewSwitcher), así que no
 * aporta ninguna protección extra retrasar el href unos milisegundos más.
 */
const initWhatsApp = (config, ids = {}) => {
  const link = document.getElementById(ids.link || "whatsapp-link");
  const phone = config.contactPhone;
  if (!link || !phone) return;

  const digits = phone.replace(/\D/g, "");
  link.href = `https://wa.me/${digits}`;
};

// ==========================================================================
// TRANSICIÓN ENTRE VISTA DE ÍNDICE Y VISTA DE SERVICIOS
// El panel del masthead sale por la izquierda y vuelve a entrar por la
// derecha, colocándose al otro lado del grid; la lista de contenido hace el
// movimiento espejo (sale por la derecha, entra por la izquierda) mientras
// cambia sus datos — así los dos paneles parecen "orbitar" y cruzarse en
// vez de simplemente sustituirse. En pantallas estrechas (una sola columna)
// no hay "otro lado" al que ir, así que el swap de orden queda desactivado
// por CSS y solo se ve el movimiento/cambio de contenido.
// ==========================================================================
const VIEW_TRANSITION_MS = 420;

let currentView = "index";
let viewIsAnimating = false;

const initViewSwitcher = (config) => {
  const page = document.querySelector(".page");
  const masthead = document.querySelector(".masthead");
  const main = document.getElementById("index");
  const kickerText = document.getElementById("kicker-text");
  const serviceExtra = document.getElementById("masthead-service-extra");
  const phoneRevealBtn = document.getElementById("phone-reveal-btn");
  const phoneGateNote = document.getElementById("phone-gate-note");
  const whatsappLink = document.getElementById("whatsapp-link");
  const phoneLink = document.getElementById("phone-link");
  const serviceLocation = document.getElementById("service-location");
  const locationText = document.getElementById("location-text");
  const backLink = document.getElementById("back-to-index-link");
  const contentTitle = document.getElementById("content-title");
  const servicesIntro = document.getElementById("services-intro");
  const servicesHighlights = document.getElementById("services-highlights");

  if (!page || !masthead || !main || !contentTitle) return;

  // Si en algún momento de esta visita se ha visto el índice, el botón de
  // servicios dice "Volver al índice" (de verdad se vuelve a algún sitio).
  // Si se ha llegado directo a "/servicios" (por ejemplo, alguien comparte
  // tu-dominio.example/servicios), todavía no se "volvió" de ninguna
  // parte, así que dice solo "Índice" — mismo botón, mismo destino, texto
  // honesto según de dónde viene cada visita.
  let hasShownIndexView = false;

  // Pinta el contenido de la vista dada (texto del masthead + lista) sin
  // animar nada — se usa tanto al cargar la página (según el hash de la
  // URL) como en el instante en que los paneles están fuera de pantalla
  // durante la transición.
  const paintView = (view) => {
    const isServices = view === "services";

    if (!isServices) {
      hasShownIndexView = true;
    } else if (backLink) {
      backLink.textContent = hasShownIndexView ? "← Volver al índice" : "← Índice";
    }

    kickerText.textContent = isServices ? "SERVICIOS" : "ÍNDICE PERSONAL";
    if (serviceExtra) serviceExtra.hidden = !isServices;

    // El teléfono (y WhatsApp, que sale del mismo número) solo tienen
    // sentido en la vista de servicios; si el teléfono ya se había
    // revelado y se vuelve al índice, se oculta otra vez (no hay razón
    // para dejarlo pintado fuera de contexto).
    const showPhoneActions = isServices && Boolean(config.contactPhone);
    if (phoneRevealBtn) phoneRevealBtn.hidden = !showPhoneActions;
    if (phoneGateNote) phoneGateNote.hidden = !showPhoneActions;
    if (whatsappLink) whatsappLink.hidden = !showPhoneActions;
    if (phoneLink) phoneLink.hidden = true;

    // La ubicación solo se muestra en la vista de servicios y solo si hay
    // algo configurado (SITE_CONFIG.location).
    if (serviceLocation) serviceLocation.hidden = !isServices || !config.location;
    if (isServices && locationText && config.location) {
      locationText.textContent = config.location;
    }

    contentTitle.textContent = isServices ? "SERVICIOS" : "PROYECTOS Y ENLACES";
    main.setAttribute("aria-label", isServices ? "Servicios" : "Proyectos y enlaces");
    if (servicesIntro) servicesIntro.hidden = !isServices;
    if (servicesHighlights) servicesHighlights.hidden = !isServices;

    document.title = isServices
      ? (config.operatorName ? `Servicios — ${config.operatorName}` : "Servicios")
      : (config.pageTitle || `${config.operatorName} — Índice`);

    if (isServices) {
      renderServices(typeof SERVICES !== "undefined" ? SERVICES : []);
    } else {
      renderUnits(UNITS);
    }

    // La lista es su propio contenedor con scroll (ver .index-scroll en
    // style.css) — al cambiar de vista se rellena con datos distintos
    // (SERVICES/UNITS), pero el desplazamiento no se resetea solo; sin
    // esto, si venías con scroll bajado en un panel, el otro podía
    // arrancar ya desplazado (a veces mostrando solo un hueco en blanco).
    const scrollArea = document.getElementById("index-scroll");
    if (scrollArea) scrollArea.scrollTop = 0;
  };

  // Rutas reales (no un hash): el sitio se sirve siempre desde la raíz del
  // dominio (ver siteUrl en config.js y nginx.conf), así que "/" es siempre
  // el índice y "/servicios" es siempre la vista de servicios.
  const INDEX_PATH = "/";

  const setPath = (view) => {
    history.pushState(null, "", view === "services" ? SERVICES_VIEW_URL : INDEX_PATH);
  };

  const isServicesPath = () =>
    location.pathname === SERVICES_VIEW_URL || location.pathname === `${SERVICES_VIEW_URL}/`;

  const goTo = (view, { animate = true, updateHash = true } = {}) => {
    if (view === currentView || viewIsAnimating) return;

    if (updateHash) setPath(view);

    if (animate && !prefersReducedMotion()) {
      viewIsAnimating = true;

      // 1) Ambos paneles salen de pantalla: el masthead por la izquierda,
      //    la lista por la derecha.
      masthead.classList.add("panel-slide-left");
      main.classList.add("panel-slide-right");

      setTimeout(() => {
        // 2) Fuera de la vista, se cambia de columna (order, solo aplica
        //    en el layout de dos columnas) y se pinta el contenido nuevo.
        page.classList.toggle("page--services", view === "services");
        paintView(view);

        // 3) Sin transición, se recolocan en el lado opuesto (todavía
        //    fuera de pantalla) para animar la entrada desde ahí.
        masthead.classList.add("no-transition");
        main.classList.add("no-transition");
        masthead.classList.remove("panel-slide-left");
        masthead.classList.add("panel-slide-right");
        main.classList.remove("panel-slide-right");
        main.classList.add("panel-slide-left");

        // Fuerza reflow para que el navegador aplique la posición de
        // salto antes de reactivar la transición.
        void masthead.offsetWidth;

        masthead.classList.remove("no-transition");
        main.classList.remove("no-transition");

        // 4) Entrada: el masthead vuelve desde la derecha, la lista desde
        //    la izquierda, ambos hasta su posición natural (translateX(0)).
        requestAnimationFrame(() => {
          masthead.classList.remove("panel-slide-right");
          main.classList.remove("panel-slide-left");
        });

        setTimeout(() => {
          viewIsAnimating = false;
          currentView = view;
          contentTitle.focus();
        }, VIEW_TRANSITION_MS);
      }, VIEW_TRANSITION_MS);
    } else {
      page.classList.toggle("page--services", view === "services");
      paintView(view);
      currentView = view;
    }
  };

  goToServicesView = () => goTo("services");
  goToIndexView = () => goTo("index");

  if (backLink) {
    backLink.addEventListener("click", (event) => {
      event.preventDefault();
      goToIndexView();
    });
  }

  window.addEventListener("popstate", () => {
    const view = isServicesPath() ? "services" : "index";
    goTo(view, { updateHash: false });
  });

  // Vista inicial según la ruta de la URL (enlace compartido a /servicios),
  // sin animación — la animación es solo para cuando cambia mientras se
  // está viendo la página.
  const initialView = isServicesPath() ? "services" : "index";
  page.classList.toggle("page--services", initialView === "services");
  paintView(initialView);
  currentView = initialView;
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
// "ids" permite reutilizar esta misma lógica en el bloque de contacto del
// masthead y en su versión ampliada del modal (ver initContactModal) sin
// duplicar el manejador de copiar al portapapeles.
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
// MODAL DE CONTACTO
// Se abre al pulsar cualquier fila de la vista de servicios (ver
// createServiceRow) — una versión más grande y centrada del bloque de
// contacto del masthead, con sus propios elementos (wireados por separado
// con initContactManager/initPhoneReveal/initWhatsApp de arriba, pasándoles
// los ids del modal, para no duplicar lógica).
// ==========================================================================
const initContactModal = (config) => {
  const backdrop = document.getElementById("contact-modal-backdrop");
  const modal = document.getElementById("contact-modal");
  const closeBtn = document.getElementById("contact-modal-close");
  const phoneRevealBtn = document.getElementById("modal-phone-reveal-btn");
  const phoneGateNote = document.getElementById("modal-phone-gate-note");
  const whatsappLink = document.getElementById("modal-whatsapp-link");
  const phoneLink = document.getElementById("modal-phone-link");

  if (!backdrop || !modal || !closeBtn) return;

  let lastFocused = null;

  const close = () => {
    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  };

  const open = (triggerEl) => {
    lastFocused = triggerEl instanceof HTMLElement ? triggerEl : document.activeElement;

    // Cada vez que se abre se resetea el teléfono a "sin revelar" — igual
    // que al cambiar de vista en el masthead, no tiene sentido dejarlo
    // pintado de una apertura anterior. WhatsApp no se "revela", solo
    // depende de si hay número configurado.
    const hasPhone = Boolean(config.contactPhone);
    if (phoneRevealBtn) phoneRevealBtn.hidden = !hasPhone;
    if (phoneGateNote) phoneGateNote.hidden = !hasPhone;
    if (whatsappLink) whatsappLink.hidden = !hasPhone;
    if (phoneLink) phoneLink.hidden = true;

    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    closeBtn.focus();
  };

  closeBtn.addEventListener("click", close);

  // Clic en el fondo oscurecido (no en la tarjeta) cierra el modal.
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !backdrop.hidden) close();
  });

  // Trampa de foco sencilla: con el modal abierto, Tab/Shift+Tab en sus
  // extremos da la vuelta en vez de escapar hacia el resto de la página.
  modal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = modal.querySelectorAll("button:not([hidden]), a[href]:not([hidden])");
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  openContactModal = open;
};

// ==========================================================================
// [Página estática] BLOQUEO REAL DE FILAS TAPADAS
// A partir de 860px la lista de enlaces/servicios es la ÚNICA parte de la
// página con scroll (ver .index-scroll en style.css) — la entradilla y el
// título de arriba no se mueven nunca. En cuanto una fila queda aunque
// sea mínimamente detrás de la zona de desvanecido de arriba, deja de
// poder pulsarse DE VERDAD (pointer-events, no solo queda tapada
// visualmente) y sale del orden de tabulación con teclado. En móvil
// (menos de 860px) toda la página se desplaza normal y esto no aplica.
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
      // Igual arriba que abajo: en cuanto un borde de la fila entra en la
      // zona de desvanecido (aunque sea un mínimo), deja de poder pulsarse.
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

  // renderUnits/renderServices sustituyen el contenido de #content-list en
  // cada cambio de vista — hay que recalcular qué queda tapado cada vez.
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
  initPhoneReveal(SITE_CONFIG);
  initContactManager(SITE_CONFIG, {
    emailLink: "modal-contact-email-link",
    emailText: "modal-contact-email-text",
    copyBtn: "modal-copy-email-btn",
    copyBtnText: "modal-copy-btn-text",
    copyStatus: "modal-copy-status",
  });
  initPhoneReveal(SITE_CONFIG, {
    revealBtn: "modal-phone-reveal-btn",
    note: "modal-phone-gate-note",
    phoneLink: "modal-phone-link",
  });
  initWhatsApp(SITE_CONFIG);
  initWhatsApp(SITE_CONFIG, { link: "modal-whatsapp-link" });
  initContactModal(SITE_CONFIG);
  // Pinta la vista inicial (índice o servicios, según la URL) y deja
  // preparada la transición entre ambas — sustituye a la llamada directa a
  // renderUnits(UNITS), que ahora depende de qué vista toque pintar.
  initViewSwitcher(SITE_CONFIG);
  initListFadeGuard();
});
