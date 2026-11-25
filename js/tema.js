// modo claro / oscuro. Carga en el <head> antes de pintar la pagina pa' que no parpadee
// la pagina SIEMPRE arranca oscura, no importa lo que tenga puesto el equipo
// si cambian a claro (o vuelven a oscuro) se guarda en ese navegador
(function () {
  var CLAVE = "codice.tema";
  var raiz = document.documentElement;

  function guardado() {
    try { var v = localStorage.getItem(CLAVE); return v === "claro" || v === "oscuro" ? v : null; } catch (e) { return null; }
  }

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
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* sin almacenamiento: dura solo esta visita */ }
    aplicar(nuevo);
  }

  aplicar(guardado() || "oscuro");


  document.addEventListener("DOMContentLoaded", function () {
    var boton = document.getElementById("boton-tema");
    if (!boton) return;
    boton.addEventListener("click", cambiar);
    aplicar(actual());
  });

  window.CODICE_TEMA = { actual: actual, cambiar: cambiar };
})();
