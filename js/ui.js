// Utilidades de interfaz. Todo el texto se inserta como texto (nunca como HTML) para evitar inyecciones.

export function h(etiqueta, attrs, ...hijos) {
  const [tag, ...clases] = etiqueta.split(".");
  const el = document.createElement(tag || "div");
  if (clases.length) el.className = clases.join(" ");
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { hijos.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "clase") el.className += (el.className ? " " : "") + v;
    else if (k === "estilo") Object.assign(el.style, v);
    else if (k === "datos") Object.assign(el.dataset, v);
    else if (k === "href" || k === "src") el.setAttribute(k, seguroUrl(String(v)));
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  anadir(el, hijos);
  return el;
}

function anadir(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function seguroUrl(u) {
  // Solo rutas internas, https, datos de imagen y blobs. Nada de javascript:
  if (/^(#|\/(?!\/)|https:\/\/|data:image\/|blob:|mailto:)/i.test(u)) return u;
  if (/^[a-z0-9_-][a-z0-9_./-]*$/i.test(u) && !u.includes("..")) return u;
  return "#";
}

export function vaciar(el, ...hijos) { el.replaceChildren(); anadir(el, hijos); return el; }
export const $ = (s, r = document) => r.querySelector(s);

export function icono(nombre, tam = 18) {
  const rutas = {
    buscar: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm10 17-5.2-5.2",
    escudo: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    alerta: "M12 3 2 20h20L12 3zm0 6v5m0 3v.5",
    ok: "M5 12l4 4 10-10",
    x: "M6 6l12 12M18 6 6 18",
    flecha: "M9 6l6 6-6 6",
    atras: "M15 6l-6 6 6 6",
    subir: "M12 16V4m0 0-5 5m5-5 5 5M4 20h16",
    descargar: "M12 4v12m0 0-5-5m5 5 5-5M4 20h16",
    deshacer: "M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3",
    candado: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
    grafo: "M6 6m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M18 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 18m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8 6.5l8 1.2M7 8l4 8M17 10l-4 6",
    servidor: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
  };
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", tam); svg.setAttribute("height", tam); svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path"); p.setAttribute("d", rutas[nombre] || rutas.escudo); svg.append(p);
  return svg;
}

export function toast(texto, tipo = "info", ms = 4500, accion = null) {
  const caja = $("#avisos-flotantes");
  const t = h("div.toast." + tipo, { role: tipo === "error" ? "alert" : "status" }, h("span.crece", texto));
  if (accion) t.append(h("button.boton.chico", { type: "button", onclick: () => { accion.fn(); t.remove(); } }, accion.texto));
  t.append(h("button.boton.fantasma.chico", { type: "button", "aria-label": "Cerrar", onclick: () => t.remove() }, icono("x", 16)));
  caja.append(t);
  setTimeout(() => t.remove(), ms);
  return t;
}

export function dialogo(titulo, contenido, { ancho = false, acciones = [] } = {}) {
  return new Promise((resolver) => {
    const anterior = document.activeElement;
    const cerrar = (v) => { velo.remove(); document.removeEventListener("keydown", tecla); anterior?.focus?.(); resolver(v); };
    const tecla = (e) => { if (e.key === "Escape") cerrar(null); };
    const caja = h("div.dialogo" + (ancho ? ".ancho" : ""), { role: "dialog", "aria-modal": "true", "aria-label": titulo },
      h("div.fila", { estilo: { justifyContent: "space-between", marginBottom: "12px" } }, h("h2", { estilo: { margin: 0 } }, titulo),
        h("button.boton.fantasma.chico", { type: "button", "aria-label": "Cerrar", onclick: () => cerrar(null) }, icono("x"))),
      contenido,
      acciones.length ? h("div.fila.fin", { estilo: { marginTop: "16px" } }, acciones.map((a) =>
        h("button.boton" + (a.clase ? "." + a.clase : ""), { type: "button", onclick: async () => {
          if (a.antes) { const r = await a.antes(); if (r === false) return; }
          cerrar(a.valor);
        } }, a.texto))) : null);
    const velo = h("div.velo", { onclick: (e) => { if (e.target === velo) cerrar(null); } }, caja);
    document.body.append(velo);
    document.addEventListener("keydown", tecla);
    (caja.querySelector("input, textarea, select, button.primario") || caja.querySelector("button"))?.focus();
  });
}

export function confirmar(titulo, texto, { boton = "Confirmar", peligro = false } = {}) {
  return dialogo(titulo, h("p", texto), { acciones: [
    { texto: "Cancelar", valor: false, clase: "fantasma" },
    { texto: boton, valor: true, clase: peligro ? "peligro" : "primario" }] });
}

export async function pedirTexto(titulo, { etiqueta = "", valor = "", largo = false, obligatorio = true, ayuda = "" } = {}) {
  const campo = largo ? h("textarea", { id: "pedir-texto" }) : h("input", { id: "pedir-texto", type: "text" });
  campo.value = valor;
  const err = h("div.error");
  const r = await dialogo(titulo, h("div.campo", h("label", { for: "pedir-texto" }, etiqueta), campo, ayuda ? h("div.ayuda", ayuda) : null, err), {
    acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" },
      { texto: "Aceptar", valor: "ok", clase: "primario", antes: () => { if (obligatorio && !campo.value.trim()) { err.textContent = "Escribe algo."; return false; } } }] });
  return r === "ok" ? campo.value.trim() : null;
}

export function cargando(texto = "Cargando…") { return h("div.cargando", { role: "status" }, texto); }
export function vacio(texto) { return h("div.vacio", texto); }

const FMT_FECHA = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });
const FMT_HORA = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export function fecha(iso) { if (!iso) return "—"; const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso); return isNaN(d) ? iso : FMT_FECHA.format(d); }
export function fechaHora(iso) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? iso : FMT_HORA.format(d); }
export function hace(iso) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "hace un momento"; if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`; if (s < 2592000) return `hace ${Math.round(s / 86400)} días`;
  return fecha(iso);
}
export function quedan(iso) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  if (s <= 0) return "caducado"; if (s < 3600) return `se oculta en ${Math.max(1, Math.round(s / 60))} min`;
  return `se oculta en ${Math.round(s / 3600)} h`;
}
export function bytes(n) {
  if (n == null) return "—"; const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return `${v.toFixed(v < 10 && i ? 1 : 0)} ${u[i]}`;
}
// Pantallas «lista + detalle» en el móvil: el detalle se ve solo y arriba; al volver, la lista regresa al elemento abierto.
const esMovil = () => matchMedia("(max-width: 1200px)").matches; // móvil y portátil pequeño
export function recordarSeleccion(clave, id) { try { sessionStorage.setItem("codice.sel." + clave, String(id)); } catch (e) { /* sin almacenamiento */ } }
export function subirAlDetalle(el) {
  if (!esMovil()) return;
  requestAnimationFrame(() => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 76)));
}
export function volverASeleccion(clave, lista) {
  if (!esMovil()) return;
  let id = null;
  try { id = sessionStorage.getItem("codice.sel." + clave); } catch (e) { /* sin almacenamiento */ }
  const enlace = id && [...lista.querySelectorAll("a[href]")].find((a) => new RegExp(`/${id}(\\?|$)`).test(a.getAttribute("href")));
  if (!enlace) return;
  const li = enlace.closest("li");
  li.classList.add("seleccionado"); // marca el último que leíste
  requestAnimationFrame(() => li.scrollIntoView({ block: "center" }));
}

export function insignia(texto, clase = "") { return h("span.insignia" + (clase ? "." + clase : ""), texto); }

export const NIVELES = { fuerte: "Relación fuerte", intermedia: "Relación intermedia", debil: "Relación débil", ninguna: "Sin relación" };
export const RIESGOS = { alto: "Riesgo alto", medio: "Riesgo medio", sin_datos: "Sin reportes publicados" };

export function erroresEnFormulario(form, campos = {}) {
  form.querySelectorAll(".error[data-campo]").forEach((e) => { e.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  let primero = null;
  for (const [k, msg] of Object.entries(campos)) {
    const caja = form.querySelector(`.error[data-campo="${CSS.escape(k)}"]`);
    if (caja) caja.textContent = msg;
    const inp = form.querySelector(`[name="${CSS.escape(k)}"]`);
    if (inp) { inp.setAttribute("aria-invalid", "true"); primero ||= inp; }
  }
  primero?.focus();
}

export function campo(etiqueta, control, { ayuda, nombre } = {}) {
  const id = control.id || ("c-" + Math.random().toString(36).slice(2, 8));
  control.id = id;
  return h("div.campo", h("label", { for: id }, etiqueta), control, ayuda ? h("div.ayuda", ayuda) : null,
    h("div.error", { datos: { campo: nombre || control.name || "" } }));
}

export function seleccion(nombre, opciones, valor, { vacioTexto = "Elige…" } = {}) {
  const s = h("select", { name: nombre }, vacioTexto ? h("option", { value: "" }, vacioTexto) : null,
    Object.entries(opciones).map(([k, v]) => h("option", { value: k }, v)));
  if (valor !== undefined) s.value = valor;
  return s;
}

export function copiar(texto) {
  navigator.clipboard?.writeText(texto).then(() => toast("Copiado.", "ok", 2000), () => toast("No se pudo copiar: selecciónalo y cópialo a mano.", "error"));
}

export function pestanas(lista, alCambiar, activa) {
  const barra = h("div.pestanas", { role: "tablist" });
  const pintar = (clave) => {
    barra.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.clave === clave)));
    alCambiar(clave);
  };
  for (const [clave, texto] of lista) barra.append(h("button", { type: "button", role: "tab", datos: { clave }, onclick: () => pintar(clave) }, texto));
  queueMicrotask(() => pintar(activa || lista[0][0]));
  return barra;
}
