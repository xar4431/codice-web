// Gráficas del panel (métricas y seguridad): barras interactivas que funcionan con ratón, dedo y teclado.
import { h, vaciar } from "../ui.js";

const NUM = new Intl.NumberFormat((window.CODICE_LOCALE || "es"));
export const num = (n) => NUM.format(Number(n) || 0);

let paises = null;
try { paises = new Intl.DisplayNames([(window.CODICE_LOCALE || "es")], { type: "region" }); } catch { /* navegador antiguo */ }
export function nombrePais(codigo) {
  if (!codigo) return "Desconocido";
  try { return paises?.of(codigo) || codigo; } catch { return codigo; }
}

export const EQUIPOS = { movil: "Móvil", pc: "PC", tableta: "Tableta" };

/**
 * Barras verticales. serie: [{etiqueta, detalle, partes: [{valor, color, nombre}]}]
 * Al pasar el ratón, tocar o enfocar una barra se ve su detalle arriba; tocar otra vez la deja fija.
 */
export function grafico(serie, { resumen, bajo = false, ejes } = {}) {
  const info = h("div.grafico-info", { "aria-live": "polite" });
  const total = (b) => b.partes.reduce((n, p) => n + (Number(p.valor) || 0), 0);
  const max = Math.max(1, ...serie.map(total));
  let fija = null;
  const mostrarResumen = () => vaciar(info, resumen || "");
  const detalle = (b) => vaciar(info, h("strong", b.etiqueta), " · ",
    b.partes.map((p, i) => [i ? " · " : "", h("b", num(p.valor)), " ", p.nombre]), b.detalle ? [" · ", b.detalle] : null);
  const barras = h("div.grafico-barras", serie.map((b) => {
    const t = total(b);
    const boton = h("button.gbarra" + (t ? "" : ".cero"), { type: "button", "aria-label": `${b.etiqueta}: ${b.partes.map((p) => `${p.valor} ${p.nombre}`).join(", ")}` },
      // De arriba abajo: la última parte va arriba.
      (t ? b.partes.slice().reverse().filter((p) => p.valor > 0) : b.partes.slice(0, 1)).map((p) => h("i", { estilo: { height: t ? `${(p.valor / max) * 100}%` : "2px", background: p.color } })));
    const elegir = () => { detalle(b); barras.classList.add("con-seleccion"); barras.querySelectorAll(".activa").forEach((x) => x.classList.remove("activa")); boton.classList.add("activa"); };
    boton.addEventListener("mouseenter", elegir);
    boton.addEventListener("focus", elegir);
    boton.addEventListener("click", () => { fija = fija === boton ? null : boton; if (fija) elegir(); });
    return boton;
  }));
  barras.addEventListener("mouseleave", () => {
    if (fija) { fija.dispatchEvent(new Event("focus")); return; }
    barras.classList.remove("con-seleccion"); barras.querySelectorAll(".activa").forEach((x) => x.classList.remove("activa")); mostrarResumen();
  });
  mostrarResumen();
  // Con pocas barras cada una lleva su nombre debajo; con muchas, solo unas cuantas marcas repartidas.
  const alineado = !ejes && serie.length <= 12;
  const marcas = ejes || (alineado ? serie.map((b) => b.corta || b.etiqueta) : puntosEje(serie.map((b) => b.corta || b.etiqueta)));
  return h("div.grafico", info,
    h("div.grafico-zona" + (bajo ? ".bajo" : ""), h("span.grafico-max", `máx. ${num(max)}`), barras),
    h("div.grafico-eje" + (alineado ? ".alineado" : ""), { "aria-hidden": "true" }, marcas.map((m) => h("span", m))));
}

function puntosEje(etiquetas, n = 5) {
  if (etiquetas.length <= n) return etiquetas;
  const paso = (etiquetas.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => etiquetas[Math.round(i * paso)]);
}

export function leyenda(items) {
  return h("div.leyenda", items.map(([nombre, color]) => h("span", h("i", { estilo: { background: color } }), nombre)));
}

/** Lista de barras horizontales: [{nombre, valor, detalle}] */
export function barrasH(filas, { color = "var(--primario)", vacio = "Sin datos todavía.", total } = {}) {
  if (!filas?.length) return h("p.tenue", vacio);
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const suma = total || filas.reduce((n, f) => n + f.valor, 0) || 1;
  return h("ul.barras-h", filas.map((f) => h("li", { title: f.detalle || `${f.nombre}: ${f.valor}` },
    h("span.nombre", f.nombre), h("span.num", `${num(f.valor)} · ${Math.round((f.valor / suma) * 100)} %`),
    h("span.pista", h("i", { estilo: { width: `${Math.max(2, (f.valor / max) * 100)}%`, background: color } })))));
}

export function kpi(titulo, valor, nota, clase = "") {
  return h("div.kpi", h("span", titulo), h("b", valor), nota ? h("small" + (clase ? "." + clase : ""), nota) : null);
}

/** «+12 % que el periodo anterior» */
export function cambio(ahora, antes) {
  if (!antes) return ahora ? ["nuevo", "sube"] : ["sin datos antes", ""];
  const p = Math.round(((ahora - antes) / antes) * 100);
  if (p === 0) return ["igual que antes", ""];
  return [`${p > 0 ? "+" : ""}${p} % que el periodo anterior`, p > 0 ? "sube" : "baja"];
}
