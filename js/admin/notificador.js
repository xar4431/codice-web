// Avisos del panel con sonido: tareas nuevas (un «ding» suave), problemas del servidor (dos tonos graves)
// y señales de ataque (pulsos urgentes). Los sonidos se crean en el navegador: no se descarga nada.
import { panel } from "../api.js";
import { h, vaciar, icono, dialogo } from "../ui.js";

const CADA = 20000;
const CLAVE = "codice.avisos";
const SEGURIDAD = new Set(["ataque", "escudo", "acceso", "integridad"]);
const TIPOS_ATAQUE = { inyeccion: "intento de inyección de código", herramienta: "herramienta de ataque", ddos: "posible ataque de denegación de servicio",
  escaneo: "escaneo de rutas", exceso: "demasiadas peticiones", avalancha: "avalancha de reportes", acceso_fallido: "accesos fallidos al panel",
  codigo_fallido: "códigos de doble verificación incorrectos", acceso_nuevo: "entrada desde un lugar nuevo", reportes_origen: "avalancha de reportes" };
const DEFECTO = { tareas: true, alertas: true, volumen: 0.7, sistema: false };

let temporizador = null, marcas = null, contadores = {}, caja = null, ultimoAtaque = 0, tituloBase = document.title;

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

// --- Tarjetas de aviso ----------------------------------------------------------------------------
const ESTILO = {
  tarea: { icono: "bandeja", titulo: "Tarea nueva" },
  servidor: { icono: "servidor", titulo: "Aviso del servidor" },
  ataque: { icono: "escudo", titulo: "Posible ataque" },
};

function mostrarAviso(tipo, texto, { ir, grave = false, detalle } = {}) {
  if (!caja || !caja.isConnected) { caja = h("div.avisos-panel", { role: "region", "aria-label": "Avisos", "aria-live": "polite" }); document.body.append(caja); }
  // En el PC, justo debajo de la cabecera (y de la franja roja si está), sin tapar el menú de arriba.
  const cab = document.querySelector(".cabecera")?.getBoundingClientRect();
  caja.style.top = window.innerWidth >= 600 && cab ? `${Math.max(0, cab.bottom) + 12}px` : "";
  const e = ESTILO[tipo];
  const cerrar = () => { tarjeta.classList.add("saliendo"); setTimeout(() => tarjeta.remove(), 220); };
  const tarjeta = h("div.notif." + tipo + (grave ? ".grave" : ""), { role: grave ? "alert" : "status" },
    h("span.notif-icono", icono(e.icono, 20)),
    h("div.notif-cuerpo", h("strong", grave && tipo !== "tarea" ? e.titulo + " · grave" : e.titulo), h("p", texto), detalle ? h("span.notif-meta", detalle) : null,
      ir ? h("a.notif-ir", { href: "#/admin/" + ir, onclick: cerrar }, "Ver ahora →") : null),
    h("button.notif-cerrar", { type: "button", "aria-label": "Cerrar aviso", onclick: cerrar }, icono("x", 16)));
  caja.prepend(tarjeta);
  [...caja.children].slice(window.innerWidth < 600 ? 2 : 4).forEach((x) => x.remove());
  if (!grave) setTimeout(cerrar, tipo === "tarea" ? 9000 : 16000);
  const p = preferencias();
  if (p.sistema && document.hidden && "Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(`CODICE · ${e.titulo}`, { body: texto, tag: `codice-${tipo}`, icon: "img/favicon.svg", renotify: true });
      n.onclick = () => { window.focus(); if (ir) location.hash = "#/admin/" + ir; n.close(); };
    } catch { /* algunos móviles no permiten avisos fuera de una app instalada */ }
  }
}

function avisar(tipo, texto, opciones) {
  const sono = sonar(tipo);
  mostrarAviso(tipo, texto, { ...opciones, detalle: sono ? opciones?.detalle : "Toca la página una vez para que los avisos suenen." });
}

// --- Consulta periódica --------------------------------------------------------------------------
function parametros() {
  if (!marcas) return "";
  return "?" + new URLSearchParams({ reporte: marcas.reporte, ticket: marcas.ticket, solicitud: marcas.solicitud, alerta: marcas.alerta, incidente: marcas.incidente });
}

async function consultar() {
  if (!location.hash.startsWith("#/admin")) { detener(); return; }
  let d;
  try { d = await panel("/novedades" + parametros()); } catch (e) { if (e.estado === 401 || e.estado === 404) detener(); return; }
  const nuevas = {
    reporte: d.ultimo_reporte ?? marcas?.reporte ?? 0, ticket: d.ultimo_ticket ?? marcas?.ticket ?? 0, solicitud: d.ultimo_solicitud ?? marcas?.solicitud ?? 0,
    alerta: d.ultima_alerta ?? marcas?.alerta ?? 0, incidente: d.ultimo_incidente ?? marcas?.incidente ?? 0,
  };
  const primera = !marcas;
  marcas = { reporte: Math.max(marcas?.reporte || 0, nuevas.reporte), ticket: Math.max(marcas?.ticket || 0, nuevas.ticket),
    solicitud: Math.max(marcas?.solicitud || 0, nuevas.solicitud), alerta: Math.max(marcas?.alerta || 0, nuevas.alerta),
    incidente: Math.max(marcas?.incidente || 0, nuevas.incidente) };
  try { sessionStorage.setItem("codice.avisos.marcas", JSON.stringify(marcas)); } catch { /* */ }
  contadores = d.contadores || {};
  pintarContadores();
  if (primera) return; // la primera consulta solo marca dónde estamos: no suena por lo que ya había
  // Un solo sonido por consulta, el del aviso más grave; ese aviso queda arriba del todo.
  const alertas = d.alertas || [];
  const seg = alertas.filter((a) => SEGURIDAD.has(a.tipo));
  const srv = alertas.filter((a) => !SEGURIDAD.has(a.tipo));
  const ataques = (d.ataques || []).length && Date.now() - ultimoAtaque > 10 * 60000 ? d.ataques : [];
  const n = d.nuevos || [];
  const lista = [];
  if (seg.length || ataques.length) {
    ultimoAtaque = Date.now();
    lista.push(["ataque", seg.length ? seg[0].mensaje
      : `${ataques.length === 1 ? "Un intento" : `${ataques.length} intentos`} de ataque bloqueados: ${[...new Set(ataques.map((x) => TIPOS_ATAQUE[x.tipo] || x.tipo))].join(", ")}.`,
    { ir: "servidor/seguridad" + (seg.length ? "" : "?ver=incidentes"), grave: seg.some((a) => a.nivel === "grave") }]);
  }
  if (srv.length) lista.push(["servidor", srv[0].mensaje + (srv.length > 1 ? ` (y ${srv.length - 1} más)` : ""), { ir: "servidor/seguridad", grave: srv.some((a) => a.nivel === "grave") }]);
  if (n.length) {
    const nombres = { reporte: "reportes", ticket: "tickets", solicitud: "solicitudes" };
    lista.push(["tarea", n.length === 1 ? n[0].texto : `${n.length} tareas nuevas: ${[...new Set(n.map((x) => nombres[x.clase]))].join(", ")}.`,
      { ir: n.length === 1 ? n[0].ir : (n[0].clase === "reporte" ? "cola" : n[0].ir), detalle: n.some((x) => x.urgente) ? "Hay uno urgente: coincide con una campaña activa." : null }]);
  }
  lista.slice(1).reverse().forEach(([tipo, texto, op]) => mostrarAviso(tipo, texto, op));
  if (lista.length) avisar(...lista[0]);
}

/** Números junto a Reportes, Tickets y Colaboración en el menú del panel, y en el título de la pestaña. */
export function pintarContadores() {
  const total = (contadores.reportes || 0) + (contadores.tickets || 0) + (contadores.solicitudes || 0);
  document.title = total ? `(${total}) ${tituloBase.replace(/^\(\d+\)\s*/, "")}` : tituloBase.replace(/^\(\d+\)\s*/, "");
  for (const [k, ruta] of [["reportes", "cola"], ["tickets", "tickets"], ["solicitudes", "solicitudes"]]) {
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
  try { marcas = JSON.parse(sessionStorage.getItem("codice.avisos.marcas") || "null"); } catch { marcas = null; }
  consultar();
  temporizador = setInterval(consultar, CADA);
}

export function detener() {
  clearInterval(temporizador); temporizador = null;
  document.title = tituloBase;
}

// --- Ajustes de avisos (botón de la campana) ---------------------------------------------------------
export function botonAjustes() {
  return h("button.boton-campana", { type: "button", title: "Avisos y sonidos", "aria-label": "Avisos y sonidos", onclick: abrirAjustes }, icono("campana", 20));
}

async function abrirAjustes() {
  const p = preferencias();
  const tareas = h("input", { type: "checkbox", checked: p.tareas });
  const alertas = h("input", { type: "checkbox", checked: p.alertas });
  const volumen = h("input", { type: "range", min: 0.05, max: 1, step: 0.05, value: p.volumen, "aria-label": "Volumen" });
  const sistema = h("input", { type: "checkbox", checked: p.sistema && "Notification" in window && Notification.permission === "granted" });
  const estadoSistema = h("span.tenue.mini");
  const pintarEstado = () => vaciar(estadoSistema, !("Notification" in window) ? "Este navegador no permite avisos fuera de la página."
    : Notification.permission === "denied" ? "Los bloqueaste en el navegador: actívalos en los permisos del sitio." : "");
  pintarEstado();
  const actualizar = () => guardar({ tareas: tareas.checked, alertas: alertas.checked, volumen: Number(volumen.value), sistema: sistema.checked });
  [tareas, alertas, volumen].forEach((x) => x.addEventListener("change", actualizar));
  sistema.addEventListener("change", async () => {
    if (sistema.checked && "Notification" in window && Notification.permission !== "granted") {
      const r = await Notification.requestPermission().catch(() => "denied");
      if (r !== "granted") sistema.checked = false;
    }
    pintarEstado(); actualizar();
  });
  const probar = (tipo, texto, etiqueta = "Probar") => h("button.boton.chico", { type: "button", onclick: () => { actualizar(); sonar(tipo, true); mostrarAviso(tipo, texto, { detalle: "Esto es una prueba." }); } }, etiqueta);
  const fila = (control, titulo, ayuda, boton) => h("div.ajuste-aviso", h("label.casilla", control, h("span", h("strong", titulo), h("br"), h("span.tenue", ayuda))), boton);
  await dialogo("Avisos y sonidos", h("div.pila",
    h("p.suave", "Mientras tengas el panel abierto, faro mira cada 20 segundos si hay algo nuevo."),
    fila(tareas, "Tareas nuevas", "Reportes, tickets y solicitudes. Suena un «ding» suave.", probar("tarea", "Reporte nuevo CDX-26-0042")),
    fila(alertas, "Alertas del servidor y de seguridad", "Errores del servidor: dos tonos graves. Señales de ataque: pulsos urgentes.",
      h("div.fila", probar("servidor", "El disco supera el 80 %.", "Probar servidor"), probar("ataque", "Intentos de inyección de código bloqueados.", "Probar ataque"))),
    h("label.campo", h("span", "Volumen"), volumen),
    fila(sistema, "Avisar también con la pestaña en segundo plano", "Usa los avisos del sistema del navegador.", null), estadoSistema,
    h("p.tenue.mini", "Se guarda en este navegador. En el móvil, con la pantalla apagada, el navegador no deja sonar nada.")),
  { acciones: [{ texto: "Listo", valor: true, clase: "primario" }] });
}
