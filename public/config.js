/* ============================================================================
   CONFIGURACIÓN DEL SITIO — edita SOLO este archivo.
   No hace falta tocar script.js ni style.css para personalizar tu índice.

   Para aplicar un cambio: guarda este archivo y recarga la pestaña del
   navegador (Cmd+R). Nada más — no hace falta reconstruir Docker.
   ============================================================================ */

const SITE_CONFIG = {
  // Tu nombre, alias o marca personal.
  operatorName: "tronarite / Marcelo Añanga",

  // Una línea corta que te describe. Si escribes "//" en medio, se separa
  // visualmente en dos partes (puedes quitar el "//" si prefieres una frase).
  operatorRole: "ING. INFORMÁTICA // DEV. // FOTÓGRAFO AMATEUR",

  // Tu correo de contacto. Se usa para el enlace "mailto:" y para el botón
  // de copiar al portapapeles.
  contactEmail: "contacto@tronarite.net",

  // Título de la pestaña del navegador. Opcional: si lo quitas o lo dejas
  // vacío, se usa automáticamente "{operatorName} — Índice".
  pageTitle: "tronarite - Índice personal",

  // Tu disponibilidad, arriba a la izquierda de la página.
  availability: {
    type: "standby",        // ver tabla de TYPES más abajo
    label: "DE VACACIONES",   // texto libre, opcional (si lo quitas, usa uno por defecto)
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
     type          Opcional      Color del indicador (ver tabla). Si lo
                                  omites, se asume "online".
     label         Opcional      Texto junto al indicador. Si lo omites,
                                  se usa el texto por defecto de ese "type".
     displayUrl    Opcional      Texto del enlace a mostrar. Si lo omites,
                                  se genera solo a partir de "url".

   El número de orden (01, 02, 03...) NO se escribe a mano: se calcula solo
   según la posición en esta lista. Puedes reordenar, borrar o añadir
   proyectos sin tener que renumerar nada.

   TYPE disponibles y su color — su etiqueta por defecto entre paréntesis:
     "online"   verde    ("ONLINE")
     "dev"      azul     ("EN DESARROLLO")
     "standby"  ámbar    ("EN PAUSA")
     "source"   violeta  ("REPOSITORIO")
     "media"    rosa     ("MÚSICA")
     "offline"  gris     ("INACTIVO")

   PARA AÑADIR UN PROYECTO NUEVO:
   copia este bloque completo (con su coma final) y pégalo donde quieras
   dentro de la lista UNITS de abajo.

     {
       name: "NOMBRE DEL PROYECTO",
       url: "https://ejemplo.com",
       description: "Una frase corta que lo describe.",
       type: "online",
     },

   ============================================================================ */
const UNITS = [
  {
    name: "FONNAROA NETWORK",
    url: "https://fonnaroa.net",
    description: "Servidores y experiencias de Minecraft. Desde 2023",
    type: "standby",
  },
  {
    name: "PORTFOLIO FOTOGRÁFICO",
    url: "https://gallery.tronarite.net",
    description: "Galería fotográfica y archivos visuales personales.",
    type: "online",
  },
  {
    name: "GITHUB",
    url: "https://github.com/tronarite",
    description: "Código, herramientas y proyectos open source.",
    type: "source",
  },
  {
    name: "LAST.FM",
    url: "https://www.last.fm/user/Tronarite",
    description: "Mi perfil musical",
    type: "media",
  },
];
