// CODICE 1.0 · enrutador de la web pública y del panel.
import { pedir, sesion, API, SinConexion } from "./api.js";
import { $, h, vaciar, cargando, toast } from "./ui.js";

// Las páginas se piden con la edición de la web para que el navegador no use copias viejas.
const E = "?e=" + ((window.CODICE_CONFIG || {}).edicion || "");
const RUTAS = {
  "": () => import("./paginas/inicio.js" + E),
  campanas: () => import("./paginas/campanas.js" + E),
  campana: () => import("./paginas/campana.js" + E),
  caso: () => import("./paginas/caso.js" + E),
  casos: () => import("./paginas/casos.js" + E),
  reportar: () => import("./paginas/reportar.js" + E),
  seguimiento: () => import("./paginas/seguimiento.js" + E),
  cuenta: () => import("./paginas/cuenta.js" + E),
  ayuda: () => import("./paginas/ayuda.js" + E),
  colaborar: () => import("./paginas/colaborar.js" + E),
  guia: () => import("./paginas/guia.js" + E),
  privacidad: () => import("./paginas/privacidad.js" + E),
  admin: () => import("./admin/panel.js"),
};

const MENU = [["#/", "¿Es estafa?"], ["#/campanas", "Campañas"], ["#/casos", "Casos"], ["#/guia", "Guía"],
  ["#/ayuda", "Ayuda"], ["#/cuenta", "Mi cuenta"], ["#/reportar", "Reportar", "destacado"]];

function pintarMenu(ruta) {
  const menu = $("#menu");
  vaciar(menu, MENU.map(([href, texto, clase]) => h("a", { href, clase, "aria-current": ("#/" + ruta) === href || (ruta === "" && href === "#/") ? "page" : null }, texto)));
}

export function navegar(ruta) { location.hash = "#/" + ruta.replace(/^#?\/?/, ""); }

let ultimaPagina = null;
async function enrutar() {
  const partes = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("?")[0].split("/").filter(Boolean);
  const raiz = partes[0] || "";
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const cargador = RUTAS[raiz];
  pintarMenu(raiz);
  $("#menu").classList.remove("abierto");
  $("#boton-menu").setAttribute("aria-expanded", "false");
  document.body.classList.toggle("modo-panel", raiz === "admin");
  const main = $("#principal");
  if (!cargador) {
    vaciar(main, h("div.vacio", h("h1", "Página no encontrada"), h("p", "Puede que el enlace esté mal escrito."), h("a.boton.primario", { href: "#/" }, "Ir al inicio")));
    return;
  }
  if (ultimaPagina !== raiz || raiz !== "admin") vaciar(main, cargando());
  ultimaPagina = raiz;
  try {
    const modulo = await cargador();
    await modulo.mostrar(main, partes.slice(1), params);
  } catch (e) {
    if (e instanceof SinConexion) {  // faro no responde: pantalla de mantenimiento que se recarga sola al volver
      const { pantalla } = await import("./mantenimiento.js" + E);
      vaciar(main, pantalla());
      return;
    }
    console.error(e);
    vaciar(main, h("div.aviso.error", { role: "alert" }, e.message || "Algo salió mal al cargar la página."),
      h("p.centro", { estilo: { marginTop: "16px" } }, h("button.boton", { type: "button", onclick: enrutar }, "Reintentar")));
  }
  if (!params.has("sin-subir")) window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  contarVisita(raiz);
}

// Métricas propias de CODICE: una línea por página vista. Sin cookies ni Google; el panel no cuenta y
// si el navegador pide «No rastrear» no se envía nada. Va como texto simple para no gastar una consulta extra.
let primeraVisita = true;
function contarVisita(raiz) {
  if (raiz === "admin" || !API) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;
  const ref = primeraVisita ? document.referrer : "";
  primeraVisita = false;
  try {
    fetch(API + "/api/visita", { method: "POST", body: JSON.stringify({ r: (location.hash || "#/").split("?")[0], f: ref, a: window.innerWidth }),
      headers: { "Content-Type": "text/plain" }, credentials: "omit", mode: "cors", keepalive: true, cache: "no-store" }).catch(() => {});
  } catch { /* sin conexión: no pasa nada */ }
}

async function franjaAlerta() {
  try {
    const d = await pedir("/api/avisos");
    const alerta = d.avisos.find((a) => a.tipo === "alerta");
    const f = $("#franja");
    if (alerta) {
      vaciar(f, "⚠ ", alerta.titulo || "Alerta de estafa activa", " · ",
        h("a", { href: alerta.campana ? `#/campana/${alerta.campana.slug}` : "#/" }, "Ver detalles"));
      f.hidden = false;
    } else f.hidden = true;
    if (d.proteccion) document.body.dataset.proteccion = "1"; else delete document.body.dataset.proteccion;
  } catch { /* sin conexión: la franja simplemente no aparece */ }
}

$("#boton-menu").addEventListener("click", () => {
  const abierto = $("#menu").classList.toggle("abierto");
  $("#boton-menu").setAttribute("aria-expanded", String(abierto));
});
$("#version").textContent = (window.CODICE_CONFIG || {}).version || "1.0.0";
window.addEventListener("hashchange", enrutar);
window.addEventListener("codice:panel-caducado", () => { sesion.panel = null; toast("Tu sesión del panel terminó por seguridad. Vuelve a entrar.", "error"); });
enrutar();
franjaAlerta();
setInterval(franjaAlerta, 5 * 60 * 1000);
