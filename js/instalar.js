// CODICE · botón «Instalar app» (web instalable en móvil y ordenador).
// Chrome, Edge, Samsung Internet y Opera: abren la ventana de instalación del propio sistema.
// iPhone, iPad y Safari en Mac: no permiten instalar con un toque, así que el botón muestra una guía corta.
import { $, h, icono, dialogo, toast } from "./ui.js";

const boton = $("#boton-instalar");
const zonas = () => document.querySelectorAll("[data-instalar-zona]");
let aviso = null; // evento beforeinstallprompt guardado para usarlo al tocar el botón

const ua = navigator.userAgent;
const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const esSafariMac = !esIOS && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
const esSafariIOS = esIOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

function yaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: window-controls-overlay)").matches
    || navigator.standalone === true;
}

function mostrar(si) { zonas().forEach((z) => { z.hidden = !si; }); }

function paso(n, ...texto) { return h("li.paso-instalar", h("span.num-paso", String(n)), h("span", ...texto)); }

function guia() {
  let pasos;
  if (esSafariIOS) {
    pasos = [
      paso(1, "Toca el botón ", h("strong", "Compartir"), " (el cuadrado con una flecha hacia arriba), abajo o arriba de la pantalla."),
      paso(2, "Baja en el menú y toca ", h("strong", "Añadir a pantalla de inicio"), "."),
      paso(3, "Toca ", h("strong", "Añadir"), ". El faro de CODICE aparecerá junto a tus apps."),
    ];
  } else if (esIOS) {
    pasos = [
      paso(1, "En iPhone y iPad solo se puede instalar desde ", h("strong", "Safari"), "."),
      paso(2, "Abre ", h("strong", "codicecuba.org"), " en Safari y vuelve a tocar «Instalar app»."),
    ];
  } else if (esSafariMac) {
    pasos = [
      paso(1, "En la barra de menús de Safari, abre ", h("strong", "Archivo"), "."),
      paso(2, "Elige ", h("strong", "Añadir al Dock"), " y confirma con ", h("strong", "Añadir"), "."),
    ];
  } else if (/Firefox\//.test(ua)) {
    pasos = [
      paso(1, "Firefox no permite instalar webs como app."),
      paso(2, "Abre ", h("strong", "codicecuba.org"), " en ", h("strong", "Chrome"), " o ", h("strong", "Edge"), " y toca «Instalar app»."),
    ];
  } else if (/Android/.test(ua)) {
    pasos = [
      paso(1, "Toca el menú de Chrome (los tres puntos, arriba a la derecha)."),
      paso(2, "Toca ", h("strong", "Añadir a pantalla de inicio"), " o ", h("strong", "Instalar app"), "."),
      paso(3, "Confirma con ", h("strong", "Instalar"), ". El faro de CODICE aparecerá junto a tus apps."),
    ];
  } else if (/Edg\//.test(ua)) {
    pasos = [
      paso(1, "Abre el menú de Edge (los tres puntos, arriba a la derecha)."),
      paso(2, "Entra en ", h("strong", "Aplicaciones"), " y elige ", h("strong", "Instalar este sitio como una aplicación"), "."),
      paso(3, "Confirma con ", h("strong", "Instalar"), "."),
    ];
  } else {
    pasos = [
      paso(1, "Mira a la derecha de la barra de direcciones: si ves el ícono de instalar (una pantalla con una flecha), tócalo."),
      paso(2, "Si no está, abre el menú de Chrome (los tres puntos) → ", h("strong", "Transmitir, guardar y compartir"), " → ", h("strong", "Instalar página como app"), "."),
      paso(3, "Confirma con ", h("strong", "Instalar"), ". CODICE quedará como un programa más, con su acceso directo."),
    ];
  }
  dialogo("Instalar CODICE", h("div",
    h("p", { estilo: { marginTop: 0 } }, "Es la misma web de CODICE, con su ícono y en su propia ventana. Es gratis y se actualiza sola."),
    h("ol.pasos-instalar", pasos)), { acciones: [{ texto: "Entendido", clase: "primario", valor: true }] });
}

async function alTocar() {
  if (aviso) {
    const ev = aviso;
    aviso = null;
    ev.prompt();
    const { outcome } = await ev.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (outcome !== "accepted") mostrar(true);
    return;
  }
  guia();
}

if (boton) boton.prepend(icono("descargar", 18));
document.querySelectorAll("[data-instalar]").forEach((b) => b.addEventListener("click", alTocar));
// El botón se muestra siempre que la web no esté abierta como app. Si el navegador todavía no ha
// avisado de que se puede instalar (Chrome tarda un poco la primera vez), el botón enseña la guía.
if (!yaInstalada()) mostrar(true);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  aviso = e;
  if (!yaInstalada()) mostrar(true);
});

window.addEventListener("appinstalled", () => {
  aviso = null;
  mostrar(false);
  toast("CODICE quedó instalada. Ábrela desde su ícono.", "ok");
});

window.matchMedia("(display-mode: standalone)").addEventListener?.("change", (e) => { if (e.matches) mostrar(false); });

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {}); });
}
