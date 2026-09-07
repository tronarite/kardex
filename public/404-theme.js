// Aplica el mismo tema de color elegido en config.js a la página 404 (que
// no carga script.js). Externo por el mismo motivo que theme-init.js: para
// poder tener una CSP estricta sin "unsafe-inline".
if (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.theme) {
  document.documentElement.dataset.themePack = SITE_CONFIG.theme;
}
