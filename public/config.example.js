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
  // Tu nombre, alias o marca personal.
  operatorName: "Tu Nombre / Alias",

  // Una línea corta que te describe. Si escribes "//" en medio, se separa
  // visualmente en dos partes (puedes quitar el "//" si prefieres una frase).
  operatorRole: "DESARROLLO SOFTWARE // INGENIERÍA & SISTEMAS",

  // Tu correo de contacto. Se usa para el enlace "mailto:" y para el botón
  // de copiar al portapapeles.
  contactEmail: "contacto@ejemplo.com",

  // Título de la pestaña del navegador. Opcional: si lo quitas o lo dejas
  // vacío, se usa automáticamente "{operatorName} — Índice".
  pageTitle: "Tu Nombre — Índice personal",

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

  // Tu disponibilidad personal, arriba a la izquierda de la página.
  // OJO: este "type" es un catálogo distinto al de los proyectos de abajo
  // — aquí se trata de si TÚ estás disponible, no de si un proyecto lo está.
  // Opciones: "disponible" | "ocupado" | "vacaciones" | "no-disponible"
  availability: {
    type: "disponible",
    label: "DISPONIBLE",   // texto libre, opcional (si lo quitas, usa uno por defecto)
  },
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
     displayUrl    Opcional      Texto del enlace a mostrar. Si lo omites,
                                  se genera solo a partir de "url".
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
    // EJEMPLO de servicio anunciado pero aún no disponible — edítalo con tu
    // servicio real o bórralo si no lo necesitas.
    name: "SERVICIOS",
    order: 5,
    url: "https://ejemplo.com/servicios",
    description: "Diferentes opciones de asesoría y consultoría.",
    type: "proximamente",
    label: "SERVICIO",
    priceRange: "Desde 30€",
  },
];
