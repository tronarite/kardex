// Evita el parpadeo de tema al recargar cuando hay una preferencia manual
// guardada. Se carga en <head>, antes de pintar nada. Compartido por
// index.html y 404.html — vive en un archivo externo (no inline) para que
// la Content-Security-Policy de nginx.conf pueda ser estricta (script-src
// 'self', sin 'unsafe-inline').
(function () {
  try {
    var saved = localStorage.getItem("theme-preference");
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {}
})();
