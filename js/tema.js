// Modo claro / oscuro. Se carga en <head> antes de pintar la página para que no haya parpadeo.
// La elección se guarda en este navegador; si nunca se eligió, se sigue el modo del teléfono o la computadora.
(function () {
  var CLAVE = "codice.tema";
  var raiz = document.documentElement;
  var sistema = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function guardado() {
    try { var v = localStorage.getItem(CLAVE); return v === "claro" || v === "oscuro" ? v : null; } catch (e) { return null; }
  }
  function delSistema() { return sistema && sistema.matches ? "claro" : "oscuro"; }

  function aplicar(tema) {
    if (tema === "claro") raiz.setAttribute("data-tema", "claro"); else raiz.removeAttribute("data-tema");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "claro" ? "#F3F6FA" : "#0B0F17");
    var boton = document.getElementById("boton-tema");
    if (boton) {
      var texto = tema === "claro" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
      boton.setAttribute("aria-label", texto);
      boton.setAttribute("title", texto);
    }
  }
  function actual() { return raiz.getAttribute("data-tema") === "claro" ? "claro" : "oscuro"; }

  function cambiar() {
    var nuevo = actual() === "claro" ? "oscuro" : "claro";
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* sin almacenamiento: solo dura esta visita */ }
    aplicar(nuevo);
  }

  aplicar(guardado() || delSistema());

  // Si la persona nunca eligió, seguimos los cambios del sistema (por ejemplo, modo oscuro automático de noche).
  if (sistema) {
    var alCambiar = function () { if (!guardado()) aplicar(delSistema()); };
    if (sistema.addEventListener) sistema.addEventListener("change", alCambiar);
    else if (sistema.addListener) sistema.addListener(alCambiar);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var boton = document.getElementById("boton-tema");
    if (!boton) return;
    boton.addEventListener("click", cambiar);
    aplicar(actual());
  });

  window.CODICE_TEMA = { actual: actual, cambiar: cambiar };
})();
