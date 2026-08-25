# AdvancedLinkPortfolio

> Modern, minimalist, and technical personal link hub and portfolio with automatic adaptive Light/Dark mode, typewriter boot sequence, and Docker support.

---

## ✨ Features

- **Minimalist & Technical Aesthetic:** High-contrast monochrome design with subtle technical touches.
- **Adaptive Dark/Light Mode:** Automatically detects system preferences (`prefers-color-scheme`) with seamless real-time switching, plus an optional manual toggle button.
- **100% Vanilla & Fast:** Zero dependencies, zero build steps. Pure HTML5, CSS3 (variables, grid, flexbox), and vanilla JavaScript.
- **Customizable & Modular:** Easy configuration in a single array in `script.js`.
- **Accessible & Responsive:** Fluid scaling across all mobile and desktop viewports, WCAG AA contrast compliance, and full `prefers-reduced-motion` support.
- **Docker Ready:** Production-ready lightweight `nginx:1.27-alpine` container with Gzip compression and optimized caching headers.

---

## 🚀 Quick Start with Docker

Run locally in Docker:

```bash
docker compose up -d --build
```

Access the site at: **`http://localhost:8090`**

To stop:
```bash
docker compose down
```

---

## 🛠️ Configuration

Open [`script.js`](script.js) and customize your data at the top of the file:

```javascript
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
    status: "ONLINE", // Green badge
    displayUrl: "ejemplo.com"
  },
  {
    code: "02",
    name: "PORTFOLIO FOTOGRÁFICO",
    description: "Galería fotográfica y archivos visuales personales.",
    url: "https://foto.ejemplo.com",
    status: "EN DESARROLLO", // Blue badge
    displayUrl: "foto.ejemplo.com"
  },
  {
    code: "03",
    name: "GITHUB",
    description: "Código, herramientas y proyectos open source.",
    url: "https://github.com/tuusuario",
    status: "REPOSITORIO", // Purple badge
    displayUrl: "github.com/tuusuario"
  },
  {
    code: "04",
    name: "LAST.FM",
    description: "Historial musical y estadísticas en tiempo real.",
    url: "https://www.last.fm/user/tuusuario",
    status: "MÚSICA", // Crimson badge
    displayUrl: "last.fm/user/tuusuario"
  }
];
```

### Supported Status Badges:
- `ONLINE` / `ACTIVO` / `PRODUCCIÓN` ➔ Green indicator
- `EN DESARROLLO` / `DEV` / `BUILDING` ➔ Blue indicator
- `REPOSITORIO` / `CÓDIGO` / `SOURCE` ➔ Purple indicator
- `MÚSICA` / `SCROBBLE` / `STREAM` ➔ Crimson indicator
- `STANDBY` / `EN PAUSA` ➔ Amber indicator

---

## 📂 Project Structure

```
AdvancedLinkPortfolio/
├── index.html          # Semantic HTML structure & noscript fallback
├── style.css           # Adaptive Light/Dark CSS design system
├── script.js           # Configuration, typewriter animation & dynamic rendering
├── favicon.svg         # Minimalist vector icon
├── Dockerfile          # Production nginx:1.27-alpine image
├── nginx.conf          # Nginx configuration with Gzip & Cache-Control
├── docker-compose.yml  # Docker compose service (port 8090:80)
└── .dockerignore       # Build context exclusions
```

---

## 📄 License

MIT License. Feel free to use and customize for your own personal hub.
