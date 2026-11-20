// Investigación: grafo de reportes e indicadores con filtros y fichas.
import { panel } from "../api.js";
import { dibujarGrafo, leyendaGrafo } from "../grafo.js";
import { h, vaciar, insignia, fecha, fechaHora, toast, campo, cargando } from "../ui.js";
import { puede } from "./panel.js";

export async function mostrar(caja, _p, params) {
  let centro = params.get("centro") || (params.get("indicador") ? `indicador:${params.get("indicador")}` : "");
  const desde = h("input", { type: "date" }), hasta = h("input", { type: "date" });
  const prof = h("select", h("option", { value: 1 }, "1 salto"), h("option", { value: 2 }, "2 saltos"), h("option", { value: 3 }, "3 saltos"));
  prof.value = "2";
  const conf = h("input", { type: "checkbox" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("grafo", "alto");
  const ficha = h("div.tarjeta", h("p.tenue", "Toca un punto del grafo para ver su ficha."));
  const info = h("p.tenue");
  let control;
  const cargar = async () => {
    const q = new URLSearchParams({ centro, profundidad: prof.value });
    if (desde.value) q.set("desde", desde.value);
    if (hasta.value) q.set("hasta", hasta.value);
    if (conf.checked) q.set("confirmadas", "1");
    const g = await panel("/grafo?" + q);
    info.textContent = `${g.nodos.filter((n) => n.clase === "reporte").length} reportes · ${g.nodos.filter((n) => n.clase === "indicador").length} indicadores compartidos${centro ? "" : " · últimos 60 reportes"}`;
    control = dibujarGrafo(svg, g, { alTocar: (n) => (n.clase === "reporte" ? fichaReporte(ficha, n) : fichaIndicador(ficha, n.clave, n, (c) => { centro = c; cargar(); })) });
  };
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Investigación"), h("p", "Ata cabos: casos (●) unidos por datos compartidos (◆) y relaciones calculadas."))),
    h("div.tarjeta", h("div.filtros", h("div", campo("Desde", desde)), h("div", campo("Hasta", hasta)), h("div", campo("Ampliar", prof))),
      h("div.fila", { estilo: { alignItems: "flex-end" } },
      h("label.casilla", { estilo: { marginBottom: "14px" } }, conf, h("span", "Solo publicados")),
      h("button.boton.primario", { type: "button", onclick: cargar, estilo: { marginBottom: "14px" } }, "Aplicar"),
      h("button.boton.fantasma", { type: "button", onclick: () => { centro = ""; cargar(); }, estilo: { marginBottom: "14px" } }, "Ver todo"),
      h("button.boton.fantasma", { type: "button", onclick: () => control?.acercar(1.3), "aria-label": "Acercar", estilo: { marginBottom: "14px" } }, "+"),
      h("button.boton.fantasma", { type: "button", onclick: () => control?.acercar(1 / 1.3), "aria-label": "Alejar", estilo: { marginBottom: "14px" } }, "−")),
      info, svg, leyendaGrafo(h)),
    h("div", { estilo: { marginTop: "14px" } }, ficha));
  await cargar();
  if (params.get("indicador") && puede("datos_privados")) fichaIndicador(ficha, params.get("indicador"), null, (c) => { centro = c; cargar(); });
}

function fichaReporte(caja, n) {
  vaciar(caja, h("h2", n.etiqueta), h("p", insignia(n.estado, "estado-" + n.estado), " ", n.tipo || "", " · ", fecha(n.fecha)),
    n.campana ? h("p", "Campaña: ", h("strong", n.campana)) : null,
    h("div.fila", h("a.boton.chico.primario", { href: `#/admin/cola/${n.ref}` }, "Abrir reporte"), h("a.boton.chico", { href: `#/admin/investigacion?centro=reporte:${n.ref}` }, "Centrar aquí")));
}

async function fichaIndicador(caja, clave, n, centrar) {
  if (!clave) { vaciar(caja, h("h2", n?.etiqueta || "Indicador"), h("p.tenue", "Tu rol no permite ver el valor completo."), h("p", `Aparece en ${n?.casos || "?"} casos.`)); return; }
  vaciar(caja, cargando());
  const [tipo, ...resto] = clave.split(":");
  const valor = resto.join(":");
  try {
    const i = (await panel(`/indicador?tipo=${encodeURIComponent(tipo)}&valor=${encodeURIComponent(valor)}`)).indicador;
    const t = h("textarea", { placeholder: "Nota sobre este indicador (p. ej. «tarjeta de una mula»)" });
    vaciar(caja, h("h2", h("span.indicador", i.valor)), h("p.suave", `${i.tipo_nombre} · en ${i.reportes.length} reportes · desde ${fecha(i.desde)} hasta ${fecha(i.hasta)}`),
      i.campanas.length ? h("p", "Campañas: ", i.campanas.join(", ")) : null,
      h("div.fila", h("button.boton.chico", { type: "button", onclick: () => centrar(`indicador:${clave}`) }, "Centrar el grafo aquí")),
      h("h3", { estilo: { marginTop: "12px" } }, "Historial"),
      h("ul.lista-limpia", i.reportes.map((r) => h("li.elemento", h("span.mono.tenue", fecha(r.fecha_incidente)), h("span.crece", h("a", { href: `#/admin/cola/${r.id}` }, r.codigo), r.campana ? ` · ${r.campana}` : ""),
        insignia(r.estado, "estado-" + r.estado), h("span.tenue.mini", `añadido por ${r.origen} ${fechaHora(r.anadido)}`)))),
      h("h3", "Notas"), i.notas.map((x) => h("div.aviso", h("strong", x.usuario || "—"), ` · ${fechaHora(x.creada)}: `, x.texto)),
      puede("campanas") ? h("form.pila", { onsubmit: async (e) => { e.preventDefault(); await panel("/notas", { metodo: "POST", datos: { objeto: `indicador:${clave}`, texto: t.value } }); toast("Nota guardada.", "ok"); fichaIndicador(caja, clave, n, centrar); } }, t, h("div", h("button.boton.chico", { type: "submit" }, "Añadir nota"))) : null);
  } catch (e) { vaciar(caja, h("p.aviso.error", e.message)); }
}
