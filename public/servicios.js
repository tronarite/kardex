/**
 * [BETA] Página de servicios (servicios.html) — función experimental, no
 * forma parte de main hasta que esté pulida.
 *
 * Se apoya en config.js (SITE_CONFIG, SERVICES) y en las utilidades ya
 * probadas de script.js (tema, copiar email), que se carga justo antes que
 * este archivo en servicios.html. renderIdentity/renderUnits de script.js
 * no hacen nada dañino aquí: buscan elementos que esta página no tiene
 * (#units-list) y no encuentran nada que romper, así que no hizo falta
 * duplicarlas.
 *
 * NOTA para cuando esto salga de beta: hay algo de solapamiento con
 * createUnitRow/sortUnitsByOrder de script.js (misma idea, sin el status
 * flag que aquí no aplica). Se ha dejado así a propósito mientras el
 * formato de la tarjeta de servicio todavía puede cambiar; si al pulirlo
 * queda igual, merece la pena unificarlas.
 */

const createServiceRow = (service, index, contactEmail) => {
  const row = document.createElement("li");
  row.className = "index-row animate-init";

  const link = document.createElement("a");
  link.className = "index-link";
  const subject = encodeURIComponent(`Consulta: ${service.name}`);
  link.href = contactEmail ? `mailto:${contactEmail}?subject=${subject}` : "#";

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

  const cta = document.createElement("span");
  cta.className = "row-url";
  cta.textContent = "Consultar por email →";

  link.appendChild(number);
  link.appendChild(body);
  link.appendChild(cta);
  row.appendChild(link);

  return row;
};

// Mismo criterio que sortUnitsByOrder en script.js pero simplificado (sin
// el reparto de huecos entre "order" y sin-"order" intercalados): aquí solo
// hace falta un orden estable, no reproducir esa lógica exacta.
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

const renderServices = (services, contactEmail) => {
  const container = document.getElementById("services-list");
  const emptyEl = document.getElementById("services-empty");
  if (!container) return;

  const validServices = (services || []).filter((service) => {
    const isValid = Boolean(service && service.name);
    if (!isValid) {
      console.warn("Kardex [beta]: se ha omitido un servicio de config.js por faltarle \"name\":", service);
    }
    return isValid;
  });

  const sorted = sortServicesByOrder(validServices);

  container.innerHTML = "";
  const rows = sorted.map((service, index) => {
    const row = createServiceRow(service, index, contactEmail);
    container.appendChild(row);
    return row;
  });

  if (emptyEl) emptyEl.hidden = sorted.length > 0;

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

/**
 * [BETA] "Verificación humana" del teléfono — nombre honesto de lo que es:
 * un filtro básico, NO una verificación real. El número no se escribe en
 * el HTML hasta que alguien hace clic, así que un scraper que solo lee el
 * texto visible de la página no se lo lleva gratis. Esto NO protege contra
 * alguien que pida directamente /config.js (ahí el número sigue en texto
 * plano) — una verificación real necesitaría un backend/CAPTCHA, que este
 * sitio estático no tiene. Se documenta así de claro para no prometer más
 * seguridad de la que esto da.
 */
const initPhoneReveal = (config) => {
  const gate = document.getElementById("phone-gate");
  const revealBtn = document.getElementById("phone-reveal-btn");
  const phoneLink = document.getElementById("phone-link");
  const phone = config.contactPhone;

  if (!gate || !revealBtn || !phoneLink) return;

  if (!phone) {
    gate.hidden = true;
    return;
  }

  revealBtn.addEventListener("click", () => {
    phoneLink.textContent = phone;
    phoneLink.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
    phoneLink.hidden = false;
    gate.hidden = true;
    phoneLink.focus();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  // script.js ya corrió (se carga antes) y puso el título de la página de
  // inicio — aquí lo corregimos al de esta página.
  document.title = SITE_CONFIG.operatorName
    ? `Servicios — ${SITE_CONFIG.operatorName}`
    : "Servicios";

  renderServices(typeof SERVICES !== "undefined" ? SERVICES : [], SITE_CONFIG.contactEmail);
  initPhoneReveal(SITE_CONFIG);
});
