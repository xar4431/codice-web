// Avisos del panel: todo lo nuevo se acumula en la campana con una burbuja roja (también lo que llegó
// mientras no estabas) y, con el panel abierto, suena: «ding» suave para tareas, dos tonos graves para el
// servidor y pulsos urgentes para señales de ataque. Nada sale del panel: sin avisos al móvil ni correos.
import { panel } from "../api.js";
import { h, vaciar, icono, dialogo, hace } from "../ui.js";

const CADA = 20000;
const CLAVE = "codice.avisos";
const DEFECTO = { tareas: true, alertas: true, volumen: 0.7 };
const PRIORIDAD = { ataque: 3, servidor: 2, tarea: 1 };

let temporizador = null, conocidos = null, contadores = {}, sinVer = 0, caja = null, tituloBase = document.title, ultimos = [];

export function preferencias() {
  try { return { ...DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch { return { ...DEFECTO }; }
}
function guardar(p) { try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ } }


// --- Sonidos ------------------------------------------------------------------------------------
let ctx = null, salida = null;
function audio() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    salida = ctx.createGain();
    const suave = ctx.createBiquadFilter(); suave.type = "lowpass"; suave.frequency.value = 4200;
    salida.connect(suave).connect(ctx.destination);
  }
  return ctx;
}
// El navegador solo deja sonar después de que la persona toque la página una vez.
["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, () => { const a = audio(); if (a && a.state === "suspended") a.resume(); }, { passive: true }));

function nota(a, frec, t, dur, { tipo = "sine", vol = 0.3, hasta = null } = {}) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(salida);
  o.start(t); o.stop(t + dur + 0.05);
}

const SONIDOS = {
  // Dos notas ascendentes, limpias, con un brillo suave encima: «tienes algo nuevo».
  tarea(a, t) {
    nota(a, 784, t, 0.55, { vol: 0.32 }); nota(a, 1568, t, 0.35, { vol: 0.05 });
    nota(a, 1046.5, t + 0.16, 0.9, { vol: 0.3 }); nota(a, 2093, t + 0.16, 0.5, { vol: 0.045 });
  },
  // Dos tonos graves que bajan, dos veces: «algo va mal en el servidor».
  servidor(a, t) {
    for (const d of [0, 0.75]) { nota(a, 523.25, t + d, 0.32, { tipo: "triangle", vol: 0.38 }); nota(a, 392, t + d + 0.3, 0.42, { tipo: "triangle", vol: 0.38 }); }
  },
  // Pulsos cortos y agudos, dos rachas: «posible ataque».
  ataque(a, t) {
    for (const d of [0, 0.62]) {
      [0, 0.13, 0.26].forEach((x, i) => nota(a, i === 2 ? 1174.7 : 880, t + d + x, 0.11, { tipo: "square", vol: 0.16 }));
    }
    nota(a, 660, t + 1.25, 0.5, { tipo: "sawtooth", vol: 0.08, hasta: 440 });
  },
};

export function sonar(tipo, forzar = false) {
  const p = preferencias();
  if (!forzar && ((tipo === "tarea" && !p.tareas) || (tipo !== "tarea" && !p.alertas))) return true;
  const a = audio();
  if (!a) return false;
  if (a.state === "suspended") { a.resume().catch(() => {}); if (a.state === "suspended") return false; }
  salida.gain.value = Math.max(0.05, Math.min(1, p.volumen));
  SONIDOS[tipo](a, a.currentTime + 0.03);
  return true;
}

// --- Tarjetas emergentes ----------------------------------------------------------------------------
const ESTILO = {
  tarea: { icono: "bandeja", titulo: "Tarea nueva" },
  servidor: { icono: "servidor", titulo: "Aviso del servidor" },
  ataque: { icono: "escudo", titulo: "Posible ataque" },
};

function mostrarAviso(tipo, titulo, texto, { ir, grave = false, detalle, abrirLista = false } = {}) {
  if (!caja || !caja.isConnected) { caja = h("div.avisos-panel", { role: "region", "aria-label": "Avisos", "aria-live": "polite" }); document.body.append(caja); }
  // En el PC, justo debajo de la cabecera (y de la franja roja si está), sin tapar el menú de arriba.
  const cab = document.querySelector(".cabecera")?.getBoundingClientRect();
  caja.style.top = window.innerWidth >= 600 && cab ? `${Math.max(0, cab.bottom) + 12}px` : "";
  const cerrar = () => { tarjeta.classList.add("saliendo"); setTimeout(() => tarjeta.remove(), 220); };
  const tarjeta = h("div.notif.n-" + tipo + (grave ? ".grave" : ""), { role: grave ? "alert" : "status" },
    h("span.notif-icono", icono(ESTILO[tipo].icono, 20)),
    h("div.notif-cuerpo", h("strong", titulo || ESTILO[tipo].titulo), h("p", texto), detalle ? h("span.notif-meta", detalle) : null,
      abrirLista ? h("button.notif-ir", { type: "button", onclick: () => { cerrar(); abrirLista(); } }, "Ver los avisos →")
        : ir ? h("a.notif-ir", { href: "#/admin/" + ir, onclick: cerrar }, "Ver ahora →") : null),
    h("button.notif-cerrar", { type: "button", "aria-label": "Cerrar aviso", onclick: cerrar }, icono("x", 16)));
  caja.prepend(tarjeta);
  [...caja.children].slice(window.innerWidth < 600 ? 2 : 4).forEach((x) => x.remove());
  if (!grave) setTimeout(cerrar, tipo === "tarea" ? 9000 : 16000);
}

// --- Consulta cada 20 segundos ---------------------------------------------------------------------
async function consultar() {
  if (!location.hash.startsWith("#/admin")) { detener(); return; }
  let d;
  try { d = await panel("/novedades"); } catch (e) { if (e.estado === 401 || e.estado === 404) detener(); return; }
  ultimos = d.avisos || [];
  contadores = d.contadores || {};
  sinVer = d.sin_ver || 0;
  pintarContadores();
  const nuevos = ultimos.filter((a) => a.nuevo);
  if (!conocidos) {
    // Al entrar al panel: lo acumulado se ve en la burbuja roja y en un resumen, sin sonar.
    conocidos = new Set(nuevos.map((a) => a.clave));
    if (sinVer) mostrarAviso(nuevos.some((a) => a.tipo === "ataque") ? "ataque" : nuevos.some((a) => a.tipo === "servidor") ? "servidor" : "tarea",
      `Tienes ${sinVer} ${sinVer === 1 ? "aviso nuevo" : "avisos nuevos"}`, resumen(nuevos), { abrirLista: abrirLista });
    return;
  }
  const recien = nuevos.filter((a) => !conocidos.has(a.clave));
  recien.forEach((a) => conocidos.add(a.clave));
  if (!recien.length) return;
  // Un solo sonido por consulta: el del aviso más grave, que queda arriba del todo.
  recien.sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo]);
  const principal = recien[recien.length - 1];
  recien.slice(0, -1).slice(-3).forEach((a) => mostrarAviso(a.tipo, a.titulo, a.texto, { ir: a.ir, grave: a.grave }));
  const sono = sonar(principal.tipo);
  mostrarAviso(principal.tipo, principal.titulo, principal.texto, { ir: principal.ir, grave: principal.grave,
    detalle: sono ? null : "Toca la página una vez para que los avisos suenen." });
}

function resumen(lista) {
  const n = (t) => lista.filter((a) => a.tipo === t).length;
  return [[n("tarea"), "tarea", "tareas"], [n("servidor"), "del servidor", "del servidor"], [n("ataque"), "de seguridad", "de seguridad"]]
    .filter(([x]) => x).map(([x, uno, varios]) => `${x} ${x === 1 ? uno : varios}`).join(" · ");
}

/** Burbuja roja de la campana, números del menú y título de la pestaña. */
export function pintarContadores() {
  const b = document.querySelector(".boton-campana .burbuja");
  if (b) { b.hidden = !sinVer; b.textContent = sinVer > 99 ? "99+" : String(sinVer); }
  document.querySelector(".boton-campana")?.setAttribute("aria-label", sinVer ? `Avisos: ${sinVer} nuevos` : "Avisos");
  const base = tituloBase.replace(/^\(\d+\)\s*/, "");
  document.title = sinVer ? `(${sinVer}) ${base}` : base;
  for (const [k, ruta] of [["reportes", "cola"], ["investigaciones", "investigaciones"], ["tickets", "tickets"], ["solicitudes", "solicitudes"]]) {
    const a = document.querySelector(`.panel-lateral a[href="#/admin/${ruta}"]`);
    if (!a) continue;
    let c = a.querySelector(".contador.tareas");
    if (!contadores[k]) { c?.remove(); continue; }
    if (!c) { c = h("span.contador.tareas"); a.append(c); }
    c.textContent = String(contadores[k]);
  }
}

export function iniciar() {
  if (temporizador) return;
  tituloBase = document.title.replace(/^\(\d+\)\s*/, "");
  conocidos = null;
  consultar();
  temporizador = setInterval(consultar, CADA);
}

export function detener() {
  clearInterval(temporizador); temporizador = null; conocidos = null; sinVer = 0;
  document.title = tituloBase.replace(/^\(\d+\)\s*/, "");
}

// --- Campana: lista de avisos ---------------------------------------------------------------------------
export function botonAjustes() {
  return h("button.boton-campana", { type: "button", title: "Avisos", "aria-label": "Avisos", onclick: abrirLista },
    icono("campana", 20), h("span.burbuja", { hidden: !sinVer }, sinVer > 99 ? "99+" : String(sinVer)));
}

async function abrirLista() {
  const lista = ultimos.slice();
  const habia = sinVer;
  // Abrir la campana marca todo como visto (en todos tus dispositivos); los nuevos se siguen resaltando aquí.
  sinVer = 0; pintarContadores();
  panel("/novedades/vistas", { metodo: "POST" }).catch(() => {});
  lista.filter((a) => a.nuevo).forEach((a) => conocidos?.add(a.clave));
  let irAjustes = false;
  const cerrarLista = () => document.querySelector('.velo .dialogo button[aria-label="Cerrar"]')?.click();
  const elemento = (a) => h("li.aviso-lista" + (a.nuevo ? ".nuevo" : ""), h("span.notif-icono.n-" + a.tipo, icono(ESTILO[a.tipo].icono, 18)),
    h("div.crece", h("div.fila.entre", h("strong", a.titulo), h("span.tenue.mini", hace(a.fecha))), h("p", a.texto),
      a.ir ? h("a.notif-ir", { href: "#/admin/" + a.ir, onclick: cerrarLista }, "Ver →") : null),
    a.nuevo ? h("span.punto-nuevo", { "aria-label": "nuevo" }) : null);
  await dialogo(habia ? `Avisos · ${habia} ${habia === 1 ? "nuevo" : "nuevos"}` : "Avisos", h("div.pila",
    lista.length ? h("ul.lista-limpia.lista-avisos", lista.map(elemento)) : h("p.vacio", "No hay avisos en los últimos 7 días."),
    h("div.fila.entre", { estilo: { marginTop: "6px" } }, h("span.tenue.mini", "Últimos 7 días. Lo nuevo se marca con un punto rojo."),
      h("button.boton.chico", { type: "button", onclick: () => { irAjustes = true; cerrarLista(); } }, "Sonidos…"))), { ancho: true });
  if (irAjustes) abrirAjustes();
}

async function abrirAjustes() {
  const p = preferencias();
  const tareas = h("input", { type: "checkbox", checked: p.tareas });
  const alertas = h("input", { type: "checkbox", checked: p.alertas });
  const volumen = h("input", { type: "range", min: 0.05, max: 1, step: 0.05, value: p.volumen, "aria-label": "Volumen" });
  const actualizar = () => guardar({ tareas: tareas.checked, alertas: alertas.checked, volumen: Number(volumen.value) });
  [tareas, alertas, volumen].forEach((x) => x.addEventListener("change", actualizar));
  const probar = (tipo, texto, etiqueta = "Probar") => h("button.boton.chico", { type: "button", onclick: () => { actualizar(); sonar(tipo, true); mostrarAviso(tipo, null, texto, { detalle: "Esto es una prueba." }); } }, etiqueta);
  const fila = (control, titulo, ayuda, boton) => h("div.ajuste-aviso", h("label.casilla", control, h("span", h("strong", titulo), h("br"), h("span.tenue", ayuda))), boton);
  await dialogo("Sonidos de los avisos", h("div.pila",
    h("p.suave", "Con el panel abierto, faro mira cada 20 segundos si hay algo nuevo y suena según el tipo."),
    fila(tareas, "Tareas nuevas", "Reportes, tickets y solicitudes. Suena un «ding» suave.", probar("tarea", "Reporte nuevo CDX-26-0042")),
    fila(alertas, "Alertas del servidor y de seguridad", "Errores del servidor: dos tonos graves. Señales de ataque: pulsos urgentes.",
      h("div.fila", probar("servidor", "El disco supera el 80 %.", "Probar servidor"), probar("ataque", "Intentos de inyección de código bloqueados.", "Probar ataque"))),
    h("label.campo", h("span", "Volumen"), volumen),
    h("p.tenue.mini", "Se guarda en este navegador. Aunque apagues los sonidos, todo sigue acumulándose en la campana.")),
  { acciones: [{ texto: "Listo", valor: true, clase: "primario" }] });
}
