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
  } else {
    pasos = [
      paso(1, "Abre el menú del navegador (los tres puntos)."),
      paso(2, "Busca ", h("strong", "Instalar app"), " o ", h("strong", "Añadir a pantalla de inicio"), "."),
      paso(3, "Si no aparece, abre codicecuba.org en ", h("strong", "Chrome"), " o ", h("strong", "Edge"), "."),
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
if (!yaInstalada() && (esIOS || esSafariMac)) mostrar(true);

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
