// boton «Abrir como app»: añade un acceso directo de la web a la pantalla de inicio
// OJO: esto NO instala nada, solo crea el icono; la web se abre a pantalla completa, como una app
// en Android y PC con Chrome sale el cuadro del sistema; en iPhone hay que hacerlo a mano, asi que le enseño como
(function () {
  "use strict";
  var boton = null;
  var guardado = null; // el evento de Chrome, si llega

  // si ya esta abierta como app, no hace falta el boton
  function yaEsApp() {
    try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
    catch (e) { return false; }
  }
  // detectar iPhone/iPad (ahi solo se puede explicar, no hay cuadro automatico)
  function esApple() {
    var ua = navigator.userAgent || "";
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  // Chrome/Android/PC: guardo el cuadro de instalar para soltarlo cuando toquen el boton
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); guardado = e; });
  window.addEventListener("appinstalled", function () { guardado = null; if (boton) boton.hidden = true; });

  // ventanita con las instrucciones (cuando no hay cuadro automatico)
  function explicar() {
    var apple = esApple();
    var pasos = apple
      ? "En tu iPhone o iPad: toca el botón <b>Compartir</b> (el cuadro con la flecha hacia arriba ⬆️) y elige <b>«Añadir a pantalla de inicio»</b>."
      : "Abre el menú de tu navegador (los tres puntos ⋮) y elige <b>«Añadir a pantalla de inicio»</b> o <b>«Instalar aplicación»</b>.";
    var capa = document.createElement("div");
    capa.className = "capa-app";
    var tarjeta = document.createElement("div");
    tarjeta.className = "capa-app-tarjeta";
    tarjeta.setAttribute("role", "dialog");
    tarjeta.setAttribute("aria-modal", "true");
    var titulo = document.createElement("h2");
    titulo.textContent = "Abrir CODICE como app";
    var p1 = document.createElement("p");
    p1.textContent = "Esto no instala nada: pone un icono de CODICE en tu pantalla de inicio y, al abrirlo, la web se ve a pantalla completa, como una app.";
    var p2 = document.createElement("p");
    p2.innerHTML = pasos;
    var cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "capa-app-ok";
    cerrar.textContent = "Entendido";
    function quitar() { if (capa.parentNode) capa.parentNode.removeChild(capa); }
    cerrar.addEventListener("click", quitar);
    capa.addEventListener("click", function (e) { if (e.target === capa) quitar(); });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { quitar(); document.removeEventListener("keydown", esc); } });
    tarjeta.appendChild(titulo); tarjeta.appendChild(p1); tarjeta.appendChild(p2); tarjeta.appendChild(cerrar);
    capa.appendChild(tarjeta);
    document.body.appendChild(capa);
    cerrar.focus();
  }

  function alTocar() {
    if (guardado) {
      guardado.prompt();
      if (guardado.userChoice && guardado.userChoice.finally) guardado.userChoice.finally(function () { guardado = null; });
      return;
    }
    explicar();
  }

  function iniciar() {
    boton = document.getElementById("boton-app");
    if (!boton) return;
    if (yaEsApp()) { boton.hidden = true; return; }
    boton.hidden = false;
    boton.addEventListener("click", alTocar);
  }

  if (document.readyState !== "loading") iniciar();
  else document.addEventListener("DOMContentLoaded", iniciar);
})();
