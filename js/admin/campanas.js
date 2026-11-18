// Campañas: sugerencias automáticas, veredicto, posibles responsables, expedientes.
import { panel, descargar } from "../api.js";
import { dibujarGrafo, leyendaGrafo } from "../grafo.js";
import { h, vaciar, insignia, fecha, fechaHora, toast, campo, pestanas, vacio, pedirTexto, confirmar, dialogo } from "../ui.js";
import { conDeshacer, puede } from "./panel.js";

const VEREDICTOS = { investigacion: "En investigación", confirmada: "Estafa confirmada (activa)", resuelta: "Resuelta", descartada: "Descartada" };

export async function mostrar(caja, [id], params) {
  if (id) return detalle(caja, Number(id));
  const d = await panel("/campanas");
  const cuerpo = h("div");
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Campañas"), h("p", "El sistema propone; el equipo confirma, nombra, fusiona o separa.")),
    puede("campanas") ? h("button.boton.primario", { type: "button", onclick: async () => {
      const n = await pedirTexto("Nueva campaña", { etiqueta: "Nombre", ayuda: "Ej.: Falsa recarga doble de ETECSA" });
      if (!n) return;
      try { const r = await panel("/campanas", { metodo: "POST", datos: { nombre: n } }); location.hash = `#/admin/campanas/${r.id}`; } catch (e) { toast(e.message, "error"); }
    } }, "+ Nueva campaña") : null),
    h("div.tarjeta", pestanas([["lista", `Campañas (${d.campanas.length})`], ["sugerencias", `Sugerencias (${d.sugerencias.length})`]], (k) => vaciar(cuerpo, k === "lista" ? lista(d.campanas) : sugerencias(d.sugerencias)), params.get("vista") || "lista"), cuerpo));
}

function lista(campanas) {
  if (!campanas.length) return vacio("Todavía no hay campañas. Créalas desde las sugerencias.");
  return h("div.desplazable", h("table.tabla", h("thead", h("tr", h("th", "Campaña"), h("th", "Veredicto"), h("th", "Casos"), h("th", "Periodo"), h("th", "Etiquetas"))),
    h("tbody", campanas.map((k) => h("tr", h("td", h("a", { href: `#/admin/campanas/${k.id}` }, k.nombre), !k.publica ? h("div.tenue.mini", "oculta al público") : null),
      h("td", insignia(VEREDICTOS[k.veredicto], "ver-" + k.veredicto)), h("td", `${k.casos}${k.pendientes ? ` (+${k.pendientes} pend.)` : ""}`),
      h("td.tenue", k.desde ? `${fecha(k.desde)} – ${fecha(k.hasta)}` : "—"), h("td", (k.etiquetas || []).map((e) => insignia(e))))))));
}

function sugerencias(lista) {
  if (!lista.length) return vacio("No hay sugerencias: los reportes relacionados ya están en campañas.");
  return h("div.pila", lista.map((s) => h("div.tarjeta", { estilo: { padding: "14px" } },
    h("p", s.tipo === "existente" ? ["Estos reportes encajan en ", h("strong", s.campana)] : h("strong", "Posible campaña nueva"),
      ": ", s.reportes.map((r, i) => [i ? ", " : "", h("a", { href: `#/admin/cola/${r.id}` }, r.codigo)])),
    puede("campanas") ? h("div.fila",
      s.tipo === "existente" ? h("button.boton.chico.primario", { type: "button", onclick: async () => {
        await panel(`/campanas/${s.campana_id}/reportes`, { metodo: "POST", datos: { ids: s.reportes.map((r) => r.id) } }); toast("Añadidos.", "ok"); location.reload();
      } }, "Añadir a la campaña") : h("button.boton.chico.primario", { type: "button", onclick: async () => {
        const n = await pedirTexto("Crear campaña", { etiqueta: "Nombre", valor: s.nombre_sugerido });
        if (!n) return;
        const r = await panel("/campanas", { metodo: "POST", datos: { nombre: n, reportes: s.reportes.map((x) => x.id) } });
        location.hash = `#/admin/campanas/${r.id}`;
      } }, "Crear campaña con estos casos"),
      h("a.boton.chico.fantasma", { href: `#/admin/investigacion?centro=reporte:${s.reportes[0].id}` }, "Ver en el grafo")) : null)));
}

async function detalle(caja, id) {
  const k = (await panel(`/campanas/${id}`)).campana;
  const recargar = () => detalle(caja, id);
  const f = {
    nombre: h("input", { type: "text", value: k.nombre, maxlength: 120 }),
    veredicto: h("select", Object.entries(VEREDICTOS).map(([v, t]) => h("option", { value: v }, t))),
    resumen: h("textarea", { maxlength: 3000 }), como_opera: h("textarea", { maxlength: 4000 }), como_protegerse: h("textarea", { maxlength: 4000 }),
    responsables: h("textarea", { maxlength: 4000, placeholder: "Solo visible para el equipo. Ej.: titular aparente de la tarjeta 9205…, perfiles vinculados…" }),
    etiquetas: h("input", { type: "text", value: (k.etiquetas || []).join(", "), placeholder: "recargas, sms, habana" }),
    publica: h("input", { type: "checkbox", checked: k.publica }),
  };
  f.veredicto.value = k.veredicto;
  for (const c of ["resumen", "como_opera", "como_protegerse"]) f[c].value = k[c] || "";
  f.responsables.value = k.responsables || "";
  const guardar = async () => {
    const datos = { nombre: f.nombre.value, veredicto: f.veredicto.value, resumen: f.resumen.value, como_opera: f.como_opera.value,
      como_protegerse: f.como_protegerse.value, etiquetas: f.etiquetas.value.split(",").map((s) => s.trim()).filter(Boolean), publica: f.publica.checked };
    if (k.responsables !== null) datos.responsables = f.responsables.value;
    try { await panel(`/campanas/${id}`, { metodo: "PUT", datos }); toast("Campaña guardada.", "ok"); } catch (e) { toast(e.message, "error"); }
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("grafo");
  const contenido = h("div");
  const secciones = {
    ficha: () => h("div.pila", h("div.rejilla", campo("Nombre", f.nombre), campo("Veredicto", f.veredicto)),
      campo("Resumen público", f.resumen), campo("Cómo opera", f.como_opera), campo("Cómo protegerse", f.como_protegerse),
      k.responsables !== null ? h("div.campo", h("label", "Posibles responsables (privado, nunca se publica)"), f.responsables,
        h("div.ayuda", "Recuerda: un número o tarjeta puede ser de una persona a la que se la prestaron o robaron («mula»).")) : null,
      campo("Etiquetas", f.etiquetas, { ayuda: "Separadas por comas." }), h("label.casilla", f.publica, h("span", "Visible en la web pública")),
      puede("campanas") ? h("div.fila", h("button.boton.primario", { type: "button", onclick: guardar }, "Guardar")) : null),
    casos: () => h("div.pila",
      h("table.tabla", h("thead", h("tr", h("th", ""), h("th", "Caso"), h("th", "Estado"), h("th", "Fecha"), h("th", "Lugar"))),
        h("tbody", k.casos.map((r) => h("tr", h("td", h("input", { type: "checkbox", value: r.id, "aria-label": `Seleccionar ${r.codigo}` })),
          h("td", h("a", { href: `#/admin/cola/${r.id}` }, r.codigo)), h("td", insignia(r.estado_nombre, "estado-" + r.estado)), h("td", fecha(r.fecha)), h("td", r.municipio))))),
      puede("campanas") ? h("div.fila",
        h("button.boton.chico", { type: "button", onclick: async () => {
          const t = await pedirTexto("Añadir casos", { etiqueta: "Códigos de caso separados por comas" });
          if (!t) return;
          const codigos = t.split(/[,\s]+/).filter(Boolean);
          const ids = [];
          for (const c of codigos) { const r = (await panel("/buscar?q=" + encodeURIComponent(c))).resultados.find((x) => x.clase === "reporte" && x.titulo === c.toUpperCase()); if (r) ids.push(r.id); }
          if (!ids.length) { toast("No se encontraron esos casos.", "error"); return; }
          await panel(`/campanas/${id}/reportes`, { metodo: "POST", datos: { ids } }); recargar();
        } }, "+ Añadir casos"),
        h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
          const ids = [...contenido.querySelectorAll("input[type=checkbox]:checked")].map((c) => Number(c.value));
          if (!ids.length) { toast("Marca los casos a quitar.", "error"); return; }
          await panel(`/campanas/${id}/reportes`, { metodo: "POST", datos: { ids, quitar: true } }); recargar();
        } }, "Quitar marcados"),
        h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
          const ids = [...contenido.querySelectorAll("input[type=checkbox]:checked")].map((c) => Number(c.value));
          if (!ids.length) { toast("Marca los casos que formarán la nueva campaña.", "error"); return; }
          const n = await pedirTexto("Separar en campaña nueva", { etiqueta: "Nombre de la nueva campaña" });
          if (!n) return;
          const r = await panel(`/campanas/${id}/separar`, { metodo: "POST", datos: { reportes: ids, nombre: n } }); location.hash = `#/admin/campanas/${r.id}`;
        } }, "Separar marcados"),
        h("button.boton.chico.fantasma", { type: "button", onclick: () => fusionar(id) }, "Fusionar con otra")) : null),
    linea: () => h("ul.lista-limpia", k.linea.map((x) => h("li.elemento", h("span.mono.tenue", fecha(x.fecha)), h("span.crece", h("a", { href: `#/admin/cola/${x.id}` }, x.codigo), ` · ${x.tipo} · ${x.municipio}`), insignia(x.estado, "estado-" + x.estado)))),
    indicadores: () => h("ul.lista-limpia", k.indicadores.map((i) => h("li.elemento", h("span.crece", h("span.indicador", i.valor), h("span.meta", ` ${i.tipo_nombre}`)), h("span", `${i.casos} casos`),
      i.clave ? h("a.boton.chico.fantasma", { href: `#/admin/investigacion?indicador=${encodeURIComponent(i.clave)}` }, "Ficha") : null))),
    grafo: () => { setTimeout(async () => { const g = await panel(`/grafo?centro=campana:${id}&profundidad=1`); dibujarGrafo(svg, g, { alTocar: (n) => { if (n.clase === "reporte") location.hash = `#/admin/cola/${n.ref}`; } }); }); return h("div", svg, leyendaGrafo(h), h("a.boton.chico", { href: `#/admin/investigacion?centro=campana:${id}` }, "Abrir en Investigación")); },
    notas: () => {
      const t = h("textarea", { placeholder: "Nota interna" });
      return h("div.pila", k.notas.map((n) => h("div.aviso", h("strong", n.usuario || "—"), h("span.tenue", ` · ${fechaHora(n.creada)}`), h("p", { estilo: { margin: "4px 0 0" } }, n.texto))),
        puede("campanas") ? h("form.pila", { onsubmit: async (e) => { e.preventDefault(); await panel("/notas", { metodo: "POST", datos: { objeto: `campana:${id}`, texto: t.value } }); recargar(); } }, t, h("div", h("button.boton", { type: "submit" }, "Añadir nota"))) : null,
        h("h3", "Historial"), h("ul.lista-limpia", k.historial.map((x) => h("li.elemento.pequeno", h("span.crece", `${x.actor} · ${x.accion}`), h("span.tenue", fechaHora(x.fecha))))));
    },
  };
  vaciar(caja, h("a.volver", { href: "#/admin/campanas" }, "← Campañas"),
    h("div.cabecera-pagina", h("div", insignia(VEREDICTOS[k.veredicto], "ver-" + k.veredicto), h("h1", { estilo: { marginTop: "6px" } }, k.nombre), h("p", `${k.casos.length} casos · actualizada ${fechaHora(k.actualizada)}`)),
      h("div.fila", h("a.boton.chico", { href: `#/campana/${k.slug}`, target: "_blank" }, "Ver pública"),
        puede("expedientes") ? [h("button.boton.chico", { type: "button", onclick: () => descargar(`/api/panel/campanas/${id}/expediente?formato=pdf`, `expediente-${k.slug}.pdf`).catch((e) => toast(e.message, "error")) }, "Expediente PDF"),
          h("button.boton.chico", { type: "button", onclick: () => descargar(`/api/panel/campanas/${id}/expediente?formato=zip`, `expediente-${k.slug}.zip`).catch((e) => toast(e.message, "error")) }, "Expediente ZIP"),
          h("button.boton.chico", { type: "button", onclick: () => descargar(`/api/panel/exportar/reportes.csv?campana=${id}`, `campana-${k.slug}.csv`).catch((e) => toast(e.message, "error")) }, "CSV")] : null,
        puede("retirar") ? h("button.boton.chico.peligro", { type: "button", onclick: async () => {
          if (!(await confirmar("Mover a la papelera", "La campaña se podrá recuperar durante 30 días. Sus casos no se borran.", { boton: "Mover", peligro: true }))) return;
          const x = await panel("/papelera/mover", { metodo: "POST", datos: { tipo: "campana", id } });
          conDeshacer("Campaña en la papelera.", x.deshacer, () => { location.hash = `#/admin/campanas/${id}`; });
          location.hash = "#/admin/campanas";
        } }, "Papelera") : null)),
    h("div.tarjeta", pestanas([["ficha", "Ficha"], ["casos", `Casos (${k.casos.length})`], ["linea", "Línea de tiempo"], ["indicadores", `Indicadores (${k.indicadores.length})`], ["grafo", "Grafo"], ["notas", "Notas e historial"]],
      (x) => vaciar(contenido, secciones[x]())), contenido));
}

async function fusionar(id) {
  const todas = (await panel("/campanas")).campanas.filter((c) => c.id !== id);
  const sel = h("select", todas.map((c) => h("option", { value: c.id }, `${c.nombre} (${c.casos})`)));
  if (!(await dialogo("Fusionar campañas", h("div", h("p.suave", "Los casos y notas de la otra campaña pasarán a esta. La otra irá a la papelera."), campo("Fusionar con", sel)),
    { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Fusionar", valor: true, clase: "primario" }] }))) return;
  await panel(`/campanas/${id}/fusionar`, { metodo: "POST", datos: { con: Number(sel.value) } });
  toast("Campañas fusionadas.", "ok");
  location.reload();
}
