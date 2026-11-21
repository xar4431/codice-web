// Mapa de investigación del panel (1.3): casos, datos y expedientes conectados, sin librerías ni servicios externos.
// Formas y letras por tipo, zonas por campaña, filtros, buscador, línea de tiempo con reproducción, camino entre
// dos puntos, aislar conexiones, fijar nodos, minimapa, pantalla grande e imagen PNG. Ratón, teclado y dedos.
import { h, vaciar, fecha, insignia, toast } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
export const TIPOS_MAPA = {
  reporte: { n: "Casos", l: "C", v: "--m-caso" },
  expediente: { n: "Expedientes", l: "E", v: "--m-expediente" },
  telefono: { n: "Teléfonos", l: "T", v: "--m-telefono" },
  perfil: { n: "Perfiles", l: "P", v: "--m-perfil" },
  url: { n: "Enlaces", l: "W", v: "--m-web" },
  dominio: { n: "Dominios", l: "D", v: "--m-web" },
  correo: { n: "Correos", l: "@", v: "--m-correo" },
  referencia_pago: { n: "Cuentas de cobro", l: "$", v: "--m-pago" },
  ip: { n: "IP", l: "IP", v: "--m-ip" },
  hash: { n: "Hashes", l: "#", v: "--m-hash" },
  billetera: { n: "Billeteras", l: "₿", v: "--m-billetera" },
  app: { n: "Apps", l: "A", v: "--m-app" },
  marca: { n: "Marcas", l: "M", v: "--m-marca" },
  otro: { n: "Otros", l: "?", v: "--m-marca" },
};
const VEREDICTO = { confirmada: ["Confirmada", "--rojo"], investigacion: ["En investigación", "--ambar"], resuelta: ["Resuelta", "--verde"], descartada: ["Descartada", "--tenue"] };
const NIVEL = { fuerte: "--rojo", intermedia: "--ambar", debil: "--verde", ninguna: "--grafo-neutro", indicador: "--grafo-neutro", expediente: "--faro" };
const ESTADO_CASO = { pendiente: "pendiente", cambios: "esperando cambios", aprobado: "publicado", rechazado: "rechazado", retirado: "retirado", duplicado: "duplicado" };
const SITUACION = { activo: "sigue activo", caido: "caído", desconocido: "sin comprobar" };
const LETRA = 'ui-monospace, "DejaVu Sans Mono", Menlo, monospace';

const clase = (n) => (n.clase === "indicador" ? (TIPOS_MAPA[n.tipo] ? n.tipo : "otro") : n.clase);
const nombreNodo = (n) => (n.clase === "reporte" ? `${n.etiqueta}${n.titulo ? " · " + n.titulo : ""}` : n.clase === "expediente" ? `${n.etiqueta} · ${n.titulo}` : n.etiqueta);

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v);
  return e;
}

/**
 * crearMapa(datos, opciones) → { el, recargar(datos), destruir() }
 * datos: { nodos, aristas } tal como los da /api/panel/grafo.
 * opciones.acciones(n) → elementos extra para la ficha (enlaces, botones).
 * opciones.detalle(n) → elemento o promesa con más información para la ficha.
 */
export function crearMapa(datos, { acciones, detalle, grande = false, vacioTexto = "No hay nada que mostrar con estos filtros." } = {}) {
  const raiz = h("div.mapa" + (grande ? ".grande" : ""));
  const svg = el("svg", { class: "mapa-svg", role: "application", "aria-label": "Mapa de investigación. Arrastra para mover, rueda o pellizca para acercar, toca un punto para ver su ficha.", tabindex: 0 });
  const capa = el("g"), gEje = el("g"), gZonas = el("g"), gLados = el("g"), gNodos = el("g");
  capa.append(gEje, gZonas, gLados, gNodos);
  svg.append(capa);
  const mini = el("svg", { class: "mapa-mini", viewBox: "0 0 160 104", "aria-hidden": "true" });
  const miniPuntos = el("g"), miniVista = el("rect", { fill: "none", "stroke-width": 1.5, rx: 2 });
  mini.append(miniPuntos, miniVista);
  const ficha = h("div.mapa-ficha", { "aria-live": "polite" });
  const info = h("span.tenue.mini");
  const buscar = h("input", { type: "search", placeholder: "Buscar en el mapa: número, código, marca…", "aria-label": "Buscar en el mapa" });
  const aciertos = h("span.tenue.mini");
  const vistaSel = h("select", { "aria-label": "Vista" }, h("option", { value: "red" }, "Vista: red"), h("option", { value: "tiempo" }, "Vista: línea de tiempo"));
  const chips = h("div.mapa-chips");
  const rango = h("input", { type: "range", min: 0, max: 1000, step: 1, value: 1000, "aria-label": "Mostrar hasta esta fecha" });
  const rangoTxt = h("span.mini.mapa-fecha", "hoy");
  const play = h("button.boton.chico.fantasma", { type: "button", "aria-label": "Reproducir cómo se formó la red" }, "▶");
  const lineaTiempo = h("div.mapa-tiempo", h("span.mini.tenue", "Hasta"), rango, rangoTxt, play);
  const btnGrande = h("button.boton.chico.fantasma", { type: "button", title: "Agrandar el mapa" }, grande ? "Más pequeño" : "Grande");
  const btnPng = h("button.boton.chico.fantasma", { type: "button", title: "Guardar el mapa como imagen" }, "PNG");
  const lienzo = h("div.mapa-lienzo", svg,
    h("div.mapa-zoom",
      h("button", { type: "button", "aria-label": "Acercar", onclick: () => zoomEn(1.25) }, "+"),
      h("button", { type: "button", "aria-label": "Alejar", onclick: () => zoomEn(0.8) }, "−"),
      h("button", { type: "button", "aria-label": "Ajustar a la pantalla", title: "Ajustar", onclick: () => ajustar(true) }, "⤢")),
    mini, h("div.mapa-vacio", { hidden: true }, vacioTexto));
  const vacioEl = lienzo.querySelector(".mapa-vacio");
  const leyenda = h("details.mapa-leyenda", h("summary", "Leyenda"),
    h("div.leyenda",
      h("span", h("i.l-fuerte"), "Relación fuerte"), h("span", h("i.l-intermedia"), "Intermedia"), h("span", h("i.l-debil"), "Débil"),
      h("span", h("i.l-sugerida"), "Sugerida (sin confirmar)"), h("span", h("i.l-dato"), "Usa este dato"), h("span", h("i.l-exp"), "Del expediente")),
    h("div.leyenda",
      h("span", h("b.m-forma.cuadro"), "Caso (hueco: aún sin publicar)"), h("span", h("b.m-forma.rombo"), "Expediente"), h("span", h("b.m-forma.circulo"), "Dato (más grande: en más casos)"),
      h("span", h("b.m-punto.activo"), "Sigue activo"), h("span", h("b.m-punto.caido"), "Caído"), h("span", h("b.m-punto.victima"), "Puede ser de una víctima")),
    h("p.tenue.mini", "Las zonas punteadas son campañas, con el color de su veredicto. Arrastra un punto para fijarlo donde quieras."));
  vaciar(raiz,
    h("div.mapa-barra", h("div.mapa-buscar", buscar, aciertos), vistaSel, btnGrande, btnPng),
    chips, lineaTiempo,
    h("div.mapa-cuerpo", h("div", lienzo, h("div.mapa-pie", info, leyenda)), ficha));

  // --- Estado -------------------------------------------------------------------------------------
  let nodos = [], lados = [], vecinos = new Map(), zonas = [];
  let W = 800, H = 480, z = { x: 0, y: 0, k: 1 }, vista = "red";
  let ocultos = new Set(), limite = Infinity, t0 = 0, t1 = 0, busq = "", hits = [], hitIdx = -1;
  let sel = null, aislado = null, camino = [], modoCamino = false;
  let raf = 0, ticks = 0, reproduciendo = 0, colores = {};
  const color = (v) => colores[v] || (colores[v] = getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888");

  function cargar(d) {
    colores = {};
    const previas = new Map(nodos.map((n) => [n.id, n]));
    nodos = d.nodos.map((n) => ({ ...n, x: previas.get(n.id)?.x, y: previas.get(n.id)?.y, vx: 0, vy: 0, fijo: previas.get(n.id)?.fijo }));
    const idx = new Map(nodos.map((n) => [n.id, n]));
    lados = d.aristas.map((a) => ({ ...a, s: idx.get(a.a), t: idx.get(a.b) })).filter((a) => a.s && a.t);
    vecinos = new Map(nodos.map((n) => [n, new Set()]));
    for (const l of lados) { vecinos.get(l.s).add(l.t); vecinos.get(l.t).add(l.s); }
    // Cada dato pertenece a la campaña de sus casos (si todos son de la misma).
    for (const n of nodos) {
      if (n.clase !== "indicador") continue;
      const ks = new Set([...vecinos.get(n)].filter((m) => m.clase === "reporte").map((m) => m.campana_id || 0));
      n.campana_id = ks.size === 1 ? [...ks][0] || null : null;
    }
    // El expediente de una campaña (y los datos que solo cuelgan de él) van dentro de la zona de esa campaña.
    for (const n of nodos) {
      if (n.clase !== "expediente") continue;
      const ks = new Set([...vecinos.get(n)].filter((m) => m.clase === "reporte").map((m) => m.campana_id || 0));
      n.campana_id = ks.size === 1 ? [...ks][0] || null : null;
      for (const m of vecinos.get(n)) if (m.clase === "indicador" && ![...vecinos.get(m)].some((r) => r.clase === "reporte")) m.campana_id = n.campana_id;
    }
    const porCampana = new Map();
    for (const n of nodos) if (n.clase === "reporte" && n.campana_id) porCampana.set(n.campana_id, { id: n.campana_id, nombre: n.campana, veredicto: n.veredicto });
    zonas = [...porCampana.values()];
    const fechas = nodos.map((n) => n.fecha && Date.parse(n.fecha)).filter(Boolean);
    t0 = fechas.length ? Math.min(...fechas) : 0; t1 = fechas.length ? Math.max(...fechas) : 0;
    lineaTiempo.hidden = !fechas.length || t0 === t1;
    // Posiciones de partida: cada campaña en su sector, los datos junto a su primer caso.
    const grupos = [...new Set(nodos.map((n) => n.campana_id || 0))];
    for (const n of nodos) {
      if (n.x !== undefined) continue;
      const g = grupos.indexOf(n.campana_id || 0), a = (2 * Math.PI * g) / Math.max(1, grupos.length);
      const r = grupos.length > 1 ? Math.min(W, H) * 0.3 : 0;
      n.x = W / 2 + r * Math.cos(a) + (Math.random() - 0.5) * 120; n.y = H / 2 + r * Math.sin(a) + (Math.random() - 0.5) * 120;
    }
    sel = aislado = null; camino = []; modoCamino = false;
    pintarChips(); construir(); filtrar();
    for (const n of nodos) if (!previas.has(n.id) && anclas.has(n.campana_id)) { const a = anclas.get(n.campana_id); n.x = a.x + (Math.random() - 0.5) * 140; n.y = a.y + (Math.random() - 0.5) * 140; }
    calentar(); pintar(); ajustar(false); animar(40);
    vaciar(ficha, h("p.tenue", nodos.length ? "Toca un caso, un dato o una zona de campaña para ver su ficha." : vacioTexto));
  }

  // --- Dibujo -------------------------------------------------------------------------------------
  function construir() {
    for (const g of [gEje, gZonas, gLados, gNodos, miniPuntos]) g.replaceChildren();
    for (const k of zonas) {
      const c = color((VEREDICTO[k.veredicto] || VEREDICTO.investigacion)[1]);
      k.g = el("g", { class: "mapa-zona", tabindex: 0, role: "button", "aria-label": `Campaña ${k.nombre}` });
      k.circ = el("circle", { fill: c, "fill-opacity": 0.07, stroke: c, "stroke-opacity": 0.6, "stroke-dasharray": "7 6", "stroke-width": 1.5 });
      k.txt = el("text", { "text-anchor": "middle", fill: c, "font-size": 13, "font-weight": 600, "font-family": "system-ui, sans-serif" });
      k.txt.textContent = `${k.nombre} · ${(VEREDICTO[k.veredicto] || VEREDICTO.investigacion)[0]}`;
      k.g.append(k.circ, k.txt);
      k.g.addEventListener("keydown", (e) => { if (e.key === "Enter") fichaCampana(k); });
      gZonas.append(k.g);
    }
    for (const l of lados) {
      const rel = l.nivel !== "indicador" && l.nivel !== "expediente";
      l.el = el("line", { stroke: color(NIVEL[l.nivel] || NIVEL.ninguna), "stroke-width": l.nivel === "fuerte" ? 3.2 : l.nivel === "intermedia" ? 2.4 : rel ? 1.8 : 1.2,
        "stroke-dasharray": l.nivel === "expediente" ? "2 4" : rel && l.estado === "sugerida" ? "7 5" : null, "stroke-linecap": "round" });
      gLados.append(l.el);
    }
    const capaColor = color("--capa"), letraColor = color("--m-letra");
    for (const n of nodos) {
      const t = TIPOS_MAPA[clase(n)], c = color(t.v);
      const g = el("g", { class: "mapa-nodo", tabindex: 0, role: "button", "aria-label": nombreNodo(n) });
      let r;
      if (n.clase === "reporte") {
        r = 11;
        const hueco = n.estado && n.estado !== "aprobado";
        g.append(el("rect", { x: -r, y: -r, width: 2 * r, height: 2 * r, rx: 5, fill: hueco ? capaColor : c, stroke: c, "stroke-width": 2.5 }));
        g.append(letra(t.l, hueco ? c : letraColor, 11));
      } else if (n.clase === "expediente") {
        r = 15;
        g.append(el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 3, transform: "rotate(45)", fill: c, stroke: capaColor, "stroke-width": 2 }));
        g.append(letra(t.l, letraColor, 11));
      } else {
        r = 8 + Math.min(8, (Math.max(1, n.casos || 0) - 1) * 1.6 + (n.expedientes || 0));
        g.append(el("circle", { r, fill: c, stroke: capaColor, "stroke-width": 1.5 }));
        g.append(letra(t.l, letraColor, t.l.length > 1 ? 8 : 10));
        if (n.situacion === "caido") g.append(el("line", { x1: -r * 0.8, y1: r * 0.8, x2: r * 0.8, y2: -r * 0.8, stroke: color("--rojo"), "stroke-width": 2.5, "stroke-linecap": "round" }));
        if (n.situacion === "activo") g.append(el("circle", { cx: r * 0.75, cy: -r * 0.75, r: 4, fill: color("--verde"), stroke: capaColor, "stroke-width": 1.5 }));
        if (n.posible_victima) g.append(el("circle", { cx: -r * 0.75, cy: -r * 0.75, r: 4, fill: color("--amarillo"), stroke: capaColor, "stroke-width": 1.5 }));
      }
      n.r = r;
      n.anillo = el("circle", { r: r + 6, fill: "none", stroke: color("--primario"), "stroke-width": 2.5, display: "none" });
      g.prepend(n.anillo);
      n.etq = el("text", { y: r + 14, "text-anchor": "middle", fill: color("--grafo-texto"), "font-size": 11, "font-family": LETRA, "paint-order": "stroke", stroke: capaColor, "stroke-width": 3 });
      const texto = n.clase === "reporte" ? n.etiqueta : n.clase === "expediente" ? n.etiqueta : String(n.etiqueta);
      n.etq.textContent = texto.length > 26 ? texto.slice(0, 25) + "…" : texto;
      g.append(n.etq);
      const titulo = el("title"); titulo.textContent = [nombreNodo(n), n.tipo_nombre, n.campana, n.fecha && fecha(n.fecha)].filter(Boolean).join(" · "); g.append(titulo);
      g.addEventListener("pointerdown", (e) => empezarArrastre(e, n));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(n); } });
      n.g = g;
      gNodos.append(g);
      n.mini = el("circle", { r: n.clase === "indicador" ? 1.6 : 2.2, fill: c });
      miniPuntos.append(n.mini);
    }
    miniVista.setAttribute("stroke", color("--primario"));
  }
  const letra = (t, c, tam) => { const x = el("text", { y: tam * 0.36, "text-anchor": "middle", fill: c, "font-size": tam, "font-weight": 700, "font-family": "system-ui, sans-serif", "pointer-events": "none" }); x.textContent = t; return x; };

  function filtrar() {
    for (const n of nodos) {
      let v = !ocultos.has(clase(n));
      if (v && n.fecha && Date.parse(n.fecha) > limite) v = false;
      if (v && aislado && n !== aislado && !vecinos.get(aislado).has(n)) v = false;
      n.vis = v;
    }
    // Un dato que se queda sin ningún caso visible (por la fecha) también se esconde.
    for (const n of nodos) if (n.vis && n.clase === "indicador" && limite !== Infinity && ![...vecinos.get(n)].some((m) => m.vis && m.clase !== "indicador")) n.vis = false;
    for (const l of lados) l.vis = l.s.vis && l.t.vis;
    const vs = nodos.filter((n) => n.vis);
    info.textContent = `${vs.filter((n) => n.clase === "reporte").length} casos · ${vs.filter((n) => n.clase === "indicador").length} datos · ${lados.filter((l) => l.vis).length} conexiones`;
    vacioEl.hidden = vs.length > 0;
    ponerAnclas();
    objetivos();
  }

  // Vista línea de tiempo: una fila por campaña, los casos por fecha y los datos debajo de sus casos.
  let filas = [];
  function objetivos() {
    gEje.replaceChildren();
    if (vista !== "tiempo" || !t1) { for (const n of nodos) n.tx = n.ty = undefined; return; }
    const ids = [...new Set(nodos.filter((n) => n.vis && n.clase === "reporte").map((n) => n.campana_id || 0))];
    filas = ids.map((id) => ({ id, nombre: id ? zonas.find((k) => k.id === id)?.nombre : "Sin campaña" }));
    const alto = 150, ancho = Math.max(W, nodos.filter((n) => n.clase === "reporte").length * 34 + 200);
    const x = (t) => 140 + ((t - t0) / Math.max(1, t1 - t0)) * (ancho - 200);
    const y = (id) => 70 + filas.findIndex((f) => f.id === (id || 0)) * alto;
    for (const n of nodos) {
      if (n.clase === "reporte") { n.tx = x(Date.parse(n.fecha)); n.ty = y(n.campana_id); }
      else if (n.clase === "expediente") { n.tx = 60; n.ty = y([...vecinos.get(n)].find((m) => m.clase === "reporte")?.campana_id); }
      else {
        const cs = [...vecinos.get(n)].filter((m) => m.clase === "reporte" && m.vis);
        n.tx = cs.length ? cs.reduce((s, m) => s + x(Date.parse(m.fecha)), 0) / cs.length : 100;
        n.ty = (cs.length ? y(cs[0].campana_id) : 70) + 58;
      }
    }
    const neutro = color("--grafo-neutro"), texto = color("--suave");
    const fmt = new Intl.DateTimeFormat("es", { month: "short", year: "2-digit" });
    const d = new Date(t0); d.setDate(1);
    const pasoMeses = Math.max(1, Math.ceil((t1 - t0) / (86400000 * 30) / 12));
    while (d.getTime() <= t1 + 86400000 * 31) {
      const xx = x(d.getTime());
      gEje.append(el("line", { x1: xx, y1: 30, x2: xx, y2: 70 + filas.length * alto - 40, stroke: neutro, "stroke-opacity": 0.5, "stroke-dasharray": "2 6" }));
      const t = el("text", { x: xx, y: 22, "text-anchor": "middle", fill: texto, "font-size": 11, "font-family": "system-ui, sans-serif" }); t.textContent = fmt.format(d); gEje.append(t);
      d.setMonth(d.getMonth() + pasoMeses);
    }
    filas.forEach((f, i) => {
      const t = el("text", { x: 8, y: 70 + i * alto - 22, fill: texto, "font-size": 12, "font-weight": 600, "font-family": "system-ui, sans-serif" });
      t.textContent = f.nombre || "Campaña"; gEje.append(t);
    });
  }

  // --- Fuerzas (rejilla: solo se comparan vecinos cercanos, aguanta cientos de puntos) -------------
  // Cada campaña tiene su sitio alrededor del centro: así las zonas no se montan unas sobre otras.
  let anclas = new Map();
  function ponerAnclas() {
    anclas = new Map();
    const grupos = [...new Set(nodos.filter((n) => n.vis && n.campana_id).map((n) => n.campana_id))];
    const total = nodos.filter((n) => n.vis).length, sueltos = nodos.filter((n) => n.vis && !n.campana_id).length;
    const R = grupos.length < 2 && !sueltos ? 0 : Math.max(220, Math.sqrt(total) * 34 + (sueltos ? Math.sqrt(sueltos) * 18 : 0));
    grupos.forEach((k, i) => { const a = (2 * Math.PI * i) / grupos.length - Math.PI / 2; anclas.set(k, { x: W / 2 + R * Math.cos(a), y: H / 2 + R * Math.sin(a) }); });
  }
  function paso(alfa) {
    const vs = nodos.filter((n) => n.vis), celda = 110, rejilla = new Map();
    for (const n of vs) { const k = `${Math.floor(n.x / celda)},${Math.floor(n.y / celda)}`; if (!rejilla.has(k)) rejilla.set(k, []); rejilla.get(k).push(n); }
    const tiempo = vista === "tiempo" && t1;
    for (const n of vs) {
      const cx = Math.floor(n.x / celda), cy = Math.floor(n.y / celda);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        for (const m of rejilla.get(`${cx + i},${cy + j}`) || []) {
          if (m === n) continue;
          let dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy;
          if (d2 > celda * celda) continue;
          if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.25; }
          const d = Math.sqrt(d2), f = Math.min(12, ((tiempo ? 380 : 1100) + (n.r + m.r) * 30) / d2);
          n.vx += (dx / d) * f; n.vy += (dy / d) * f;
        }
      }
    }
    if (!tiempo) {
      for (const l of lados) {
        if (!l.vis) continue;
        const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const ideal = l.nivel === "indicador" ? 70 : l.nivel === "expediente" ? 95 : 120, f = (d - ideal) * 0.03;
        l.s.vx += (dx / d) * f; l.s.vy += (dy / d) * f; l.t.vx -= (dx / d) * f; l.t.vy -= (dy / d) * f;
      }
    }
    for (const n of vs) {
      if (n.fijo) { n.vx = n.vy = 0; continue; }
      if (tiempo && n.tx !== undefined) { n.vx += (n.tx - n.x) * 0.15; n.vy += (n.ty - n.y) * 0.15; }
      else {
        const a = anclas.get(n.campana_id) || { x: W / 2, y: H / 2 }, f = n.campana_id ? 0.015 : 0.004;
        n.vx += (a.x - n.x) * f; n.vy += (a.y - n.y) * f;
      }
      n.vx = Math.max(-30, Math.min(30, n.vx)) * 0.55; n.vy = Math.max(-30, Math.min(30, n.vy)) * 0.55;
      n.x += n.vx * alfa; n.y += n.vy * alfa;
    }
  }
  function calentar() { const n = nodos.length; const pasos = n > 600 ? 120 : n > 200 ? 220 : 320; for (let i = 0; i < pasos; i++) paso(1 - (i / pasos) * 0.6); }
  function animar(n = 70) {
    ticks = n;
    if (raf) return;
    const f = () => { if (ticks-- > 0) { paso(Math.max(0.25, ticks / n)); pintar(); raf = requestAnimationFrame(f); } else { raf = 0; pintar(); } };
    raf = requestAnimationFrame(f);
  }

  function pintar() {
    const enCamino = new Set(camino), foco = sel ? new Set([sel, ...vecinos.get(sel)]) : null, aciertoSet = new Set(hits);
    const visibles = nodos.filter((n) => n.vis), muchos = visibles.length > 70;
    for (const k of zonas) {
      const ms = nodos.filter((n) => n.vis && n.campana_id === k.id);
      if (!ms.length || vista === "tiempo") { k.g.setAttribute("display", "none"); k.vis = false; continue; }
      k.g.removeAttribute("display");
      const cx = ms.reduce((s, n) => s + n.x, 0) / ms.length, cy = ms.reduce((s, n) => s + n.y, 0) / ms.length;
      const r = Math.max(60, ...ms.map((n) => Math.hypot(n.x - cx, n.y - cy) + n.r + 26));
      k.circ.setAttribute("cx", cx); k.circ.setAttribute("cy", cy); k.circ.setAttribute("r", r);
      k.txt.setAttribute("x", cx); k.txt.setAttribute("y", cy - r - 8);
      k.cx = cx; k.cy = cy; k.r = r; k.vis = true;
    }
    for (const l of lados) {
      if (!l.vis) { l.el.setAttribute("display", "none"); continue; }
      l.el.removeAttribute("display");
      l.el.setAttribute("x1", l.s.x); l.el.setAttribute("y1", l.s.y); l.el.setAttribute("x2", l.t.x); l.el.setAttribute("y2", l.t.y);
      const enRuta = camino.length > 1 && enCamino.has(l.s) && enCamino.has(l.t) && Math.abs(camino.indexOf(l.s) - camino.indexOf(l.t)) === 1;
      const apagado = (camino.length > 1 && !enRuta) || (!camino.length && foco && !(foco.has(l.s) && foco.has(l.t)) && !(l.s === sel || l.t === sel));
      l.el.setAttribute("opacity", apagado ? 0.1 : 0.85);
      if (enRuta) { l.el.setAttribute("stroke", color("--primario")); l.el.setAttribute("stroke-width", 5); }
      else { l.el.setAttribute("stroke", color(NIVEL[l.nivel] || NIVEL.ninguna)); l.el.setAttribute("stroke-width", l.nivel === "fuerte" ? 3.2 : l.nivel === "intermedia" ? 2.4 : l.nivel === "indicador" || l.nivel === "expediente" ? 1.2 : 1.8); }
    }
    for (const n of nodos) {
      if (!n.vis) { n.g.setAttribute("display", "none"); n.mini.setAttribute("display", "none"); continue; }
      n.g.removeAttribute("display"); n.mini.removeAttribute("display");
      n.g.setAttribute("transform", `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      const resaltado = n === sel || enCamino.has(n) || aciertoSet.has(n);
      const apagado = camino.length > 1 ? !enCamino.has(n) : foco ? !foco.has(n) : busq ? !aciertoSet.has(n) : false;
      n.g.setAttribute("opacity", apagado ? 0.18 : 1);
      n.anillo.setAttribute("display", resaltado ? "inline" : "none");
      const importante = n.clase !== "indicador" || n.casos >= 2;
      n.etq.setAttribute("display", resaltado || (foco && foco.has(n)) || z.k >= 1.3 || (importante && (!muchos || z.k >= 0.9)) ? "inline" : "none");
    }
    capa.setAttribute("transform", `translate(${z.x.toFixed(1)},${z.y.toFixed(1)}) scale(${z.k.toFixed(3)})`);
    pintarMini(visibles);
  }

  let cajaMundo = { x: 0, y: 0, w: 1, h: 1 };
  function pintarMini(vs) {
    if (!vs.length) return;
    const xs = vs.map((n) => n.x), ys = vs.map((n) => n.y);
    const x0 = Math.min(...xs) - 40, y0 = Math.min(...ys) - 40, w = Math.max(...xs) - x0 + 40, hh = Math.max(...ys) - y0 + 40;
    const e = Math.min(160 / w, 104 / hh);
    cajaMundo = { x: x0, y: y0, w, h: hh, e, ox: (160 - w * e) / 2, oy: (104 - hh * e) / 2 };
    for (const n of vs) { n.mini.setAttribute("cx", (cajaMundo.ox + (n.x - x0) * e).toFixed(1)); n.mini.setAttribute("cy", (cajaMundo.oy + (n.y - y0) * e).toFixed(1)); }
    const vx = (-z.x / z.k - x0) * e + cajaMundo.ox, vy = (-z.y / z.k - y0) * e + cajaMundo.oy;
    const x1 = Math.min(158, Math.max(2, vx)), y1 = Math.min(102, Math.max(2, vy));
    const x2 = Math.min(158, Math.max(x1 + 4, vx + (W / z.k) * e)), y2 = Math.min(102, Math.max(y1 + 4, vy + (H / z.k) * e));
    miniVista.setAttribute("x", x1); miniVista.setAttribute("y", y1); miniVista.setAttribute("width", x2 - x1); miniVista.setAttribute("height", y2 - y1);
  }

  // --- Vista: mover, acercar, ajustar ------------------------------------------------------------
  function zoomEn(f, px = W / 2, py = H / 2) {
    const k = Math.max(0.15, Math.min(4, z.k * f));
    z.x = px - ((px - z.x) * k) / z.k; z.y = py - ((py - z.y) * k) / z.k; z.k = k; pintar();
  }
  function ajustar(animado) {
    const vs = nodos.filter((n) => n.vis);
    if (!vs.length) { pintar(); return; }
    const zs = vista === "red" ? zonas.filter((k) => k.vis && k.r) : [];
    const x0 = Math.min(...vs.map((n) => n.x - 50), ...zs.map((k) => k.cx - k.r - 10)), x1 = Math.max(...vs.map((n) => n.x + 50), ...zs.map((k) => k.cx + k.r + 10));
    const y0 = Math.min(...vs.map((n) => n.y - 60), ...zs.map((k) => k.cy - k.r - 30)), y1 = Math.max(...vs.map((n) => n.y + 50), ...zs.map((k) => k.cy + k.r + 10));
    const k = Math.max(0.15, Math.min(1.6, W / (x1 - x0), H / (y1 - y0)));
    const destino = { k, x: (W - (x0 + x1) * k) / 2, y: (H - (y0 + y1) * k) / 2 };
    if (!animado) { z = destino; pintar(); return; }
    const ini = { ...z }; let i = 0;
    const f = () => { i++; const t = Math.min(1, i / 14), e = t * (2 - t); z = { k: ini.k + (destino.k - ini.k) * e, x: ini.x + (destino.x - ini.x) * e, y: ini.y + (destino.y - ini.y) * e }; pintar(); if (t < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function centrarEn(n) {
    const k = Math.max(z.k, 1);
    z = { k, x: W / 2 - n.x * k, y: H / 2 - n.y * k }; pintar();
  }

  const punto = (e) => { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }; };
  const dedos = new Map();
  let gesto = null;
  function empezarArrastre(e, n) {
    if (e.button > 0) return;
    e.stopPropagation();
    svg.setPointerCapture?.(e.pointerId);
    dedos.set(e.pointerId, punto(e));
    gesto = { tipo: "nodo", n, inicio: punto(e), nx: n.x, ny: n.y, movido: false };
  }
  svg.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    svg.setPointerCapture?.(e.pointerId);
    dedos.set(e.pointerId, punto(e));
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; gesto = { tipo: "pellizco", d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return; }
    if (!gesto) gesto = { tipo: "mover", inicio: punto(e), zx: z.x, zy: z.y, movido: false, zona: zonas.find((k) => k.g.contains(e.target)) };
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId) || !gesto) return;
    const p = punto(e);
    dedos.set(e.pointerId, p);
    if (gesto.tipo === "pellizco" && dedos.size >= 2) {
      const [a, b] = [...dedos.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesto.d > 0) zoomEn(d / gesto.d, gesto.cx, gesto.cy);
      gesto.d = d; return;
    }
    const dx = p.x - gesto.inicio.x, dy = p.y - gesto.inicio.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) gesto.movido = true;
    if (!gesto.movido) return;
    if (gesto.tipo === "nodo") { gesto.n.x = gesto.nx + dx / z.k; gesto.n.y = gesto.ny + dy / z.k; gesto.n.fijo = true; pintar(); }
    else if (gesto.tipo === "mover") { z.x = gesto.zx + dx; z.y = gesto.zy + dy; pintar(); }
  });
  const soltar = (e) => {
    dedos.delete(e.pointerId);
    if (!gesto) return;
    if (gesto.tipo === "pellizco") { if (!dedos.size) gesto = null; return; }
    if (!gesto.movido) { if (gesto.tipo === "nodo") tocar(gesto.n); else if (gesto.zona) fichaCampana(gesto.zona); else limpiarSeleccion(); }
    else if (gesto.tipo === "nodo") { animar(30); if (sel === gesto.n) mostrarFicha(sel); }
    gesto = null;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", (e) => { dedos.delete(e.pointerId); gesto = null; });
  svg.addEventListener("wheel", (e) => { e.preventDefault(); const p = punto(e); zoomEn(e.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y); }, { passive: false });
  svg.addEventListener("keydown", (e) => {
    if (e.target !== svg) return;
    const m = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
    if (m) { e.preventDefault(); z.x += m[0]; z.y += m[1]; pintar(); }
    else if (e.key === "+" || e.key === "=") zoomEn(1.2); else if (e.key === "-") zoomEn(0.83); else if (e.key === "0") ajustar(true);
    else if (e.key === "Escape") limpiarSeleccion();
  });
  mini.addEventListener("pointerdown", (e) => {
    const r = mini.getBoundingClientRect(), mx = ((e.clientX - r.left) * 160) / r.width, my = ((e.clientY - r.top) * 104) / r.height;
    const wx = cajaMundo.x + (mx - cajaMundo.ox) / cajaMundo.e, wy = cajaMundo.y + (my - cajaMundo.oy) / cajaMundo.e;
    z.x = W / 2 - wx * z.k; z.y = H / 2 - wy * z.k; pintar();
  });

  // --- Selección, ficha, camino ------------------------------------------------------------------
  function limpiarSeleccion() {
    sel = null; camino = []; modoCamino = false; pintar();
    vaciar(ficha, h("p.tenue", "Toca un caso, un dato o una zona de campaña para ver su ficha."));
  }
  function tocar(n) {
    if (modoCamino && camino.length === 1 && camino[0] !== n) {
      camino = ruta(camino[0], n); modoCamino = false; sel = null; pintar();
      vaciar(ficha, camino.length
        ? [h("h3", "Cómo se conectan"), h("ol.mapa-ruta", camino.map((x) => h("li", h("button.enlace", { type: "button", onclick: () => { camino = []; tocar(x); centrarEn(x); } }, nombreNodo(x)), h("span.tenue.mini", ` ${TIPOS_MAPA[clase(x)].n.replace(/s$/, "")}`)))),
          h("p.tenue.mini", `${camino.length - 1} saltos.`)]
        : [h("h3", "No están conectados"), h("p.tenue", "Con lo que se ve ahora en el mapa no hay ningún camino entre esos dos puntos. Prueba a quitar filtros o a ampliar.")],
        h("div.fila", h("button.boton.chico", { type: "button", onclick: limpiarSeleccion }, "Quitar resaltado")));
      return;
    }
    camino = [];
    sel = n; pintar(); mostrarFicha(n);
  }
  function ruta(a, b) {
    const prev = new Map([[a, null]]), cola = [a];
    while (cola.length) { const x = cola.shift(); if (x === b) break; for (const v of vecinos.get(x)) if (!prev.has(v) && v.vis) { prev.set(v, x); cola.push(v); } }
    if (!prev.has(b)) return [];
    const r = []; for (let x = b; x; x = prev.get(x)) r.unshift(x); return r;
  }
  async function mostrarFicha(n) {
    const vs = [...vecinos.get(n)].filter((m) => m.vis);
    const t = TIPOS_MAPA[clase(n)];
    const meta = n.clase === "reporte"
      ? [n.tipo, n.fecha && fecha(n.fecha), n.campana && `campaña ${n.campana}`].filter(Boolean).join(" · ")
      : n.clase === "expediente" ? n.titulo
      : [n.tipo_nombre, `en ${n.casos} ${n.casos === 1 ? "caso" : "casos"}`, n.expedientes ? `y ${n.expedientes} ${n.expedientes === 1 ? "expediente" : "expedientes"}` : null, n.fecha && `desde ${fecha(n.fecha)}`].filter(Boolean).join(" · ");
    const marcas = n.clase === "indicador" ? [insignia(SITUACION[n.situacion] || "sin comprobar", n.situacion === "activo" ? "verde" : n.situacion === "caido" ? "rojo" : ""), n.posible_victima ? insignia("posible víctima", "ambar") : null]
      : n.clase === "reporte" && n.estado ? [insignia(ESTADO_CASO[n.estado] || n.estado, "estado-" + n.estado)] : [];
    const extra = h("div.pila");
    vaciar(ficha,
      h("div.mapa-ficha-cab", h("span.mapa-icono", { estilo: { background: color(t.v), color: color("--m-letra") } }, t.l), h("div", h("h3", n.clase === "indicador" ? h("span.indicador", n.etiqueta) : n.etiqueta), h("p.tenue.mini", meta))),
      h("div.fila", marcas),
      vs.length ? h("details.mapa-vecinos", { open: vs.length <= 8 }, h("summary", `Conectado con ${vs.length}`),
        h("ul.lista-limpia", vs.slice(0, 40).map((m) => h("li", h("button.enlace", { type: "button", onclick: () => { tocar(m); centrarEn(m); } }, h("span.mapa-punto", { estilo: { background: color(TIPOS_MAPA[clase(m)].v) } }), nombreNodo(m)))))) : h("p.tenue.mini", "Sin conexiones visibles."),
      h("div.fila.mapa-acciones",
        h("button.boton.chico", { type: "button", onclick: () => { aislado = aislado === n ? null : n; filtrar(); animar(50); setTimeout(() => ajustar(true), 350); mostrarFicha(n); } }, aislado === n ? "Ver todo otra vez" : "Ver solo sus conexiones"),
        h("button.boton.chico", { type: "button", onclick: () => { modoCamino = true; camino = [n]; sel = n; pintar(); toast("Ahora toca el otro punto del mapa.", "info", 3500); } }, "Camino hasta…"),
        h("button.boton.chico.fantasma", { type: "button", onclick: () => { n.fijo = !n.fijo; if (!n.fijo) animar(30); mostrarFicha(n); } }, n.fijo ? "Soltar" : "Fijar aquí"),
        ...(acciones?.(n) || [])),
      extra);
    if (detalle) { try { const d = await detalle(n); if (d && sel === n) extra.append(d); } catch (e) { extra.append(h("p.aviso.error", e.message)); } }
  }
  function fichaCampana(k) {
    const cs = nodos.filter((n) => n.clase === "reporte" && n.campana_id === k.id), ds = nodos.filter((n) => n.clase === "indicador" && n.campana_id === k.id);
    const fs = cs.map((n) => n.fecha).filter(Boolean).sort();
    sel = null; camino = []; pintar();
    vaciar(ficha, h("h3", `Campaña · ${k.nombre}`), h("p.tenue.mini", `${(VEREDICTO[k.veredicto] || VEREDICTO.investigacion)[0]} · ${cs.length} casos · ${ds.length} datos propios${fs.length ? ` · ${fecha(fs[0])} – ${fecha(fs.at(-1))}` : ""}`),
      h("div.fila.mapa-acciones", h("a.boton.chico.primario", { href: `#/admin/campanas/${k.id}` }, "Abrir campaña"),
        zonas.length > 1 ? h("button.boton.chico", { type: "button", onclick: () => ocultarOtras(k) }, "Ver solo esta campaña") : null));
  }
  function ocultarOtras(k) {
    aislado = null;
    for (const n of nodos) n.vis = n.campana_id === k.id || (n.clase === "indicador" && [...vecinos.get(n)].some((m) => m.campana_id === k.id));
    for (const l of lados) l.vis = l.s.vis && l.t.vis;
    animar(50); setTimeout(() => ajustar(true), 350);
    toast("Mostrando solo esta campaña. Toca «Ajustar» o cambia un filtro para volver.", "info", 4000);
  }

  // --- Barra: buscador, vista, filtros, tiempo, pantalla grande, PNG ----------------------------
  function pintarChips() {
    const cuentas = {};
    for (const n of nodos) cuentas[clase(n)] = (cuentas[clase(n)] || 0) + 1;
    vaciar(chips, Object.entries(TIPOS_MAPA).filter(([k]) => cuentas[k]).map(([k, t]) =>
      h("button.mapa-chip" + (ocultos.has(k) ? "" : ".on"), { type: "button", "aria-pressed": String(!ocultos.has(k)), onclick: (e) => {
        ocultos.has(k) ? ocultos.delete(k) : ocultos.add(k);
        e.currentTarget.classList.toggle("on"); e.currentTarget.setAttribute("aria-pressed", String(!ocultos.has(k)));
        filtrar(); animar(50);
      } }, h("span.mapa-punto", { estilo: { background: color(t.v) } }), `${t.n} ${cuentas[k]}`)));
  }
  buscar.addEventListener("input", () => {
    busq = buscar.value.trim().toLowerCase().replace(/[\s\-().]/g, "");
    hits = busq.length < 2 ? [] : nodos.filter((n) => n.vis && [n.etiqueta, n.titulo, n.campana, n.clave].filter(Boolean).some((v) => String(v).toLowerCase().replace(/[\s\-().]/g, "").includes(busq)));
    if (busq.length < 2) busq = "";
    hitIdx = -1;
    aciertos.textContent = busq ? (hits.length ? `${hits.length} ${hits.length === 1 ? "coincidencia" : "coincidencias"} · Intro para ir` : "Sin coincidencias") : "";
    pintar();
  });
  buscar.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !hits.length) return;
    e.preventDefault(); hitIdx = (hitIdx + 1) % hits.length; const n = hits[hitIdx]; sel = n; centrarEn(n); mostrarFicha(n);
  });
  vistaSel.addEventListener("change", () => { vista = vistaSel.value; for (const n of nodos) n.fijo = false; filtrar(); animar(90); setTimeout(() => ajustar(true), 700); });
  const ponerLimite = (v) => {
    limite = v >= 1000 ? Infinity : t0 + ((t1 - t0) * v) / 1000;
    rangoTxt.textContent = v >= 1000 ? "hoy" : fecha(new Date(limite).toISOString().slice(0, 10));
    filtrar(); animar(25);
  };
  rango.addEventListener("input", () => ponerLimite(Number(rango.value)));
  play.addEventListener("click", () => {
    if (reproduciendo) { clearInterval(reproduciendo); reproduciendo = 0; play.textContent = "▶"; return; }
    let v = 0; rango.value = 0; ponerLimite(0); play.textContent = "❚❚";
    reproduciendo = setInterval(() => { v = Math.min(1000, v + 20); rango.value = v; ponerLimite(v); if (v >= 1000) { clearInterval(reproduciendo); reproduciendo = 0; play.textContent = "▶"; } }, 140);
  });
  btnGrande.addEventListener("click", () => {
    const g = raiz.classList.toggle("grande");
    btnGrande.textContent = g ? "Más pequeño" : "Grande";
    if (g) raiz.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  btnPng.addEventListener("click", exportarPng);

  function exportarPng() {
    const vs = nodos.filter((n) => n.vis);
    if (!vs.length) { toast("No hay nada que guardar.", "error"); return; }
    const pad = 70, x0 = Math.min(...vs.map((n) => n.x)) - pad, y0 = Math.min(...vs.map((n) => n.y)) - pad - 20;
    const w = Math.max(...vs.map((n) => n.x)) - x0 + pad, hh = Math.max(...vs.map((n) => n.y)) - y0 + pad + 30;
    const escala = Math.min(2, 4000 / Math.max(w, hh));
    const copia = capa.cloneNode(true);
    copia.removeAttribute("transform");
    copia.querySelectorAll("[display=none]").forEach((x) => x.remove());
    copia.querySelectorAll("text").forEach((t) => t.removeAttribute("display"));
    const pie = `<text x="${x0 + 16}" y="${y0 + hh - 14}" fill="${color("--suave")}" font-size="12" font-family="system-ui, sans-serif">CODICE · mapa de investigación · ${new Date().toLocaleString("es")} · uso interno del equipo</text>`;
    const fuente = `<svg xmlns="${NS}" viewBox="${x0} ${y0} ${w} ${hh}" width="${Math.round(w * escala)}" height="${Math.round(hh * escala)}"><rect x="${x0}" y="${y0}" width="${w}" height="${hh}" fill="${color("--capa")}"/>${new XMLSerializer().serializeToString(copia)}${pie}</svg>`;
    const url = URL.createObjectURL(new Blob([fuente], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const lienzoPng = document.createElement("canvas");
      lienzoPng.width = Math.round(w * escala); lienzoPng.height = Math.round(hh * escala);
      lienzoPng.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      lienzoPng.toBlob((b) => {
        const a = h("a", { href: URL.createObjectURL(b), download: `mapa-codice-${new Date().toISOString().slice(0, 10)}.png` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("No se pudo crear la imagen.", "error"); };
    img.src = url;
  }

  // --- Tamaño --------------------------------------------------------------------------------------
  const medir = () => {
    const r = svg.getBoundingClientRect();
    if (!r.width) return false;
    W = r.width; H = r.height; svg.setAttribute("viewBox", `0 0 ${W} ${H}`); return true;
  };
  const obs = new ResizeObserver(() => { const antes = W; if (medir() && Math.abs(antes - W) > 40) ajustar(false); else pintar(); });
  obs.observe(svg);
  let primera = true;
  const iniciar = () => {
    if (!raiz.isConnected || !medir()) { requestAnimationFrame(iniciar); return; }
    if (primera) { primera = false; cargar(datos); }
  };
  requestAnimationFrame(iniciar);

  return {
    el: raiz,
    recargar: (d) => { datos = d; if (primera) return; cargar(d); },
    seleccionar: (id) => { const n = nodos.find((x) => x.id === id); if (n) { tocar(n); centrarEn(n); } },
    destruir: () => { obs.disconnect(); cancelAnimationFrame(raf); clearInterval(reproduciendo); },
  };
}
