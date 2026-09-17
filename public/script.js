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

// Usado por createServiceRow para darle a cada servicio un ancla propia
// (#servicio-slug) sin depender de que "slug" esté en config.js — quita
// tildes/diacríticos (NFD + strip de marcas combinantes) y deja solo
// minúsculas/números separados por guiones.
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

// Compartido por initContactManager (correo) e initPhoneCopy (teléfono):
// copia "text" al portapapeles, con navigator.clipboard si está disponible
// y si no un <input> temporal + document.execCommand (Safari viejo, HTTP
// sin TLS...). Devuelve true/false en vez de lanzar, para que quien lo
// llama decida qué feedback mostrar.
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const tempInput = document.createElement("input");
    tempInput.value = text;
    tempInput.setAttribute("aria-hidden", "true");
    tempInput.style.position = "fixed";
    tempInput.style.opacity = "0";
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    return true;
  } catch (err) {
    console.error("Error al copiar al portapapeles:", err);
    return false;
  }
};

// Qué partes del sitio están activas (ver SITE_CONFIG.sections en
// config.js). Si se omite por completo, o si alguien pusiera las dos en
// false a la vez, se usa el índice de proyectos solo — el valor más
// simple y seguro por defecto.
const resolveSections = (config) => {
  const raw = (config && config.sections) || {};
  const portfolio = raw.portfolio !== false;
  const services = raw.services === true;
  if (!portfolio && !services) {
    console.warn(
      'Kardex: SITE_CONFIG.sections tiene "portfolio" y "services" desactivados a la vez; se usa el índice de proyectos por defecto.'
    );
    return { portfolio: true, services: false };
  }
  return { portfolio, services };
};

const SECTIONS = resolveSections(SITE_CONFIG);

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
// index.html en esa ruta (ver el comentario en nginx.conf). Solo se activa
// si SITE_CONFIG.sections.services está encendido; si no, se trata como un
// enlace normal (y esa ruta no existirá, dará 404).
const SERVICES_VIEW_URL = "/servicios";

// Rellenadas más abajo (initViewSwitcher e initContactModal, cada una en
// su sección). Declaradas aquí arriba porque createUnitRow/createServiceRow
// ya necesitan poder llamarlas antes de que esos bloques existan en el
// archivo.
let goToServicesView = () => {};
let goToIndexView = () => {};
let openContactModal = () => {};

// slug → service, reconstruida en cada renderServices() (ver createServiceRow)
// — se usa para encontrar la fila si la URL ya trae "#servicio-slug" al
// cargar (ver el final de renderServices).
let serviceBySlug = new Map();

const createUnitRow = (unit, index) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  const isServicesTrigger = SECTIONS.services && unit.url === SERVICES_VIEW_URL;

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
// renderServices en el momento justo) — o, si SITE_CONFIG.sections.portfolio
// está desactivado, es directamente la portada del sitio (ver
// applyServicesContent). Se apoya en SERVICES (config.js) y reutiliza la
// lista/fila del índice de proyectos (.index-row, .row-*).
//
// "priceRange" es opcional (igual que en UNITS/createUnitRow) — sin él,
// la tarjeta queda como un ejemplo orientativo sin precio; con él, se
// muestra junto al nombre con el mismo .row-price de siempre.
//
// El nombre de cada servicio es un <h2> con un <a href="#servicio-slug">
// propio (permalink real, con su "id" en el propio <h2>) — así cada
// servicio es una entidad direccionable/indexable por separado, no solo
// una fila más de una página única (ver guía de SEO estructural).
//
// Toda la caja (".index-link") es clicable para desplegar el servicio:
// dentro aparecen "details" (el contenido largo, aparte de
// "description" — si el servicio lo tiene) Y el botón "¿Hablamos?", que
// solo vive ahí, no en la fila cerrada — entrar al detalle es lo que
// habilita poder escribir, no algo que esté siempre a la vista. Su
// propio "stopPropagation" evita que un clic en el botón vuelva a
// plegar la fila a la vez; abre el modal de contacto de siempre (ver
// openContactModal/initContactModal).
// "slug" es opcional: si no se indica, sale de service.name (slugify);
// "usedSlugs" evita ids duplicados si dos servicios generan el mismo slug;
// "slugMap", si se pasa, guarda slug → service para que renderServices
// pueda desplegar la fila correcta si la URL ya trae "#servicio-slug".
// ==========================================================================
const createServiceRow = (service, index, usedSlugs, slugMap) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  let slug = service.slug || slugify(service.name) || `servicio-${index + 1}`;
  if (usedSlugs) {
    let unique = slug;
    let n = 2;
    while (usedSlugs.has(unique)) {
      unique = `${slug}-${n}`;
      n++;
    }
    usedSlugs.add(unique);
    slug = unique;
  }
  const anchorId = `servicio-${slug}`;
  if (slugMap) slugMap.set(slug, service);

  const wrap = document.createElement("div");
  wrap.className = "index-link";

  const number = document.createElement("span");
  number.className = "row-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const body = document.createElement("span");
  body.className = "row-body";

  const head = document.createElement("h2");
  head.className = "row-head";
  head.id = anchorId;

  const name = document.createElement("a");
  name.className = "row-name";
  name.href = `#${anchorId}`;
  name.textContent = service.name;
  head.appendChild(name);

  if (service.priceRange) {
    const price = document.createElement("span");
    price.className = "row-price";
    price.textContent = service.priceRange;
    head.appendChild(price);
  }

  body.appendChild(head);

  if (service.description) {
    const desc = document.createElement("span");
    desc.className = "row-desc";
    desc.textContent = service.description;
    body.appendChild(desc);
  }

  // "details" es opcional y aparte de "description": la corta se ve
  // siempre, la larga (si existe) y "¿Hablamos?" solo al desplegar la
  // fila — por eso viven juntos dentro de ".row-expand", no la una fuera
  // y el otro dentro.
  const expand = document.createElement("div");
  expand.className = "row-expand";

  const inner = document.createElement("div");
  inner.className = "row-expand-inner";
  if (service.details) {
    service.details.split(/\n{2,}/).forEach((paragraph) => {
      if (!paragraph.trim()) return;
      const p = document.createElement("p");
      p.className = "row-desc";
      p.textContent = paragraph.trim();
      inner.appendChild(p);
    });
  }

  const cta = document.createElement("button");
  cta.type = "button";
  cta.className = "row-url row-hablamos";
  cta.textContent = "¿Hablamos? →";
  cta.addEventListener("click", (event) => {
    event.stopPropagation();
    openContactModal(cta);
  });
  inner.appendChild(cta);

  expand.appendChild(inner);
  body.appendChild(expand);

  wrap.classList.add("index-link--expandable");
  wrap.addEventListener("click", () => {
    expand.classList.toggle("is-open");
  });

  wrap.appendChild(number);
  wrap.appendChild(body);
  row.appendChild(wrap);

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
  const usedSlugs = new Set();
  serviceBySlug = new Map();
  const rows = sorted.map((service, index) => {
    const row = createServiceRow(service, index, usedSlugs, serviceBySlug);
    container.appendChild(row);
    return row;
  });

  if (emptyEl) emptyEl.hidden = sorted.length > 0;

  animateRowsIn(rows);

  // Enlace compartido directo a "#servicio-slug": despliega esa fila ya
  // abierta y la deja centrada en pantalla, en vez de dejar que el
  // navegador haga su salto nativo (que aquí, con las filas recién
  // insertadas y aún animándose, puede acabar en cualquier sitio).
  const initialSlug = location.hash.startsWith("#servicio-") ? location.hash.slice(10) : null;
  if (initialSlug && serviceBySlug.has(initialSlug)) {
    const heading = document.getElementById(`servicio-${initialSlug}`);
    const targetRow = heading && heading.closest(".index-row");
    const expand = targetRow && targetRow.querySelector(".row-expand");
    if (expand) expand.classList.add("is-open");
    if (targetRow) targetRow.scrollIntoView({ block: "center" });
  }
};

/**
 * El teléfono se muestra en claro (sin "revelar" previo) y el clic lo
 * copia al portapapeles en vez de abrir el marcador — es un <button>, no
 * un enlace "tel:". Misma mecánica que initContactManager para el
 * correo, con su propio texto de estado.
 *
 * "ids" permite reutilizar la misma lógica en dos sitios (el bloque de
 * contacto del masthead y su versión ampliada del modal, ver
 * initContactModal) sin duplicar el manejador de clic.
 */
const initPhoneCopy = (config, ids = {}) => {
  const phoneLink = document.getElementById(ids.phoneLink || "phone-link");
  const phoneText = document.getElementById(ids.phoneText || "phone-text");
  const copyStatus = document.getElementById(ids.copyStatus || "copy-status");
  const phone = config.contactPhone;

  if (phoneText && phone) phoneText.textContent = phone;

  if (!phoneLink || !phoneText || !phone) return;

  phoneLink.addEventListener("click", async () => {
    const ok = await copyToClipboard(phone);
    if (!ok) {
      if (copyStatus) copyStatus.textContent = "No se pudo copiar el teléfono.";
      return;
    }

    phoneLink.classList.add("copied");
    if (copyStatus) copyStatus.textContent = "Teléfono copiado al portapapeles.";
    phoneText.textContent = "¡Copiado!";

    setTimeout(() => {
      phoneLink.classList.remove("copied");
      phoneText.textContent = phone;
    }, 1600);
  });
};

/**
 * Enlace directo a WhatsApp (wa.me), a partir del mismo
 * SITE_CONFIG.contactPhone que usa initPhoneCopy — un único número que
 * alimenta tanto el teléfono en claro como este botón, en vez de pedir un
 * campo de config aparte. wa.me solo necesita los dígitos con el prefijo
 * de país, sin "+" ni espacios (contactPhone ya lo lleva, ej. "+34 600 000
 * 000" → "34600000000").
 */
const initWhatsApp = (config, ids = {}) => {
  const link = document.getElementById(ids.link || "whatsapp-link");
  const phone = config.contactPhone;
  if (!link || !phone) return;

  const digits = phone.replace(/\D/g, "");
  link.href = `https://wa.me/${digits}`;
};

// Set fijo de iconos entre los que elegir por nombre desde
// SITE_CONFIG.servicesHighlights (ver config.example.js) — no admite SVG
// libre, así que un valor desconocido cae en "check" en vez de romper el
// render.
const SERVICE_HIGHLIGHT_ICONS = {
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

// Pinta los "puntos a favor" de la vista de servicios desde
// SITE_CONFIG.servicesHighlights — sustituye a lo que antes eran 4
// tarjetas fijas en el HTML.
const renderServiceHighlights = (highlights) => {
  const container = document.getElementById("services-highlights");
  if (!container) return;

  container.innerHTML = "";

  (highlights || []).forEach((item) => {
    if (!item || !item.label) return;
    const pathD = SERVICE_HIGHLIGHT_ICONS[item.icon] || SERVICE_HIGHLIGHT_ICONS.check;

    const wrap = document.createElement("div");
    wrap.className = "service-highlight";

    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    wrap.appendChild(svg);

    const text = document.createElement("div");
    text.className = "service-highlight-text";

    const label = document.createElement("span");
    label.className = "service-highlight-label";
    label.textContent = item.label;
    text.appendChild(label);

    if (item.desc) {
      const desc = document.createElement("span");
      desc.className = "service-highlight-desc";
      desc.textContent = item.desc;
      text.appendChild(desc);
    }

    wrap.appendChild(text);
    container.appendChild(wrap);
  });
};

// Pinta el contenido de servicios (texto del masthead + lista) en el DOM
// compartido con el índice. La usan tanto initViewSwitcher (cuando las dos
// secciones están activas) como la inicialización directa cuando servicios
// es la única sección activa (ver DOMContentLoaded más abajo) — así no se
// duplica la lógica entre ambos casos.
const applyServicesContent = (config) => {
  const kickerText = document.getElementById("kicker-text");
  const contentTitle = document.getElementById("content-title");
  const main = document.getElementById("index");
  const whatsappLink = document.getElementById("whatsapp-link");
  const phoneLink = document.getElementById("phone-link");
  const serviceLocation = document.getElementById("service-location");
  const locationText = document.getElementById("location-text");
  const servicesIntro = document.getElementById("services-intro");
  const servicesHighlights = document.getElementById("services-highlights");

  if (kickerText) kickerText.textContent = "SERVICIOS";

  const hasPhone = Boolean(config.contactPhone);
  if (phoneLink) phoneLink.hidden = !hasPhone;
  if (whatsappLink) whatsappLink.hidden = !hasPhone;

  if (serviceLocation) serviceLocation.hidden = !config.location;
  if (locationText && config.location) locationText.textContent = config.location;

  if (contentTitle) contentTitle.textContent = "SERVICIOS";
  if (main) main.setAttribute("aria-label", "Servicios");
  if (servicesIntro) servicesIntro.hidden = false;
  if (servicesHighlights) {
    servicesHighlights.hidden = false;
    renderServiceHighlights(config.servicesHighlights);
  }

  document.title = config.operatorName ? `Servicios — ${config.operatorName}` : "Servicios";

  renderServices(typeof SERVICES !== "undefined" ? SERVICES : []);

  const scrollArea = document.getElementById("index-scroll");
  if (scrollArea) scrollArea.scrollTop = 0;
};

// ==========================================================================
// TRANSICIÓN ENTRE VISTA DE ÍNDICE Y VISTA DE SERVICIOS
// Solo se usa cuando SITE_CONFIG.sections tiene "portfolio" Y "services"
// activos a la vez (ver DOMContentLoaded). El panel del masthead sale por
// la izquierda y vuelve a entrar por la derecha, colocándose al otro lado
// del grid; la lista de contenido hace el movimiento espejo (sale por la
// derecha, entra por la izquierda) mientras cambia sus datos — así los dos
// paneles parecen "orbitar" y cruzarse en vez de simplemente sustituirse.
// En pantallas estrechas (una sola columna) no hay "otro lado" al que ir,
// así que el swap de orden queda desactivado por CSS y solo se ve el
// movimiento/cambio de contenido.
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
  const whatsappLink = document.getElementById("whatsapp-link");
  const phoneLink = document.getElementById("phone-link");
  const serviceLocation = document.getElementById("service-location");
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
  // animar nada — se usa tanto al cargar la página (según la ruta de la
  // URL) como en el instante en que los paneles están fuera de pantalla
  // durante la transición.
  const paintView = (view) => {
    const isServices = view === "services";

    if (!isServices) {
      hasShownIndexView = true;
    } else if (backLink) {
      backLink.textContent = hasShownIndexView ? "← Volver al índice" : "← Índice";
    }

    if (serviceExtra) serviceExtra.hidden = !isServices;

    if (isServices) {
      applyServicesContent(config);
    } else {
      if (kickerText) kickerText.textContent = "ÍNDICE PERSONAL";
      if (phoneLink) phoneLink.hidden = true;
      if (whatsappLink) whatsappLink.hidden = true;
      if (serviceLocation) serviceLocation.hidden = true;
      contentTitle.textContent = "PROYECTOS Y ENLACES";
      main.setAttribute("aria-label", "Proyectos y enlaces");
      if (servicesIntro) servicesIntro.hidden = true;
      if (servicesHighlights) servicesHighlights.hidden = true;
      document.title = config.pageTitle || `${config.operatorName} — Índice`;
      renderUnits(UNITS);

      const scrollArea = document.getElementById("index-scroll");
      if (scrollArea) scrollArea.scrollTop = 0;
    }
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
// Compartido por renderIdentity y initQrPage: pinta "role" en "el" partido
// por "//" con un <span class="sep"> entre trozos, en vez de un textContent
// plano — así ambos sitios muestran el rol exactamente igual.
const fillRoleParts = (el, role) => {
  el.innerHTML = "";
  role.split("//").forEach((part, index, arr) => {
    el.appendChild(document.createTextNode(part.trim()));
    if (index < arr.length - 1) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "//";
      el.appendChild(document.createTextNode(" "));
      el.appendChild(sep);
      el.appendChild(document.createTextNode(" "));
    }
  });
};

const renderIdentity = (config) => {
  document.title = config.pageTitle || `${config.operatorName} — Índice`;

  const nameEl = document.getElementById("operator-name");
  if (nameEl && config.operatorName) {
    nameEl.textContent = config.operatorName;
  }

  const roleEl = document.getElementById("operator-subtitle");
  if (roleEl && config.operatorRole) {
    fillRoleParts(roleEl, config.operatorRole);
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
// TARJETA "/qr" Y "/servicios/qr"
// Pensada para enseñar la pantalla (a alguien en persona, en una tarjeta
// física...) — nombre, rol y un QR grande al propio sitio. "/qr" es
// siempre la sección "de arriba" (índice si las dos secciones están
// activas, o la única activa si solo hay una); "/servicios/qr" solo tiene
// sentido cuando las dos coexisten, igual que "/servicios" mismo — por
// eso exige SECTIONS.services además de comprobar la ruta.
//
// El generador de QR (qrcode.js, de kazuhikoarase, MIT) NO se carga en el
// resto del sitio — solo aquí, y solo si la ruta coincide — para no
// añadir peso a las páginas normales por una función que casi nadie usa.
// ==========================================================================
const QR_VIEW_URL = "/qr";
const SERVICES_QR_VIEW_URL = "/servicios/qr";

const buildQrSvg = (qr, text) => {
  const count = qr.getModuleCount();
  const cell = 4;
  const margin = cell * 2;
  const size = count * cell + margin * 2;

  let modules = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        modules += `<rect x="${col * cell + margin}" y="${row * cell + margin}" width="${cell}" height="${cell}"/>`;
      }
    }
  }

  // Siempre negro sobre blanco, sin importar el tema (aunque esté en
  // modo oscuro) — invertir los colores según --bg/--text daría un QR de
  // claro-sobre-oscuro que muchos lectores no reconocen igual de bien;
  // un QR tiene que funcionar aunque el resto de la tarjeta no combine.
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Código QR con el enlace ${text}">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<g fill="#000">${modules}</g></svg>`;
};

const initQrPage = (config) => {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const isServicesQr = SECTIONS.services && path === SERVICES_QR_VIEW_URL;
  const isTopQr = path === QR_VIEW_URL;

  if (!isServicesQr && !isTopQr) return false;

  const kind = isServicesQr || (SECTIONS.services && !SECTIONS.portfolio) ? "services" : "portfolio";
  const name = (kind === "services" ? config.qrServicesName : config.qrPortfolioName) || config.operatorName;
  const kicker = kind === "services" ? "SERVICIOS" : "ÍNDICE PERSONAL";
  const targetPath = kind === "services" && SECTIONS.portfolio ? "/servicios" : "/";
  const qrUrl = new URL(targetPath, config.siteUrl).toString();

  document.title = `QR — ${name}`;

  const page = document.querySelector(".page");
  const watermark = document.getElementById("watermark-footer");
  const qrPage = document.getElementById("qr-page");
  if (page) page.hidden = true;
  if (watermark) watermark.hidden = true;
  if (!qrPage) return true;
  qrPage.hidden = false;

  const kickerEl = document.getElementById("qr-kicker-text");
  if (kickerEl) kickerEl.textContent = kicker;

  const nameEl = document.getElementById("qr-name");
  if (nameEl) nameEl.textContent = name;

  const roleEl = document.getElementById("qr-role");
  if (roleEl && config.operatorRole) fillRoleParts(roleEl, config.operatorRole);

  const backLink = document.getElementById("qr-back-link");
  if (backLink) backLink.href = targetPath;

  const qrCodeEl = document.getElementById("qr-code");
  if (qrCodeEl) {
    const script = document.createElement("script");
    script.src = "qrcode.js";
    script.onload = () => {
      const qr = qrcode(0, "M");
      qr.addData(qrUrl);
      qr.make();
      qrCodeEl.innerHTML = buildQrSvg(qr, qrUrl);
    };
    document.body.appendChild(script);
  }

  return true;
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
//
// El clic copia el correo al portapapeles. Es un <button>, no un enlace
// "mailto:" — no abre el cliente de correo, solo texto para copiar.
const initContactManager = (config, ids = {}) => {
  const emailLink = document.getElementById(ids.emailLink || "contact-email-link");
  const emailText = document.getElementById(ids.emailText || "contact-email-text");
  const copyStatus = document.getElementById(ids.copyStatus || "copy-status");
  const email = config.contactEmail;

  if (emailText && email) emailText.textContent = email;

  if (!emailLink || !emailText || !email) return;

  emailLink.addEventListener("click", async () => {
    const ok = await copyToClipboard(email);
    if (!ok) {
      if (copyStatus) copyStatus.textContent = "No se pudo copiar el correo.";
      return;
    }

    emailLink.classList.add("copied");
    if (copyStatus) copyStatus.textContent = "Correo copiado al portapapeles.";
    emailText.textContent = "¡Copiado!";

    setTimeout(() => {
      emailLink.classList.remove("copied");
      emailText.textContent = email;
    }, 1600);
  });
};

// ==========================================================================
// MODAL DE CONTACTO
// Se abre al pulsar cualquier fila de la vista de servicios (ver
// createServiceRow) — una versión más grande y centrada del bloque de
// contacto del masthead, con sus propios elementos (wireados por separado
// con initContactManager/initPhoneCopy/initWhatsApp de arriba, pasándoles
// los ids del modal, para no duplicar lógica).
// ==========================================================================
const initContactModal = (config) => {
  const backdrop = document.getElementById("contact-modal-backdrop");
  const modal = document.getElementById("contact-modal");
  const closeBtn = document.getElementById("contact-modal-close");
  const whatsappLink = document.getElementById("modal-whatsapp-link");
  const phoneLink = document.getElementById("modal-phone-link");
  const phoneText = document.getElementById("modal-phone-text");

  if (!backdrop || !modal || !closeBtn) return;

  let lastFocused = null;

  const close = () => {
    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  };

  const open = (triggerEl) => {
    lastFocused = triggerEl instanceof HTMLElement ? triggerEl : document.activeElement;

    // Cada vez que se abre se resetea el estado "copiado" del teléfono —
    // igual que al cambiar de vista en el masthead, no tiene sentido
    // dejarlo pintado de una apertura anterior. WhatsApp solo depende de
    // si hay número configurado.
    const hasPhone = Boolean(config.contactPhone);
    if (phoneLink) {
      phoneLink.hidden = !hasPhone;
      phoneLink.classList.remove("copied");
    }
    if (phoneText && hasPhone) phoneText.textContent = config.contactPhone;
    if (whatsappLink) whatsappLink.hidden = !hasPhone;

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

  // "/qr" o "/servicios/qr": tarjeta aparte, no el índice/servicios de
  // siempre — corta aquí, no tiene sentido pintar el resto.
  if (initQrPage(SITE_CONFIG)) return;

  renderIdentity(SITE_CONFIG);
  initContactManager(SITE_CONFIG);

  if (SITE_CONFIG.showWatermark === false) {
    const watermark = document.getElementById("watermark-footer");
    if (watermark) watermark.remove();
  }

  if (SECTIONS.services) {
    initPhoneCopy(SITE_CONFIG);
    initContactManager(SITE_CONFIG, {
      emailLink: "modal-contact-email-link",
      emailText: "modal-contact-email-text",
      copyStatus: "modal-copy-status",
    });
    initPhoneCopy(SITE_CONFIG, {
      phoneLink: "modal-phone-link",
      phoneText: "modal-phone-text",
      copyStatus: "modal-copy-status",
    });
    initWhatsApp(SITE_CONFIG);
    initWhatsApp(SITE_CONFIG, { link: "modal-whatsapp-link" });
    initContactModal(SITE_CONFIG);

    if (SECTIONS.portfolio) {
      // Las dos secciones activas: pinta la vista inicial (índice o
      // servicios, según la URL) y deja preparada la transición entre
      // ambas.
      initViewSwitcher(SITE_CONFIG);
    } else {
      // Solo servicios: es la portada del sitio, sin switcher ni enlace
      // de "volver al índice" (no hay a qué volver).
      applyServicesContent(SITE_CONFIG);
    }
  } else {
    renderUnits(UNITS);
  }

  initListFadeGuard();
});
