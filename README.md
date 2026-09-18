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
- [Inicio rápido en local, sin Docker](#inicio-rápido-en-local-sin-docker)
- [Configuración](#configuración)
- [Vista de servicios](#vista-de-servicios)
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
- **SEO y previsualizaciones al compartir, sin tocarlas a mano:** el contenedor sincroniza `<title>`, `og:title`/`og:description`, `canonical`, el Sitemap **y la propia imagen de la tarjeta** directamente desde tu `config.js` — edita tu nombre, tema o dominio una vez y se propaga solo (ver [Meta tags y dominio](#meta-tags-y-dominio)).
- **Índice y/o servicios, a elegir:** `SITE_CONFIG.sections` activa o desactiva el índice de proyectos y la vista de servicios por separado — con las dos activas funciona como un único sitio con transición animada entre ambas; con solo una, esa es directamente la portada. Ver [Vista de servicios](#vista-de-servicios).
- **Marca de agua opcional:** el "Powered by Kardex" del pie se puede quitar con `SITE_CONFIG.showWatermark: false`.

---

## Requisitos

Para producción, [Docker](https://www.docker.com/) con Docker Compose (viene incluido en Docker Desktop) — no hace falta instalar Node ni ningún gestor de paquetes en tu máquina, ni build step de ningún tipo; el propio contenedor trae Node solo para sincronizar las etiquetas de SEO (ver [Meta tags y dominio](#meta-tags-y-dominio)).

Para desarrollo local sin Docker, [Node](https://nodejs.org/) (cualquier versión reciente, ya que solo se usa `sync-meta.js` sin dependencias externas) y [nginx](https://nginx.org/) — en macOS, `brew install nginx`. Ver [Inicio rápido en local, sin Docker](#inicio-rápido-en-local-sin-docker).

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

## Inicio rápido en local, sin Docker

Pensado para desarrollo día a día en tu Mac sin tener Docker Desktop abierto — usa nginx nativo (Homebrew) sirviendo `public/` con la **misma `nginx.conf`** que usa la imagen Docker (cabeceras de seguridad, CSP, caché, rutas de `/servicios` y `/qr`, 404 propia — una sola fuente de verdad, no una copia que se pueda desincronizar), más un watcher en Node que sustituye al `inotifywait` del contenedor para volver a generar las etiquetas SEO cada vez que guardas `config.js`.

```bash
brew install nginx                              # una sola vez
cp public/config.example.js public/config.js    # si aún no lo tienes
scripts/dev-server.sh
```

Accede en: **`http://localhost:8090`** (mismo puerto que con Docker).

Para detenerlo:
```bash
scripts/dev-server-stop.sh
```

**Para aplicar un cambio:** igual que con Docker — edita `public/config.js` o cualquier archivo de `public/` y recarga la pestaña (F5). `dev-server.sh` deja el watcher de `config.js` corriendo en segundo plano (log en `.dev-runtime/watch-meta.log`), así que las etiquetas SEO se resincronizan solas sin reiniciar nada. Solo hace falta volver a ejecutar `scripts/dev-server.sh` si cambias `nginx.conf` (se regenera el server block al arrancar).

Este modo es solo para desarrollo local — para desplegar en un servidor real, usa [Docker](#inicio-rápido-con-docker); `Dockerfile`, `docker-compose.yml` y `nginx.conf` no cambian entre uno y otro.

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

Esto también cambia la vista previa al compartir el enlace (WhatsApp, Twitter/X, Discord...) — ver [Meta tags y dominio](#meta-tags-y-dominio), que incluye `og:title`/`twitter:title` y la propia imagen de la tarjeta.

### Meta tags y dominio
`<title>`, la meta description, `og:*`/`twitter:*` (incluida la URL absoluta de la imagen), `canonical`, el `?v=` del favicon (`faviconVersion`), el bloque **JSON-LD** (`<script type="application/ld+json">` inline en el `<head>` — Google ignora el `src` en ese tipo de script), `public/robots.txt`, `public/sitemap.xml`, **la imagen de la tarjeta** (`public/og-image.png`) y, según `SITE_CONFIG.sections` (ver [Vista de servicios](#vista-de-servicios)), `public/servicios.html` + `public/og-servicios-image.png` **se generan solos** a partir de tu `config.js` — no los edites a mano, se sobrescriben. Tanto el contenedor Docker como `scripts/dev-server.sh` (sin Docker) lo sincronizan al arrancar y también en caliente: si editas `config.js` mientras siguen arriba, se vuelve a aplicar solo, sin reiniciar nada (`scripts/docker-entrypoint-meta.sh`/`scripts/dev-watch-meta.js` vigilan el archivo — en Windows/Docker Desktop esa vigilancia en caliente no siempre detecta cambios hechos desde fuera del propio contenedor; si no ves el cambio, `docker compose restart` lo fuerza).

`og-image.png` es una tarjeta 1200×630 generada de cero (no una plantilla con el texto encima): mismo icono/kicker/nombre/rol que el sitio, con el fondo y el acento del `theme` activo. Para dibujarla hace falta rasterizar un SVG a PNG — dentro de Docker se usa `rsvg-convert` (instalado vía `apk` en el `Dockerfile`, con `ttf-dejavu` para que haya con qué dibujar el texto: Alpine no trae fuentes por defecto); en local sin Docker cae en `sips` si estás en macOS. Si no encuentra ninguna de las dos, avisa y no toca la imagen que ya hubiera — el resto de la sincronización sigue igual.

¿Por qué todo esto no se resuelve solo con JavaScript en el navegador, como el resto de `config.js`? Porque bots como el de Discord, Twitter/X o WhatsApp leen estas etiquetas (e imagen) directamente del HTML servido, sin ejecutar JavaScript — si solo se rellenaran en el navegador, la previsualización al compartir el enlace saldría en blanco o genérica. `scripts/sync-meta.js` (Node) las deja ya escritas antes de que nginx los sirva.

Si sirves el sitio con `scripts/dev-server.sh` (ver [Inicio rápido en local, sin Docker](#inicio-rápido-en-local-sin-docker)) esto es automático. Sirviendo `public/` de cualquier otra forma (sin ese script ni Docker), ejecuta `node scripts/sync-meta.js` a mano cada vez que cambies esos campos.

`public/index.html`, `public/servicios.html` (si existe), `public/robots.txt`, `public/sitemap.xml`, `public/og-image.png` y `public/og-servicios-image.png` (si existe) sí están en git (a diferencia de `config.js`) — al publicar con tus datos reales, tu copia local queda "sucia" frente a la plantilla genérica del repo. Trátalos igual que `config.js`:

```bash
git update-index --skip-worktree public/index.html \
  public/robots.txt public/sitemap.xml public/og-image.png
# si tienes sections.portfolio y sections.services activos a la vez:
git update-index --skip-worktree public/servicios.html public/og-servicios-image.png
```

(revierte con `--no-skip-worktree` sobre el archivo si alguna vez necesitas tocar de verdad la plantilla, no solo tus datos).

### Cambiar el favicon
Para el 95% de los casos, basta con sustituir `public/favicon.svg` por tu propio SVG (mismo nombre de archivo) — actualiza el icono de la pestaña del navegador al momento, sin tocar nada más.

Si además quieres que tu icono se vea bien al "añadir a inicio" en móvil o al instalar como PWA, regenera también los PNG en `public/icons/` (`apple-touch-icon.png` 180×180, `icon-192.png`, `icon-512.png`) a partir de tu nuevo SVG — con cualquier conversor SVG→PNG gratuito online (por ejemplo [realfavicongenerator.net](https://realfavicongenerator.net) o [cloudconvert.com](https://cloudconvert.com)), manteniendo esos mismos nombres de archivo.

Si el navegador se empeña en seguir mostrando el icono viejo de su caché, sube `faviconVersion` en `config.js` (`5` → `6` → …): `sync-meta.js` lo aplica como `favicon.svg?v=N` en el HTML. Está en `config.js` (y no en `index.html`) a propósito, para que el número no se pierda en cada `git pull` del servidor.

---

## Vista de servicios

Un listado aparte, pensado para ofertar servicios propios (no proyectos/enlaces). Qué partes del sitio están activas lo decide `SITE_CONFIG.sections` en `config.js`:

```javascript
const SITE_CONFIG = {
  // ...
  sections: {
    portfolio: true,   // índice de proyectos/enlaces (UNITS) en "/"
    services: false,   // vista de servicios (SERVICES, ver abajo)
  },
};
```

- **Solo `portfolio`** (o sin `sections`): comportamiento de siempre, sin nada de servicios.
- **`portfolio` y `services`:** el índice vive en `/` y la vista de servicios en `/servicios` — una URL real y compartible, no un `#hash`. Para acceder desde el índice, añade (o edita) un bloque en `UNITS` cuyo `url` sea exactamente `"/servicios"` — ese valor especial lo reconoce `script.js` y, en vez de abrir un enlace, dispara una transición animada dentro de la misma página (el masthead sale por un lado y entra por el otro; la lista de proyectos se disuelve y aparece la de servicios):

  ```javascript
  {
    name: "SERVICIOS",
    url: "/servicios",   // valor especial: abre la vista de servicios, no navega
    description: "Ejemplos orientativos de en qué puedo ayudarte.",
    type: "proximamente",
    label: "SERVICIO",
    ctaText: "Ver servicios",   // opcional: texto de la derecha en vez de "/servicios →"
  }
  ```

  También se puede enlazar directamente compartiendo `tu-dominio.example/servicios` — si alguien llega así (en vez de pulsar el enlace desde el índice), el botón para salir de la vista dice "Índice" en vez de "Volver al índice", porque de verdad no viene de ningún sitio.
- **Solo `services`:** no hay índice de proyectos — la vista de servicios pasa a ser directamente la portada del sitio (`/`), sin transición ni enlace de vuelta (no hay a qué volver).

### Listar los servicios (`SERVICES`)
Cada bloque de `SERVICES` en `config.js` es una tarjeta de la vista. Solo `name` es obligatorio:

```javascript
const SERVICES = [
  {
    name: "NOMBRE DEL SERVICIO",
    order: 1,          // opcional, igual que en UNITS
    description: "En qué consiste, con el detalle que quieras.",
    priceRange: "Desde 30€",   // opcional; si lo quitas, queda como ejemplo orientativo sin precio
    slug: "nombre-del-servicio", // opcional; ver más abajo
    details: "Contenido largo opcional, aparte de \"description\".\n\nSepara párrafos con una línea en blanco.", // opcional; ver más abajo
  },
];
```

El nombre de cada servicio no es solo texto: es un `<h2>` con su propio permalink real a `#servicio-<slug>` (el `<a>` lleva el `href`, el `<h2>` el `id`) — así cada servicio es una entidad enlazable e indexable por separado, no una fila más de una página sin URLs propias. Si no indicas `slug`, sale solo a partir de `name` (sin tildes/mayúsculas, espacios → guiones); indícalo a mano solo si quieres una URL más corta o si vas a cambiar el nombre pero quieres conservar el mismo enlace.

Toda la tarjeta se puede pulsar: lleva al detalle de ESE servicio, la misma "otra ventana" que aparece al cambiar entre índice y servicios (mismo deslizamiento, mismo mecanismo), pero para un servicio en concreto — el masthead no se mueve, solo la lista. Dentro: un título grande de verdad, un hueco con el precio si has puesto `priceRange`, y debajo `description` seguida de `details` si lo has escrito (la corta siempre, la larga solo al entrar al detalle); al final, un botón "¿Hablamos?" abre el modal de contacto ampliado (el mismo correo/teléfono del masthead, en grande) — quien esté interesado escribe y ahí se habla el alcance y el precio si no lo has puesto ya en `priceRange`. "← Volver a servicios" cierra el detalle con el mismo deslizamiento, en espejo.

`description` y `details` admiten un markdown mínimo, no un parser completo: `**negrita**`, `*cursiva*` (o `_cursiva_`), `` `código` ``, `[enlace](https://...)` y listas con `- ` al principio de línea, separando párrafos con una línea en blanco.

### Los 4 puntos a favor (`servicesHighlights`)
El bloque de icono + etiqueta + texto que aparece encima del listado también es editable, con `SITE_CONFIG.servicesHighlights`:

```javascript
servicesHighlights: [
  { icon: "rayo", label: "Más rápido", desc: "Optimizo tu equipo para que vaya fluido, sin ralentizaciones ni cuelgues." },
  { icon: "check", label: "Menos errores", desc: "..." },
  { icon: "escudo", label: "Seguro", desc: "..." },
  { icon: "chat", label: "Trato cercano", desc: "..." },
],
```

`icon` elige entre un set fijo ya dibujado: `"rayo"`, `"check"`, `"escudo"`, `"chat"`, `"reloj"`, `"estrella"`, `"grafico"`, `"herramienta"`, `"corazon"`, `"bombilla"` (no admite un SVG propio). Puedes añadir, quitar o reordenar entradas libremente; si quitas el campo entero, no se muestra ningún punto a favor.

### Subtítulo al compartir el enlace (`servicesOgDescription`)
El texto que se ve en la tarjeta de previsualización al compartir `/servicios` (WhatsApp, Twitter/X, Discord...) también es configurable:

```javascript
servicesOgDescription: "Más rápido, menos errores, seguro y con trato cercano: ejemplos orientativos de en qué puedo ayudarte con tu equipo.",
```

Opcional — si lo quitas, se usa un texto genérico por defecto.

### Teléfono, WhatsApp y ubicación (opcionales, solo en esta vista)
Dos campos opcionales de `SITE_CONFIG` que **solo se muestran en la vista de servicios**, no en el índice principal:

```javascript
const SITE_CONFIG = {
  // ...
  contactPhone: "+34 600 000 000",   // opcional
  location: "Madrid, España",         // opcional
};
```

- `contactPhone` alimenta DOS botones: el teléfono en claro (el clic solo lo copia al portapapeles, no abre el marcador) y "WhatsApp" (enlace directo a `wa.me` con ese mismo número). Escríbelo con el prefijo de país (`+34 ...`): de ahí sale el `wa.me/34...` del botón.
- `location` es orientativa (ciudad/zona, o "Remoto"), no una dirección exacta.

Si quitas cualquiera de los dos campos (o los dejas vacíos), esa parte simplemente no se muestra — no hace falta desactivar nada más.

En pantallas estrechas, los botones de acción (copiar correo, teléfono, WhatsApp) se muestran en fila con salto de línea automático en vez de uno debajo de otro — a partir de 860px (donde el masthead pasa a ser una columna lateral angosta) vuelven a apilarse en columna (ver `.contact-actions` en `style.css`).

### Tarjeta con QR (`/qr`)

Al margen de qué secciones tengas activas, el sitio sirve siempre una tarjeta en `/qr`: tu nombre, tu rol y un QR grande que apunta al propio sitio — pensada para enseñar la pantalla (en persona, en una tarjeta física con ese enlace impreso...), no para compartir como enlace normal.

- **Con `portfolio` + `services` activos:** `/qr` es la tarjeta del índice y `/servicios/qr` la de servicios, cada una con su propio nombre (ver `qrPortfolioName`/`qrServicesName` más abajo) y su QR apuntando a `/` o a `/servicios` respectivamente.
- **Con una sola sección activa:** solo existe `/qr`, con la identidad de esa sección — `/servicios/qr` no tiene sentido si no hay índice del que distinguirse.

`qrPortfolioName`/`qrServicesName` son opcionales: si los quitas, ambas tarjetas usan `operatorName`. Útil si usas un alias en el índice pero tu nombre real de cara a servicios (o viceversa).

El QR se genera en el navegador con `qrcode.js` (de kazuhikoarase, MIT, vendido en `public/` — no se pide a ningún servicio externo) y se pinta en negro sobre blanco siempre, sin importar el tema activo: invertirlo en modo oscuro es más "bonito" pero algunos lectores de QR no reconocen igual de bien un código claro-sobre-oscuro, y aquí lo que importa es que escanee.

### Aparecer en buscadores y al compartir

- **`portfolio` + `services`:** `/servicios` es una URL de verdad, no un `#hash` — tiene su propio `<title>`, meta description, `canonical`, entrada en `sitemap.xml` y tarjeta social (`public/og-servicios-image.png`, con los puntos a favor y sus iconos), distinta de la del índice. `scripts/sync-meta.js` **genera `public/servicios.html` entero a partir de `index.html`** (cuerpo idéntico, solo cambian la cabecera y el `<noscript>`), así que su estructura nunca se desincroniza — no lo edites a mano. nginx sirve ese archivo en la ruta `/servicios` (regla en `nginx.conf`).
- **Solo `services`:** al ser `index.html` la propia vista de servicios, es ese archivo el que se sincroniza directamente con el `<title>`/meta/JSON-LD/`<noscript>` de servicios y con `og-image.png` dibujado con los puntos a favor — no se genera ningún `servicios.html` aparte.

En ambos casos, el `<noscript>` lleva la lista real de tus `SERVICES` (nombre + descripción), así que un crawler que no ejecuta JavaScript —o Google en su primer pase— ya ve contenido de verdad, no una página en blanco.

---

## Estructura del proyecto

```
Kardex/
├── public/                  # Todo lo que se sirve tal cual en el navegador
│   ├── index.html            # Estructura semántica; sus meta tags OG/Twitter se sincronizan solas (ver Meta tags y dominio)
│   ├── servicios.html         # Ruta /servicios — solo si sections.portfolio y sections.services están los dos activos (ver Vista de servicios); no lo edites a mano
│   ├── 404.html                # Página de error, mismo diseño y tema que el resto del sitio
│   ├── style.css              # Design system: tokens light-dark(), layout, componentes
│   ├── config.example.js       # Plantilla genérica — SÍ se sube al repo
│   ├── config.js                # Tu configuración real — en .gitignore, nunca se sube
│   ├── script.js                 # Renderizado, gestión de tema y copiado — lógica, no toques datos aquí
│   ├── qrcode.js                  # Generador de QR vendido (kazuhikoarase, MIT) — solo lo carga /qr
│   ├── theme-init.js              # Evita el parpadeo de tema al recargar (externo por la CSP)
│   ├── 404-theme.js                # Aplica el theme-pack en la página 404
│   ├── favicon.svg                   # Marca vectorial (tarjeta de índice)
│   ├── favicon.ico                    # Fallback clásico del favicon
│   ├── preview.jpg                     # Captura de la interfaz, usada en el README
│   ├── og-image.png                     # Tarjeta og:image / twitter:image — se genera sola (ver Meta tags y dominio)
│   ├── og-servicios-image.png            # Misma idea, para /servicios — solo si las dos secciones están activas (ver Vista de servicios)
│   ├── icons/                             # apple-touch-icon.png, icon-192.png, icon-512.png
│   ├── manifest.json                       # Manifest PWA (instalable)
│   ├── robots.txt                           # Directivas para crawlers, se sincroniza solo
│   └── sitemap.xml                           # Sitemap básico, se sincroniza solo
├── scripts/
│   ├── sync-meta.js         # Lee config.js y rellena las etiquetas de SEO/redes (ver Meta tags y dominio)
│   ├── docker-entrypoint-meta.sh  # Lo ejecuta el contenedor Docker solo, al arrancar y en caliente
│   ├── dev-server.sh         # Arranca nginx nativo + watcher, sin Docker (ver Inicio rápido en local, sin Docker)
│   ├── dev-server-stop.sh     # Para lo que arrancó dev-server.sh
│   └── dev-watch-meta.js       # Equivalente a docker-entrypoint-meta.sh pero con fs.watch (sin inotify)
├── Dockerfile                # Imagen de producción nginx:1.27-alpine + Node (para sync-meta.js)
├── nginx.conf                 # Gzip, cache headers, cabeceras de seguridad y CSP — fuente única, la usan Docker y dev-server.sh
├── docker-compose.yml           # Monta public/ dentro del contenedor (puerto 8090:80)
└── .dockerignore
```

`public/` es la única carpeta que necesitas tocar para personalizar el contenido; todo lo que está fuera es infraestructura (Docker/nginx/el script de sincronización) que casi nunca hace falta modificar.

---

## Licencia

Licencia MIT. Úsalo y personalízalo libremente para tu propio hub personal.
