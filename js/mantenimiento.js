// pantalla de «servidor en mantenimiento»: sale solo cuando la web no logra hablar con faro
// prueba sola cada 20 segundos y en cuanto faro contesta recarga la pagina
import { API } from "./api.js";
import { h, vaciar } from "./ui.js";

const CADA = 20;
let vigilando = null;

async function faroResponde() {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch(API + "/api/salud", { cache: "no-store", credentials: "omit", mode: "cors", signal: c.signal });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

/** pantalla completa, pa' las paginas que necesitan a faro si o si (reportar, casos, cuenta, panel…) */
export function pantalla() {
  const estado = h("p.mant-estado", { "aria-live": "polite" });
  const boton = h("button.boton", { type: "button" }, "Reintentar ahora");
  const caja = h("section.mantenimiento", { role: "status" },
    h("div.mant-imagen", h("img", { src: "img/mantenimiento.svg", alt: "", width: 640, height: 360, decoding: "async" })),
    h("h1", "Estamos haciendo mantenimiento"),
    h("p.mant-texto", "El servidor de CODICE no responde ahora mismo. Vuelve en unos minutos: esta página se recargará sola en cuanto vuelva."),
    estado,
    h("div.mant-acciones", boton, h("a.boton.primario", { href: "#/" }, "Comprobar un número")),
    h("p.tenue.mini", "«Comprobar un número» sigue funcionando con la última copia publicada de CODICE."));
  let quedan = CADA;
  const pintar = (texto) => vaciar(estado, h("span.mant-punto"), texto);
  const probar = async () => {
    pintar("Comprobando la conexión…");
    if (await faroResponde()) { pintar("¡Ya volvió! Cargando…"); detener(); setTimeout(() => location.reload(), 600); return; }
    quedan = CADA;
  };
  boton.addEventListener("click", probar);
  detener();
  vigilando = setInterval(() => {
    if (!caja.isConnected) { detener(); return; }
    quedan -= 1;
    if (quedan <= 0) probar(); else pintar(`Sin conexión. Nuevo intento en ${quedan} s.`);
  }, 1000);
  pintar(`Sin conexión. Nuevo intento en ${quedan} s.`);
  return caja;
}

function detener() { clearInterval(vigilando); vigilando = null; }

/** aviso chiquito pa' las paginas que siguen funcionando con la copia (portada, campañas) */
export function aviso(texto = "Mostramos la última copia publicada. Reportar y ver casos volverá en cuanto termine.") {
  return h("div.mant-aviso", { role: "status" },
    h("img", { src: "img/mantenimiento.svg", alt: "", width: 96, height: 54, decoding: "async" }),
    h("div", h("strong", "Servidor en mantenimiento"), h("p", texto)));
}
