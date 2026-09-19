/* ============================================================================
   CONFIGURACIÓN DEL SITIO — plantilla de ejemplo.

   Este archivo SÍ se sube al repositorio (es la plantilla genérica).
   Para usarlo: copia este archivo como "config.js" en esta misma carpeta
   y edita "config.js" con tus datos reales. "config.js" está en
   .gitignore a propósito — así tus datos personales (nombre, correo,
   enlaces...) nunca se suben al repositorio.

     cp public/config.example.js public/config.js

   Para aplicar un cambio en tu config.js: guarda el archivo y recarga la
   pestaña del navegador (Cmd+R). Nada más — no hace falta reconstruir Docker.
   ============================================================================ */

const SITE_CONFIG = {
  // Qué partes del sitio están activas. Si quitas "sections" por completo,
  // se usa { portfolio: true, services: false } — el índice de proyectos
  // solo, sin vista de servicios.
  //   portfolio: true   -> índice de proyectos/enlaces (UNITS) en "/"
  //   services: true    -> vista de servicios (SERVICES más abajo)
  // Con las dos en true: índice en "/" y "/servicios" como página real y
  // compartible, con la fila "SERVICIOS" de UNITS como acceso y una
  // animación de cruce entre ambas vistas.
  // Con solo "services" en true: la vista de servicios pasa a ser la
  // portada del sitio ("/"), sin lista de proyectos.
  //
  // Al margen de "sections", siempre existe "/qr": una tarjeta con tu
  // nombre/rol y un QR grande al sitio, pensada para enseñar en pantalla
  // (networking, una tarjeta física con ese enlace...). Con las dos
  // secciones activas, "/qr" es la del índice y "/servicios/qr" la de
  // servicios; con solo una activa, "/qr" es la de esa única sección (ver
  // qrPortfolioName/qrServicesName más abajo e initQrPage en script.js).
  sections: {
    portfolio: true,
    services: false,
  },

  // Tu nombre, alias o marca personal.
  operatorName: "Tu Nombre / Alias",

  // Una línea corta que te describe. Si escribes "//" en medio, se separa
  // visualmente en dos partes (puedes quitar el "//" si prefieres una frase).
  operatorRole: "DESARROLLO SOFTWARE // INGENIERÍA & SISTEMAS",

  // Nombre a mostrar en las tarjetas "/qr" y "/servicios/qr" (ver más
  // abajo) — pensadas para enseñar la pantalla y que alguien escanee el QR
  // al sitio. Útiles si usas un alias en el índice pero tu nombre real de
  // cara a servicios (o viceversa): "qrPortfolioName" es el nombre de la
  // tarjeta de "/qr" (índice), "qrServicesName" el de "/servicios/qr".
  // Ambos opcionales — si los quitas, esas tarjetas usan "operatorName".
  qrPortfolioName: "Tu Nombre / Alias",
  qrServicesName: "Tu Nombre / Alias",

  // Tu correo de contacto. Se usa para el enlace "mailto:" y para el botón
  // de copiar al portapapeles.
  contactEmail: "contacto@ejemplo.com",

  // Tu teléfono de contacto, solo se usa si "sections.services" es true.
  // Opcional: si lo quitas, la vista de servicios simplemente no muestra
  // el bloque de teléfono ni el botón de WhatsApp (ver abajo). No aparece
  // en texto plano hasta que alguien pulsa "mostrar teléfono" — un filtro
  // básico contra bots que solo leen el HTML, no una verificación real
  // (para eso haría falta un backend, que este sitio no tiene). Escríbelo
  // con el prefijo de país (formato "+NN NNN NNN NNN"): de aquí también
  // sale el botón de WhatsApp, que necesita esos mismos dígitos con el
  // prefijo para armar el enlace a wa.me — y ese botón SÍ lleva el número
  // directo en el enlace (sin filtro de clic), porque no tiene sentido
  // "revelar" un wa.me que ya funciona en cuanto se ve.
  contactPhone: "+34 600 000 000",

  // Tu ubicación, solo se usa si "sections.services" es true — pensada
  // para dar una idea de dónde trabajas, no una dirección exacta (ej.
  // "Madrid, España" o "Remoto (España)"). Opcional: si la quitas o la
  // dejas vacía, esa vista simplemente no muestra el bloque de ubicación.
  location: "Madrid, España",

  // Título de la pestaña del navegador. Opcional: si lo quitas o lo dejas
  // vacío, se usa automáticamente "{operatorName} — Índice".
  pageTitle: "Tu Nombre — Índice personal",

  // URL pública donde vas a publicar el sitio (con barra final). Con
  // Docker, en cuanto guardes esto (o operatorName/operatorRole/
  // pageTitle) se aplica solo a og:url/canonical (index.html), el
  // Sitemap de robots.txt y el <loc> de sitemap.xml — no hace falta
  // editar esos archivos a mano ni reiniciar nada (ver
  // scripts/docker-entrypoint-meta.sh).
  //
  // ¿Por qué no basta con JavaScript en el navegador, como con el resto
  // de config.js? Porque bots como el de Discord, Twitter o WhatsApp leen
  // estas etiquetas directamente del HTML sin ejecutar JavaScript — si
  // solo se rellenaran en el navegador, la previsualización al compartir
  // el enlace saldría en blanco. Por eso el contenedor las deja ya
  // escritas en los archivos en vez de esperar a que las pinte el navegador.
  siteUrl: "https://tu-dominio.example/",

  // Tema de color del sitio. Cada opción trae ya coordinadas su versión
  // clara y su versión oscura — cuál de las dos ves depende de tu sistema
  // o del botón de tema, no de esto. Opcional — si lo quitas, se usa
  // "terracota" por defecto.
  // Opciones (cada una con su propio fondo claro/oscuro, no solo el acento):
  //   "terracota"  papel crema / tinta cálida, acento rojo-naranja
  //   "vino"       blanco/negro con tinte vino, acento vino
  //   "mostaza"    blanco/negro con tinte cálido dorado, acento mostaza
  //   "azul"       azul marino profundo, no un azul frío/claro
  //   "petroleo"   azul verdoso profundo, entre azul y verde
  //   "monocromo"  blanco puro / negro puro, sin color de acento
  theme: "terracota",

  // Cache-busting del favicon. Se añade como "?v=N" al enlace de
  // favicon.svg en el HTML — súbela (5 -> 6 -> 7...) cada vez que cambies
  // favicon.svg, para que los navegadores dejen de servir el icono viejo
  // de su caché. Vive aquí y no en el HTML a propósito: config.js no se
  // toca al hacer "git pull", así que el número sobrevive a cada
  // despliegue sin tener que reeditar index.html a mano (lo aplica
  // scripts/sync-meta.js). Opcional: si la quitas, no se añade "?v=".
  faviconVersion: 5,

  // Tu disponibilidad personal, arriba a la izquierda de la página.
  // OJO: este "type" es un catálogo distinto al de los proyectos de abajo
  // — aquí se trata de si TÚ estás disponible, no de si un proyecto lo está.
  // Opciones: "disponible" | "ocupado" | "vacaciones" | "no-disponible"
  availability: {
    type: "disponible",
    label: "DISPONIBLE",   // texto libre, opcional (si lo quitas, usa uno por defecto)
  },

  // Muestra u oculta el "Powered by Kardex" del pie de página. Opcional:
  // si lo quitas, se muestra (true por defecto).
  showWatermark: true,

  // "Puntos a favor" de la vista de servicios (icono + etiqueta + texto),
  // solo se usan si "sections.services" es true. Elige "icon" de este set
  // fijo: "rayo" | "check" | "escudo" | "chat" | "reloj" | "estrella" |
  // "grafico" | "herramienta" | "corazon" | "bombilla". Opcional: si lo
  // quitas, no se muestra ningún punto a favor.
  servicesHighlights: [
    { icon: "rayo", label: "Más rápido", desc: "Optimizo tu equipo para que vaya fluido, sin ralentizaciones ni cuelgues." },
    { icon: "check", label: "Menos errores", desc: "Reviso conflictos y programas innecesarios antes de que den problemas de verdad." },
    { icon: "escudo", label: "Seguro", desc: "Tu equipo y tus datos, tratados con el mismo cuidado que si fueran los míos." },
    { icon: "chat", label: "Trato cercano", desc: "Soluciones reales, explicadas en claro y sin venderte de más." },
  ],

  // "Cómo funciona": pasos numerados que se ven encima de la lista de
  // servicios (el número se pone solo). Solo se usa si "sections.services"
  // es true. Opcional: si lo quitas, no se muestra la franja. Para apagarla
  // sin borrar los pasos, pon "showServicesSteps: false".
  showServicesSteps: true,
  // "servicesStepsTitle" cambia el título de la franja (por defecto
  // "Cómo funciona").
  servicesSteps: [
    { title: "Me escribes", desc: "Cuéntame qué necesitas por WhatsApp o correo." },
    { title: "Acordamos el precio", desc: "Te doy una tarifa orientativa antes de empezar." },
    { title: "Lo hago", desc: "Me pongo con ello y te explico lo que hago." },
  ],

  // Subtítulo que se ve en la tarjeta de previsualización al compartir el
  // enlace de /servicios (WhatsApp, Twitter, Discord...) — el
  // og:description/twitter:description de esa página. Solo se usa si
  // "sections.services" es true. Opcional: si lo quitas, se usa uno genérico.
  servicesOgDescription: "Más rápido, menos errores, seguro y con trato cercano: ejemplos orientativos de en qué puedo ayudarte con tu equipo.",
};


/* ============================================================================
   TUS PROYECTOS Y ENLACES
   ============================================================================
   Cada bloque { ... } de la lista de abajo es una fila del índice.
   Solo son obligatorios "name" y "url" — todo lo demás es opcional.

     name          Obligatorio   Título del proyecto o enlace.
     url           Obligatorio   A dónde lleva (incluye "https://").
     description   Opcional      Frase corta debajo del título.
     type          Opcional      Fase del proyecto (ver tabla) — controla
                                  SOLO el color del punto. Si lo omites,
                                  se asume "activo".
     label         Opcional      El texto que se ve junto al punto. NO
                                  hace falta usar los textos por defecto
                                  ("ACTIVO", "EN PAUSA"...) — escribe lo
                                  que de verdad describe ese enlace, en tus
                                  palabras. Suele funcionar mejor si dice
                                  QUÉ TIPO DE COSA es (ej. "GALERÍA",
                                  "RRSS", "REPOSITORIO", "COMUNIDAD") en
                                  vez de repetir un estado que no puedes
                                  prometer ("ACTIVO" no garantiza que subas
                                  contenido a menudo) o que ya cuenta la
                                  "description". Si lo omites del todo, se
                                  usa el texto por defecto de ese "type".
     displayUrl    Opcional      Texto del enlace a mostrar (se le añade
                                  " →" automáticamente). Si lo omites, se
                                  genera solo a partir de "url".
     ctaText       Opcional      Sustituye del todo el texto de la derecha
                                  por uno propio (también con " →" al
                                  final) en vez de mostrar una URL — pensado
                                  para enlaces que no tiene sentido mostrar
                                  como dirección web (rutas internas, un
                                  correo, etc.), ej. "Ver servicios" en vez
                                  de "/servicios →". Si lo indicas, gana
                                  siempre a "displayUrl".
     priceRange    Opcional      Texto libre junto al indicador, ej. "20€ –
                                  50€" o "Desde 30€". Si lo omites, no se
                                  muestra nada.
     order         Opcional      Un número (1, 2, 3...) para fijar en qué
                                  posición del índice aparece, sin tener
                                  que mover el bloque dentro de la lista.
                                  Si dos proyectos repiten el mismo número,
                                  gana el que esté antes en la lista. Los
                                  que no tienen "order" se quedan en su
                                  sitio de siempre.

   El número de orden (01, 02, 03...) NO se escribe a mano: se calcula solo
   según la posición en esta lista. Puedes reordenar, borrar o añadir
   proyectos sin tener que renumerar nada.

   TYPE disponibles para PROYECTOS — describen SOLO la fase/ciclo de vida,
   nunca la categoría (para eso usa "label", ver arriba). Etiqueta por
   defecto entre paréntesis. Esto NO es lo mismo que SITE_CONFIG.availability
   de arriba, que es tu disponibilidad personal, con su propio catálogo:
     "activo"       verde  ("ACTIVO")        — funcionando con normalidad
     "desarrollo"   azul   ("EN DESARROLLO") — en construcción
     "pausa"        ámbar  ("EN PAUSA")      — detenido de momento
     "proximamente" naranja ("PRÓXIMAMENTE") — anunciado pero aún no listo
     "inactivo"     gris   ("INACTIVO")      — dado de baja / archivado

   Como "type" y "label" son independientes, puedes combinar cualquier
   categoría con cualquier fase en la misma insignia:

     { type: "activo",       label: "REPOSITORIO" }  -> punto verde, texto "REPOSITORIO"
     { type: "proximamente", label: "SERVICIO" }      -> punto naranja, texto "SERVICIO"
     { type: "activo",       label: "MÚSICA" }         -> punto verde, texto "MÚSICA"

   PARA AÑADIR UN PROYECTO NUEVO:
   copia este bloque completo (con su coma final) y pégalo donde quieras
   dentro de la lista UNITS de abajo.

     {
       name: "NOMBRE DEL PROYECTO",
       url: "https://ejemplo.com",
       description: "Una frase corta que lo describe.",
       type: "activo",
     },

   PARA AÑADIR UN SERVICIO/PRODUCTO QUE OFRECES (con enlace a otra web y
   rango de precios):

     {
       name: "NOMBRE DEL SERVICIO",
       url: "https://otra-web-donde-se-explica.com",
       description: "En qué consiste, en una frase.",
       type: "activo",
       label: "SERVICIO",
       priceRange: "Desde 30€",
     },

   ============================================================================ */
const UNITS = [
  {
    name: "PROYECTO EJEMPLO",
    order: 1,
    url: "https://ejemplo.com",
    description: "Descripción del proyecto o plataforma en producción.",
    type: "activo",
    label: "REPOSITORIO",
  },
  {
    name: "PORTFOLIO FOTOGRÁFICO",
    order: 2,
    url: "https://foto.ejemplo.com",
    description: "Galería fotográfica y archivos visuales personales.",
    type: "activo",
    label: "GALERÍA",
  },
  {
    name: "PROYECTO EN PAUSA",
    order: 3,
    url: "https://ejemplo.com/proyecto-antiguo",
    description: "Un proyecto que ya no actualizas con frecuencia.",
    type: "pausa",
  },
  {
    name: "PERFIL MUSICAL",
    order: 4,
    url: "https://www.last.fm/user/tuusuario",
    description: "Historial musical y estadísticas en tiempo real.",
    type: "activo",
    label: "RRSS",
  },
  {
    // "/servicios" es un valor especial que reconoce script.js: en vez de
    // enlazar a otra página, abre la vista de servicios (ver SERVICES más
    // abajo) con una transición, dentro de esta misma web — solo funciona
    // si "sections.services" está en true; si no, se trata como un enlace
    // normal (y "/servicios" dará 404, porque esa vista no existe). Si
    // prefieres enlazar a una web externa en su lugar, cambia "url" por esa
    // dirección normal (como en los demás bloques de arriba) y quita
    // "ctaText" (se generará el texto a partir de esa URL).
    // "ctaText" es lo que hace que aquí se lea "Ver servicios →" en vez de
    // "/servicios →" — si lo quitas, usa "Ver servicios" por defecto.
    name: "SERVICIOS",
    order: 5,
    url: "/servicios",
    description: "Ejemplos orientativos de en qué puedo ayudarte.",
    type: "proximamente",
    label: "SERVICIO",
    ctaText: "Ver servicios",
  },
];


/* ============================================================================
   SERVICIOS — listado de la vista de servicios, solo se usa si
   "sections.services" es true (dentro de esta misma web, no una página
   aparte — se abre desde la fila "SERVICIOS" de UNITS, con
   "url: '/servicios'", o es la propia portada si "sections.portfolio" es
   false)
   ============================================================================
   No sustituye a la fila "SERVICIOS" de arriba en UNITS — esa sigue siendo el
   enlace que aparece en el índice principal; esto es lo que se ve dentro
   de la vista de servicios que abre.

   Cada bloque es una tarjeta de servicio. Solo "name" es obligatorio.

     name          Obligatorio   Nombre del servicio.
     description   Opcional      En qué consiste, con el detalle que quieras
                                  (a diferencia de la description de UNITS,
                                  aquí no hace falta que sea una frase corta).
                                  Admite markdown mínimo — ver "details"
                                  más abajo.
     order         Opcional      Igual que en UNITS: fija la posición sin
                                  mover el bloque.
     priceRange    Opcional      Igual que en UNITS: texto libre junto al
                                  nombre, ej. "Desde 30€" o "20€ – 50€".
                                  Si lo omites, la tarjeta queda como un
                                  ejemplo orientativo sin precio — quien
                                  esté interesado escribe (correo, teléfono
                                  o el canal que prefieras) y ahí se habla
                                  el alcance y el precio según cada caso.
     slug          Opcional      El nombre del servicio es un permalink
                                  real a "#servicio-<slug>" (con su propio
                                  <h2 id>, no solo texto suelto) — así cada
                                  servicio es una entidad enlazable/
                                  indexable por separado, no solo una fila
                                  más de una página única. Si lo omites,
                                  el slug sale solo del nombre (sin
                                  tildes/mayúsculas, espacios → guiones);
                                  indícalo solo si quieres una URL más
                                  corta o si el nombre cambia pero quieres
                                  mantener el mismo enlace.
     details       Opcional      Toda tarjeta de servicio se puede pulsar
                                  y lleva al detalle de ESE servicio (la
                                  misma "otra ventana" que aparece al
                                  cambiar entre índice y servicios, pero
                                  para un solo servicio) — con título
                                  grande, un hueco para el precio (si hay
                                  "priceRange") y, debajo, "description"
                                  seguida de "details" si lo has escrito
                                  aquí: la corta siempre, la larga solo
                                  dentro del detalle. Al final hay un
                                  botón "¿Hablamos?" que abre el modal de
                                  contacto — no depende de "details",
                                  sigue ahí aunque lo omitas.

                                  Tanto "description" como "details"
                                  admiten un markdown mínimo (no un
                                  parser completo): **negrita**,
                                  *cursiva* (o _cursiva_), `código`,
                                  [enlace](https://...) y listas con
                                  "- " al principio de línea. Separa
                                  párrafos con una línea en blanco.
   ============================================================================ */
const SERVICES = [
  {
    name: "NOMBRE DEL SERVICIO",
    order: 1,
    description: "Descripción de en qué consiste este servicio, qué incluye y qué no.",
    priceRange: "Desde 30€",
  },
  {
    name: "OTRO SERVICIO",
    order: 2,
    description: "Otra descripción, tan larga como haga falta.",
  },
];
