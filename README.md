# Kardex

> Hub personal de proyectos y enlaces en formato "ficha de índice", con estética editorial (papel + tinta), modo claro/oscuro adaptativo y soporte Docker. Cero dependencias externas: sin fuentes ni scripts de terceros.

<p align="center">
  <img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-111111">
  <img alt="Sin dependencias" src="https://img.shields.io/badge/dependencias-0-111111">
  <img alt="Docker listo" src="https://img.shields.io/badge/docker-listo-111111">
  <img alt="Sin build step" src="https://img.shields.io/badge/build%20step-ninguno-111111">
</p>

<p align="center">
  <img src="public/preview.jpg" alt="Vista previa de Kardex" width="100%">
</p>

## Índice

- [Características](#características)
- [Requisitos](#requisitos)
- [Inicio rápido con Docker](#inicio-rápido-con-docker)
- [Configuración](#configuración)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Licencia](#licencia)

---

## Características

- **Estética editorial propia:** tipografía serif + monoespaciada del sistema (sin Google Fonts ni CDNs externos), paleta papel/tinta con un único acento, sin los clichés de "terminal hacker" (grid de puntos, naranja neón, cursor parpadeante).
- **Layout en índice:** masthead fijo con identidad y contacto + listado de proyectos en formato ficha/índice, en vez de la típica tarjeta única centrada tipo Linktree.
- **Adaptativo Claro/Oscuro:** vía `prefers-color-scheme` y la función CSS `light-dark()` (un único set de tokens de color, sin duplicación), con toggle manual opcional y sin parpadeo de tema al recargar.
- **6 temas de color** listos para elegir (`terracota`, `vino`, `mostaza`, `azul`, `petroleo`, `monocromo`), cada uno con su propio fondo claro/oscuro coordinado, no solo un acento.
- **100% Vanilla y sin build:** HTML5, CSS3 y JavaScript vanilla. Configuración y contenido separados de la lógica en `config.js`.
- **Accesible:** navegación por teclado, `aria-live` en el copiado de correo, skip-link, `prefers-reduced-motion`, y fallback completo sin JavaScript.
- **SEO / PWA listo:** Open Graph, Twitter Card, `manifest.json`, `robots.txt`, `sitemap.xml`, página 404 propia e iconos para instalar como app.
- **Docker listo:** imagen `nginx:1.27-alpine` con Gzip, cache headers, `HEALTHCHECK`, cabeceras de seguridad y CSP estricta; edición en caliente vía volumen montado, sin reconstruir la imagen para cambios de contenido.
- **SEO y previsualizaciones al compartir, sin tocarlas a mano:** el contenedor sincroniza `<title>`, `og:title`/`og:description`, `canonical` y el Sitemap directamente desde tu `config.js` — edita tu nombre o dominio una vez y se propaga solo (ver [Meta tags y dominio](#meta-tags-y-dominio)).

---

## Requisitos

Solo necesitas [Docker](https://www.docker.com/) con Docker Compose (viene incluido en Docker Desktop) — no hace falta instalar Node ni ningún gestor de paquetes en tu máquina, ni build step de ningún tipo; el propio contenedor trae Node solo para sincronizar las etiquetas de SEO (ver [Meta tags y dominio](#meta-tags-y-dominio)). Node en tu máquina solo hace falta si quieres servir el sitio *sin* Docker.

---

## Inicio rápido con Docker

```bash
git clone https://github.com/tronarite/kardex.git
cd kardex
cp public/config.example.js public/config.js   # tu configuración personal (ver más abajo)
docker compose up -d --build
```

Accede en: **`http://localhost:8090`**

Para detenerlo:
```bash
docker compose down
```

---

## Configuración

Toda tu personalización vive en `public/config.js` — no necesitas tocar `script.js` ni `style.css`. El archivo está pensado para ser lo más cómodo posible de editar a mano: cada campo tiene su explicación al lado, y solo hay que añadir/quitar/reordenar bloques dentro de `UNITS`.

**`public/config.js` está en `.gitignore` a propósito** — es tu archivo personal (nombre, correo, enlaces reales) y nunca se sube al repositorio. Lo que sí se sube es [`public/config.example.js`](public/config.example.js), una plantilla genérica con datos de ejemplo. Si aún no tienes tu `config.js`, créalo copiando la plantilla:

```bash
cp public/config.example.js public/config.js
```

**Para aplicar un cambio:** con el contenedor ya levantado (`docker compose up -d`), solo tienes que:
1. Editar `public/config.js` en tu editor de texto y guardar.
2. Recargar la pestaña del navegador (F5).

Nada más — no hace falta reconstruir Docker ni tocar ningún número de versión. `docker-compose.yml` monta la carpeta `public/` completa dentro del contenedor, así que este siempre sirve lo último que tengas guardado en disco. Solo necesitas volver a ejecutar `docker compose up -d --build` si cambias `Dockerfile` o `nginx.conf` (la parte de infraestructura, no el contenido).

```javascript
const SITE_CONFIG = {
  operatorName: "Tu Nombre / Alias",
  operatorRole: "DESARROLLO SOFTWARE // INGENIERÍA & SISTEMAS",
  contactEmail: "contacto@ejemplo.com",
  availability: {
    type: "disponible",  // opcional, ver tabla "Disponibilidad personal" abajo
    label: "DISPONIBLE"  // opcional, texto libre
  }
};

const UNITS = [
  {
    name: "PROYECTO EJEMPLO",              // obligatorio
    url: "https://ejemplo.com",            // obligatorio
    description: "Plataforma en producción.", // opcional
    type: "activo"                          // opcional (por defecto "activo")
  }
  // añade tantos bloques como quieras, separados por comas
];
```

Fíjate en lo que **no** hay que escribir: no hace falta numerar los proyectos (`01`, `02`...) — el índice se calcula solo según el orden de la lista, así que reordenar, borrar o insertar un proyecto en medio nunca rompe la numeración. Tampoco hace falta `displayUrl` (se genera solo desde `url`) ni `label` (cada `type` ya tiene un texto por defecto).

### `type` es la fase, `label` es la categoría — son independientes
`type` controla **solo** el color del punto y describe el ciclo de vida del proyecto (activo, en desarrollo, en pausa...). Para mostrar de qué trata el enlace (un repositorio, tu música, un servicio...), usa `label` — es texto libre y no cambia el color. Puedes combinar cualquier `label` con cualquier `type`:

```javascript
{ type: "activo",       label: "REPOSITORIO" }  // punto verde, texto "REPOSITORIO"
{ type: "proximamente", label: "SERVICIO" }      // punto naranja, texto "SERVICIO"
```

Esto es lo que hace posible anunciar, por ejemplo, un servicio que aún no está listo (`type: "proximamente"`) sin perder el texto que dice que es un servicio (`label: "SERVICIO"`) — antes tenías que elegir uno u otro.

### Cambiar el orden sin mover bloques
Si solo quieres que un proyecto aparezca más arriba, no hace falta cortar y pegar su bloque dentro de la lista: añádele `order` con el número de posición que quieres (1 = primero).

```javascript
{
  name: "GITHUB",
  order: 1,   // pasa a ser el primero, sin tocar el resto de la lista
  url: "https://github.com/tuusuario",
  ...
}
```

Los proyectos sin `order` rellenan los huecos restantes en su orden habitual. Si dos proyectos piden la misma posición, gana el que esté antes en la lista.

### Fases de PROYECTO (`type` dentro de `UNITS`):
| `type` | Color del indicador | Etiqueta por defecto |
|--------|----------------------|-----------------------|
| `activo` | Verde | ACTIVO |
| `desarrollo` | Azul | EN DESARROLLO |
| `pausa` | Ámbar | EN PAUSA |
| `proximamente` | Naranja | PRÓXIMAMENTE |
| `inactivo` | Gris neutro | INACTIVO |

Si escribes tu propio `label`, sustituye al texto por defecto de la tabla, pero solo `type` determina el color.

### Disponibilidad personal (`type` dentro de `availability`)
Este es un catálogo **distinto** al de arriba: no describe el estado de un proyecto, sino si tú estás disponible ahora mismo. Como con los proyectos, `label` es libre y sustituye al texto por defecto — escribe lo que quieras, `type` solo decide el color.

| `type` | Color del indicador | Etiqueta por defecto |
|--------|----------------------|-----------------------|
| `disponible` | Verde | DISPONIBLE |
| `ocupado` | Ámbar | OCUPADO |
| `vacaciones` | Violeta | DE VACACIONES |
| `no-disponible` | Gris neutro | NO DISPONIBLE |

Nota: `"activo"` indica que el **proyecto** está en marcha, no que la web en sí esté disponible. Una web puede seguir respondiendo con normalidad mientras el proyecto detrás está detenido — en ese caso usa `type: "pausa"`, no `"activo"`.

### Ofrecer un bien o servicio (con enlace externo y precio)
Para un proyecto que en realidad es algo que ofreces (no un enlace a tu propio trabajo), pon `label: "SERVICIO"` (o el texto que prefieras) con `url` apuntando a otra web donde se explica en detalle, y elige el `type` según si ya está disponible o no. El campo opcional `priceRange` añade un precio o rango de precios junto al indicador:

```javascript
{
  name: "DESARROLLO WEB A MEDIDA",
  url: "https://otra-web-donde-se-explica.com",
  description: "En qué consiste, en una frase.",
  type: "activo",        // o "proximamente" si aún no está listo
  label: "SERVICIO",
  priceRange: "Desde 300€"   // opcional; funciona con cualquier type
}
```

### Tema de color
`theme` en `config.js` controla la paleta del sitio. Cada opción trae ya coordinadas su versión clara y su versión oscura — cuál de las dos ves depende de tu sistema o del botón de tema (arriba a la derecha), no de esto. Opcional — por defecto es `"azul"`.

| `theme` | Claro | Oscuro |
|---------|-------|--------|
| `terracota` | Papel crema + acento terracota | Tinta cálida casi negra + terracota claro |
| `vino` | Blanco con tinte vino + acento vino | Negro con tinte vino + vino claro |
| `mostaza` | Blanco con tinte dorado + acento mostaza | Negro con tinte dorado + mostaza claro |
| `azul` (por defecto) | Blanco azulado + acento azul marino profundo | Negro azulado + azul claro |
| `petroleo` | Blanco verde-azulado + acento petróleo | Negro verde-azulado + petróleo claro |
| `monocromo` | Blanco puro, sin color de acento | Negro puro `#000000` (ideal para OLED), sin color de acento |

`azul` usa un azul marino/índigo profundo, no un azul claro o frío — pensado para que no resulte gélido junto a la tipografía serif del resto del sitio.

### Título de la pestaña
`pageTitle` en `config.js` controla el título de la pestaña del navegador. Es opcional: si lo quitas, se genera solo como `"{operatorName} — Índice"`.

Ojo: esto **no** cambia la vista previa cuando compartes el enlace en redes sociales (WhatsApp, Twitter/X, etc.) — esa usa `og:title`/`twitter:title`, que están fijos en `public/index.html` porque los bots que generan esas previsualizaciones no ejecutan JavaScript. Si quieres cambiar también eso, edita esas líneas directamente en `index.html`.

### Meta tags y dominio
`<title>`, la meta description, `og:title`/`og:description`/`og:url`, `twitter:title`/`twitter:description`, `canonical`, `public/ld.json` y el Sitemap de `public/robots.txt`/`public/sitemap.xml` **se rellenan solos** a partir de `operatorName`, `operatorRole`, `pageTitle` y el nuevo campo `siteUrl` de tu `config.js` — no los edites a mano, se sobrescriben. El contenedor Docker lo sincroniza al arrancar y también en caliente: si editas `config.js` mientras el contenedor sigue arriba, se vuelve a aplicar solo, sin reiniciar nada (`scripts/docker-entrypoint-meta.sh` vigila el archivo con `inotifywait`).

¿Por qué esto no se resuelve solo con JavaScript en el navegador, como el resto de `config.js`? Porque bots como el de Discord, Twitter/X o WhatsApp leen esas etiquetas directamente del HTML servido, sin ejecutar JavaScript — si solo se rellenaran en el navegador, la previsualización al compartir el enlace saldría en blanco o genérica. `scripts/sync-meta.js` (Node) las deja ya escritas en los archivos antes de que nginx los sirva.

Si sirves el sitio sin Docker, ejecuta `node scripts/sync-meta.js` a mano cada vez que cambies esos campos.

`public/index.html`, `public/ld.json`, `public/robots.txt` y `public/sitemap.xml` sí están en git (a diferencia de `config.js`) — al publicar con tus datos reales, tu copia local queda "sucia" frente a la plantilla genérica del repo. Trátalos igual que `config.js`:

```bash
git update-index --skip-worktree public/index.html public/ld.json public/robots.txt public/sitemap.xml
```

(revierte con `--no-skip-worktree` sobre el archivo si alguna vez necesitas tocar de verdad la plantilla, no solo tus datos).

Aparte de esto, sigue pendiente regenerar `public/og-image.jpg` con tus datos si quieres — la que trae el repo es genérica a propósito y no se genera sola.

### Cambiar el favicon
Para el 95% de los casos, basta con sustituir `public/favicon.svg` por tu propio SVG (mismo nombre de archivo) — actualiza el icono de la pestaña del navegador al momento, sin tocar nada más.

Si además quieres que tu icono se vea bien al "añadir a inicio" en móvil o al instalar como PWA, regenera también los PNG en `public/icons/` (`apple-touch-icon.png` 180×180, `icon-192.png`, `icon-512.png`) a partir de tu nuevo SVG — con cualquier conversor SVG→PNG gratuito online (por ejemplo [realfavicongenerator.net](https://realfavicongenerator.net) o [cloudconvert.com](https://cloudconvert.com)), manteniendo esos mismos nombres de archivo.

---

## Estructura del proyecto

```
Kardex/
├── public/                  # Todo lo que se sirve tal cual en el navegador
│   ├── index.html            # Estructura semántica; sus meta tags OG/Twitter se sincronizan solas (ver Meta tags y dominio)
│   ├── 404.html                # Página de error, mismo diseño y tema que el resto del sitio
│   ├── style.css              # Design system: tokens light-dark(), layout, componentes
│   ├── config.example.js       # Plantilla genérica — SÍ se sube al repo
│   ├── config.js                # Tu configuración real — en .gitignore, nunca se sube
│   ├── script.js                 # Renderizado, gestión de tema y copiado — lógica, no toques datos aquí
│   ├── theme-init.js              # Evita el parpadeo de tema al recargar (externo por la CSP)
│   ├── 404-theme.js                # Aplica el theme-pack en la página 404
│   ├── ld.json                      # JSON-LD (schema.org), se sincroniza solo desde config.js
│   ├── favicon.svg                   # Marca vectorial (tarjeta de índice)
│   ├── favicon.ico                    # Fallback clásico del favicon
│   ├── preview.jpg                     # Captura de la interfaz, usada en el README
│   ├── og-image.jpg                     # Tarjeta usada como og:image / twitter:image al compartir el enlace
│   ├── icons/                             # apple-touch-icon.png, icon-192.png, icon-512.png
│   ├── manifest.json                       # Manifest PWA (instalable)
│   ├── robots.txt                           # Directivas para crawlers, se sincroniza solo
│   └── sitemap.xml                           # Sitemap básico, se sincroniza solo
├── scripts/
│   ├── sync-meta.js         # Lee config.js y rellena las etiquetas de SEO/redes (ver Meta tags y dominio)
│   └── docker-entrypoint-meta.sh  # Lo ejecuta el contenedor solo, al arrancar y en caliente
├── Dockerfile                # Imagen de producción nginx:1.27-alpine + Node (para sync-meta.js)
├── nginx.conf                 # Gzip, cache headers, cabeceras de seguridad y CSP
├── docker-compose.yml           # Monta public/ dentro del contenedor (puerto 8090:80)
└── .dockerignore
```

`public/` es la única carpeta que necesitas tocar para personalizar el contenido; todo lo que está fuera es infraestructura (Docker/nginx/el script de sincronización) que casi nunca hace falta modificar.

---

## Licencia

Licencia MIT. Úsalo y personalízalo libremente para tu propio hub personal.
