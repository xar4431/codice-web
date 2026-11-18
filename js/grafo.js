// Grafo interactivo sin librerías: disposición por fuerzas, arrastrar, acercar y tocar nodos.
const NS = "http://www.w3.org/2000/svg";
const COLOR_ARISTA = { fuerte: "#F04438", intermedia: "#F0A020", debil: "#3FB950", indicador: "#3B4A66", ninguna: "#3B4A66" };
const COLOR_NODO = { reporte: "#38BDF8", caso: "#38BDF8", telefono: "#F0A020", referencia_pago: "#F04438", url: "#A78BFA",
  dominio: "#A78BFA", perfil: "#3FB950", correo: "#FDE68A", otro: "#9AA6BF", indicador: "#F0A020" };

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function dibujarGrafo(svg, { nodos, aristas }, { alTocar, etiquetas = true } = {}) {
  svg.replaceChildren();
  const ancho = svg.clientWidth || 800, alto = svg.clientHeight || 420;
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  const capa = el("g");
  svg.append(capa);
  const indice = new Map();
  nodos.forEach((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, nodos.length);
    const r = Math.min(ancho, alto) * 0.35;
    indice.set(n.id, Object.assign(n, { x: ancho / 2 + r * Math.cos(a) + Math.random() * 10, y: alto / 2 + r * Math.sin(a) + Math.random() * 10, vx: 0, vy: 0 }));
  });
  const lados = aristas.map((a) => ({ ...a, s: indice.get(a.a), t: indice.get(a.b) })).filter((a) => a.s && a.t);
  // Simulación de fuerzas (resortes + repulsión), unos cientos de pasos.
  const k = Math.sqrt((ancho * alto) / Math.max(1, nodos.length)) * 0.6;
  for (let paso = 0; paso < 260; paso++) {
    const temp = 1 - paso / 260;
    for (let i = 0; i < nodos.length; i++) {
      const p = nodos[i];
      for (let j = i + 1; j < nodos.length; j++) {
        const q = nodos[j];
        let dx = p.x - q.x, dy = p.y - q.y; let d2 = dx * dx + dy * dy || 0.01;
        if (d2 > 90000) continue;
        const f = (k * k) / d2;
        p.vx += dx * f * 0.02; p.vy += dy * f * 0.02; q.vx -= dx * f * 0.02; q.vy -= dy * f * 0.02;
      }
    }
    for (const l of lados) {
      const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d - k) / d) * 0.05;
      l.s.vx += dx * f; l.s.vy += dy * f; l.t.vx -= dx * f; l.t.vy -= dy * f;
    }
    for (const n of nodos) {
      n.vx += (ancho / 2 - n.x) * 0.004; n.vy += (alto / 2 - n.y) * 0.004;
      n.x += Math.max(-20, Math.min(20, n.vx)) * temp; n.y += Math.max(-20, Math.min(20, n.vy)) * temp;
      n.vx *= 0.5; n.vy *= 0.5;
    }
  }
  const lineas = lados.map((l) => {
    const ln = el("line", { stroke: COLOR_ARISTA[l.nivel] || "#3B4A66", "stroke-width": l.nivel === "fuerte" ? 3 : l.nivel === "indicador" ? 1.2 : 2,
      "stroke-dasharray": l.estado === "sugerida" && l.nivel !== "indicador" ? "6 4" : "" });
    capa.append(ln);
    return [ln, l];
  });
  const grupos = nodos.map((n) => {
    const g = el("g", { tabindex: 0, role: "button", "aria-label": `${n.etiqueta}` });
    g.style.cursor = "pointer";
    const esCaso = n.clase === "reporte" || n.tipo === "caso";
    const forma = esCaso ? el("circle", { r: 9, fill: n.estado && n.estado !== "aprobado" ? "#172033" : COLOR_NODO.reporte, stroke: COLOR_NODO.reporte, "stroke-width": 2.5 })
      : el("rect", { x: -8, y: -8, width: 16, height: 16, rx: 3, transform: "rotate(45)", fill: COLOR_NODO[n.tipo] || COLOR_NODO.otro });
    g.append(forma);
    if (etiquetas) {
      const t = el("text", { y: 24, "text-anchor": "middle", fill: "#C9D2E3", "font-size": 11, "font-family": "ui-monospace, monospace" });
      t.textContent = String(n.etiqueta).slice(0, 26);
      g.append(t);
    }
    const tt = el("title"); tt.textContent = [n.etiqueta, n.tipo_nombre || n.tipo, n.campana].filter(Boolean).join(" · "); g.append(tt);
    g.addEventListener("click", () => alTocar?.(n));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alTocar?.(n); } });
    capa.append(g);
    return [g, n];
  });
  const actualizar = () => {
    for (const [ln, l] of lineas) { ln.setAttribute("x1", l.s.x); ln.setAttribute("y1", l.s.y); ln.setAttribute("x2", l.t.x); ln.setAttribute("y2", l.t.y); }
    for (const [g, n] of grupos) g.setAttribute("transform", `translate(${n.x},${n.y})`);
  };
  actualizar();
  // Mover y acercar (ratón y dedos).
  let vista = { x: 0, y: 0, z: 1 }, arrastre = null, nodoArrastrado = null;
  const aplicar = () => capa.setAttribute("transform", `translate(${vista.x},${vista.y}) scale(${vista.z})`);
  const punto = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * (ancho / r.width), y: (e.clientY - r.top) * (alto / r.height) }; };
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("g[role=button]");
    const p = punto(e);
    nodoArrastrado = g ? grupos.find(([x]) => x === g)?.[1] : null;
    arrastre = { ...p, vx: vista.x, vy: vista.y, movido: false };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const p = punto(e);
    if (Math.abs(p.x - arrastre.x) + Math.abs(p.y - arrastre.y) > 4) arrastre.movido = true;
    if (nodoArrastrado && arrastre.movido) { nodoArrastrado.x = (p.x - vista.x) / vista.z; nodoArrastrado.y = (p.y - vista.y) / vista.z; actualizar(); }
    else if (!nodoArrastrado) { vista.x = arrastre.vx + p.x - arrastre.x; vista.y = arrastre.vy + p.y - arrastre.y; aplicar(); }
  });
  svg.addEventListener("pointerup", (e) => { if (arrastre?.movido) e.stopPropagation(); arrastre = null; nodoArrastrado = null; });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = punto(e), f = e.deltaY < 0 ? 1.15 : 1 / 1.15, z = Math.min(4, Math.max(0.3, vista.z * f));
    vista.x = p.x - ((p.x - vista.x) * z) / vista.z; vista.y = p.y - ((p.y - vista.y) * z) / vista.z; vista.z = z; aplicar();
  }, { passive: false });
  return { acercar: (f) => { vista.z = Math.min(4, Math.max(0.3, vista.z * f)); aplicar(); }, centrar: () => { vista = { x: 0, y: 0, z: 1 }; aplicar(); } };
}

export function leyendaGrafo(h) {
  return h("div.leyenda",
    h("span", h("i", { estilo: { background: COLOR_ARISTA.fuerte } }), "Relación fuerte"),
    h("span", h("i", { estilo: { background: COLOR_ARISTA.intermedia } }), "Intermedia"),
    h("span", h("i", { estilo: { background: COLOR_ARISTA.debil } }), "Débil"),
    h("span", h("i", { estilo: { background: COLOR_ARISTA.indicador } }), "Comparte indicador"),
    h("span", "● caso · ◆ indicador (número, tarjeta, enlace…)"));
}
