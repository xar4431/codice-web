// Cola de reportes y revisión rápida (lista a la izquierda, detalle a la derecha).
import { panel, blobUrl, obtenerCatalogos } from "../api.js";
import { h, vaciar, insignia, fecha, fechaHora, toast, dialogo, campo, seleccion, cargando, vacio, NIVELES, pestanas, bytes } from "../ui.js";
import { conDeshacer, puede } from "./panel.js";

const ESTADOS = [["pendiente", "Pendientes"], ["cambios", "Esperan cambios"], ["aprobado", "Publicados"], ["rechazado", "Rechazados"], ["retirado", "Retirados"], ["duplicado", "Duplicados"]];
let plantillas = null;

export async function mostrar(caja, [id], params) {
  const estado = params.get("estado") || "pendiente";
  const q = params.get("q") || "";
  const lista = h("div.tarjeta.lista");
  const detalle = h("div", id ? cargando() : vacio("Elige un reporte de la lista."));
  const seleccion = new Set();
  const buscar = h("input", { type: "search", placeholder: "Buscar en reportes…", value: q });
  buscar.addEventListener("change", () => { location.hash = `#/admin/cola?estado=${estado}&q=${encodeURIComponent(buscar.value)}`; });
  const lote = h("div.fila", { hidden: true, estilo: { marginBottom: "8px" } });
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Reportes"), h("p", "Ordenados por prioridad: primero lo que coincide con campañas activas."))),
    h("div.fila", { estilo: { marginBottom: "10px" } }, ESTADOS.map(([k, t]) => h("a.boton.chico" + (k === estado ? ".primario" : ""), { href: `#/admin/cola?estado=${k}` }, t)),
      h("a.boton.chico" + (params.get("prioridad") ? ".primario" : ""), { href: "#/admin/cola?prioridad=alta" }, "Urgentes")),
    h("div.dividido", h("div", h("div.campo", buscar), lote, lista), detalle));
  const extra = params.get("prioridad") ? "&prioridad=alta" : "";
  const d = await panel(`/reportes?estado=${estado}&q=${encodeURIComponent(q)}${extra}`);
  const pintarLote = () => {
    lote.hidden = !seleccion.size;
    vaciar(lote, h("span.tenue", `${seleccion.size} seleccionados`),
      puede("revisar") ? [h("button.boton.chico.exito", { type: "button", onclick: () => enLote("aprobar") }, "Aprobar"),
        h("button.boton.chico.peligro", { type: "button", onclick: () => enLote("rechazar") }, "Rechazar")] : null);
  };
  const enLote = async (accion) => {
    let mensaje = "";
    if (accion === "rechazar") { mensaje = await elegirMensaje("Motivo del rechazo (para todos)"); if (mensaje === null) return; }
    const r = await panel("/reportes/lote", { metodo: "POST", datos: { ids: [...seleccion], accion, mensaje } });
    conDeshacer(`${r.hechos} reportes actualizados.`, r.deshacer, () => location.reload());
    location.hash = `#/admin/cola?estado=${estado}`;
  };
  vaciar(lista, d.reportes.length ? h("ul.lista-limpia", d.reportes.map((r) => {
    const cb = h("input", { type: "checkbox", "aria-label": `Seleccionar ${r.codigo}`, onchange: () => { cb.checked ? seleccion.add(r.id) : seleccion.delete(r.id); pintarLote(); } });
    return h("li", { clase: String(r.id) === id ? "seleccionado" : null }, h("div.elemento", estado === "pendiente" ? cb : null,
      h("a.crece", { href: `#/admin/cola/${r.id}?estado=${estado}&sin-subir=1`, estilo: { color: "inherit", textDecoration: "none" } },
        h("span.titulo", `${r.codigo} · ${r.tipo_nombre}`), h("span.meta", `${r.municipio} · ${fechaHora(r.creado)} · ${r.pruebas} pruebas`),
        h("span.meta", { estilo: { display: "block" } }, r.extracto)),
      r.prioridad >= 60 ? insignia("urgente", "rojo") : r.campana_id ? insignia("campaña", "ambar") : null));
  })) : vacio("No hay reportes aquí."), d.total > 50 ? h("p.tenue", `Mostrando 50 de ${d.total}.`) : null);
  if (id) await pintarDetalle(detalle, Number(id), estado);
}

async function elegirMensaje(titulo, ambito = "reporte", obligatorio = true) {
  plantillas ||= (await panel("/plantillas")).plantillas;
  const t = h("textarea", { maxlength: 3000 });
  const sel = h("select", h("option", { value: "" }, "Usar una plantilla…"), plantillas.filter((p) => p.ambito === ambito).map((p) => h("option", { value: p.id }, p.titulo)));
  sel.addEventListener("change", () => { const p = plantillas.find((x) => String(x.id) === sel.value); if (p) t.value = p.texto; });
  const r = await dialogo(titulo, h("div", sel, h("div", { estilo: { height: "10px" } }), campo("Mensaje para quien reportó", t)), { acciones: [
    { texto: "Cancelar", valor: null, clase: "fantasma" },
    { texto: "Aceptar", valor: "ok", clase: "primario", antes: () => { if (obligatorio && !t.value.trim()) { toast("Escribe un mensaje.", "error"); return false; } } }] });
  return r ? t.value : null;
}

async function pintarDetalle(caja, id, estado) {
  const r = (await panel(`/reportes/${id}`)).reporte;
  const cat = await obtenerCatalogos();
  const recargar = () => pintarDetalle(caja, id, estado);
  const accion = async (nombre, datos = {}) => {
    try {
      const x = await panel(`/reportes/${id}/accion`, { metodo: "POST", datos: { accion: nombre, ...datos } });
      conDeshacer({ aprobar: "Publicado.", rechazar: "Rechazado.", cambios: "Pedido de cambios enviado.", retirar: "Retirado.", duplicado: "Marcado como duplicado.", pendiente: "Vuelve a pendientes." }[nombre], x.deshacer,
        () => { location.hash = `#/admin/cola/${id}?estado=${estado}&sin-subir=1`; });
      location.hash = r.siguiente ? `#/admin/cola/${r.siguiente}?estado=${estado}&sin-subir=1` : `#/admin/cola?estado=${estado}`;
    } catch (e) { toast(e.message, "error"); }
  };
  const titulo = h("input", { type: "text", value: r.pub_titulo || r.tipo_nombre, maxlength: 160 });
  const resumen = h("textarea", { maxlength: 3000 });
  resumen.value = r.pub_resumen || r.sugerencia_resumen;
  const entidad = h("input", { type: "text", value: r.entidad || "", maxlength: 120 });
  const contenido = h("div");
  const secciones = {
    datos: () => h("div.pila",
      h("div.ficha-meta", h("span", r.tipo_nombre), h("span", r.canal), h("span", `${r.municipio}, ${r.provincia}`), h("span", `Ocurrió: ${fecha(r.fecha)} (${r.precision})`)),
      h("div.aviso", { estilo: { whiteSpace: "pre-wrap" } }, r.descripcion),
      r.entidad ? h("p", "Suplanta a: ", h("strong", r.entidad)) : null,
      h("p.tenue", r.autor ? `Enviado con cuenta: ${r.autor.usuario}${r.autor.confianza !== undefined ? ` · confianza ${r.autor.confianza}` : ""}` : "Enviado sin cuenta",
        r.repetido_origen ? ` · ${r.repetido_origen} reportes más desde la misma conexión esta semana` : "", r.caso_padre ? ` · se suma al caso ${r.caso_padre}` : ""),
      r.autor?.id && puede("revisar") ? h("div.fila", h("a.boton.chico", { href: `#/admin/usuarios/${r.autor.id}` }, "Ver usuario")) : null,
      r.mensajes.length ? h("div.pila", h("h3", "Conversación"), r.mensajes.map((m) => h("div.aviso", h("strong", m.autor === "moderacion" ? "Moderación" : "Denunciante"), h("span.tenue", ` · ${fechaHora(m.creado)}`), h("p", { estilo: { margin: "4px 0 0" } }, m.texto)))) : null),
    indicadores: () => {
      const tipo = seleccion("tipo", cat.indicadores, "telefono", { vacioTexto: null });
      const valor = h("input", { type: "text", placeholder: "Añadir indicador" });
      return h("div.pila",
        h("table.tabla", h("thead", h("tr", h("th", "Tipo"), h("th", "Valor"), h("th", "Otros reportes"), h("th", "Estado"), h("th", ""))),
          h("tbody", r.indicadores.map((i) => h("tr", h("td", i.tipo_nombre), h("td", h("span.indicador", i.valor_original), i.imita ? h("div", h("span.insignia.rojo", "imita a una entidad oficial")) : null, i.origen !== "denunciante" ? h("div.tenue.mini", i.origen) : null),
            h("td", i.veces ? h("a", { href: `#/admin/investigacion?indicador=${encodeURIComponent(`${i.tipo}:${i.valor_norm}`)}` }, `${i.veces} →`) : "0"),
            h("td", insignia(i.estado === "sugerido" ? "sugerido (OCR)" : i.estado, i.estado === "activo" ? "verde" : "")),
            h("td", puede("revisar") ? h("div.fila", i.estado !== "activo" ? h("button.boton.chico", { type: "button", onclick: () => estadoInd(i.id, "activo") }, "Aceptar") : null,
              i.estado !== "descartado" ? h("button.boton.chico.fantasma", { type: "button", onclick: () => estadoInd(i.id, "descartado") }, "Descartar") : null) : null))))),
        puede("revisar") ? h("form.fila", { onsubmit: async (e) => {
          e.preventDefault();
          try { await panel(`/reportes/${id}/indicadores`, { metodo: "POST", datos: { tipo: tipo.value, valor: valor.value } }); recargar(); } catch (err) { toast(err.message, "error"); }
        } }, h("div", { estilo: { width: "180px" } }, tipo), h("div.crece", { estilo: { flex: 1, minWidth: "180px" } }, valor), h("button.boton", { type: "submit" }, "Añadir")) : null);
    },
    pruebas: () => r.pruebas.length ? h("div.pila", r.pruebas.map((p) => tarjetaPrueba(p, r, recargar))) : vacio("Sin pruebas."),
    relaciones: () => h("div.pila",
      r.sugerencia_campana ? h("div.aviso.atencion", r.sugerencia_campana.tipo === "existente"
        ? ["Sugerencia: este reporte encaja en la campaña ", h("strong", r.sugerencia_campana.nombre), ". ",
          h("button.boton.chico", { type: "button", onclick: async () => { await panel(`/campanas/${r.sugerencia_campana.campana_id}/reportes`, { metodo: "POST", datos: { ids: [id] } }); toast("Añadido a la campaña.", "ok"); recargar(); } }, "Añadir a la campaña")]
        : ["Sugerencia: posible campaña nueva con ", String(r.sugerencia_campana.casos), " casos relacionados. ", h("a.boton.chico", { href: "#/admin/campanas?vista=sugerencias" }, "Revisar sugerencias")]) : null,
      r.campana ? h("p", "Campaña: ", h("a", { href: `#/admin/campanas/${r.campana.id}` }, r.campana.nombre)) : null,
      r.relaciones.length ? r.relaciones.map((x) => h("div.tarjeta", { estilo: { padding: "12px" } },
        h("div.fila", { estilo: { justifyContent: "space-between" } }, h("a", { href: `#/admin/cola/${x.otro_id}?sin-subir=1` }, x.otro_codigo),
          h("div.fila", insignia(`${NIVELES[x.nivel_moderador || x.nivel]} · ${x.puntuacion}`, "nivel-" + (x.nivel_moderador || x.nivel)), insignia(x.estado))),
        h("ul.pequeno", x.motivos.map((m) => h("li", m.texto))), x.banderas_texto.length ? h("p.tenue", x.banderas_texto.join(" · ")) : null,
        puede("campanas") ? h("div.fila", h("button.boton.chico", { type: "button", onclick: () => relacion(x.id, "confirmada", recargar) }, "Confirmar"),
          h("button.boton.chico.fantasma", { type: "button", onclick: () => relacion(x.id, "descartada", recargar) }, "Descartar"),
          h("a.boton.chico.fantasma", { href: `#/admin/investigacion?centro=reporte:${id}` }, "Ver en el grafo")) : null)) : vacio("Sin relaciones detectadas.")),
    publico: () => h("div.pila", h("p.suave", "Esto es lo que verá el público. El resumen sugerido ya tapa números y correos: revísalo."),
      campo("Título", titulo), campo("Resumen público", resumen), campo("Entidad suplantada", entidad),
      puede("censurar") ? h("div", h("button.boton", { type: "button", onclick: async () => {
        try { await panel(`/reportes/${id}/publico`, { metodo: "PUT", datos: { pub_titulo: titulo.value, pub_resumen: resumen.value, entidad: entidad.value } }); toast("Versión pública guardada.", "ok"); }
        catch (e) { toast(e.message, "error"); }
      } }, "Guardar versión pública")) : null),
    notas: () => {
      const t = h("textarea", { placeholder: "Nota interna para el equipo" });
      return h("div.pila", r.notas.map((n) => h("div.aviso", h("strong", n.usuario || "—"), h("span.tenue", ` · ${fechaHora(n.creada)}`), h("p", { estilo: { margin: "4px 0 0" } }, n.texto))),
        puede("campanas") ? h("form.pila", { onsubmit: async (e) => { e.preventDefault(); await panel("/notas", { metodo: "POST", datos: { objeto: `reporte:${id}`, texto: t.value } }); recargar(); } }, t, h("div", h("button.boton", { type: "submit" }, "Añadir nota"))) : null,
        h("h3", "Historial de este reporte"), h("ul.lista-limpia", r.historial.map((x) => h("li.elemento.pequeno", h("span.crece", `${x.actor} · ${x.accion}`), h("span.tenue", fechaHora(x.fecha))))));
    },
  };
  const estadoInd = async (iid, est) => { try { await panel(`/indicadores/${iid}`, { metodo: "PATCH", datos: { estado: est } }); recargar(); } catch (e) { toast(e.message, "error"); } };
  vaciar(caja, h("div.tarjeta",
    h("div.fila", { estilo: { justifyContent: "space-between" } }, h("h2", { estilo: { margin: 0 } }, r.codigo),
      h("div.fila", insignia(r.estado_nombre, "estado-" + r.estado), r.prioridad >= 60 ? insignia("urgente", "rojo") : null, h("span.tenue", `recibido ${fechaHora(r.creado)}`))),
    pestanas([["datos", "Datos"], ["indicadores", `Indicadores (${r.indicadores.length})`], ["pruebas", `Pruebas (${r.pruebas.length})`],
      ["relaciones", `Relaciones (${r.relaciones.length})`], ["publico", "Versión pública"], ["notas", "Notas e historial"]], (k) => vaciar(contenido, secciones[k]())),
    contenido,
    h("div.acciones-fijas", puede("revisar") ? [
      r.estado !== "aprobado" ? h("button.boton.exito", { type: "button", onclick: async () => {
        await panel(`/reportes/${id}/publico`, { metodo: "PUT", datos: { pub_titulo: titulo.value, pub_resumen: resumen.value, entidad: entidad.value } }).catch(() => {});
        accion("aprobar");
      } }, "Aprobar y publicar") : null,
      ["pendiente", "cambios"].includes(r.estado) ? h("button.boton", { type: "button", onclick: async () => { const m = await elegirMensaje("Pedir cambios"); if (m !== null) accion("cambios", { mensaje: m }); } }, "Pedir cambios") : null,
      r.estado !== "rechazado" ? h("button.boton.peligro", { type: "button", onclick: async () => {
        const broma = h("input", { type: "checkbox" });
        const m = h("textarea", { placeholder: "Motivo (lo verá quien reportó)" });
        const ok = await dialogo("Rechazar reporte", h("div.pila", campo("Motivo", m), h("label.casilla", broma, h("span", "Es un reporte falso o de broma (baja la confianza de la cuenta)"))),
          { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Rechazar", valor: true, clase: "peligro" }] });
        if (ok) accion("rechazar", { mensaje: m.value, broma: broma.checked });
      } }, "Rechazar") : null,
      h("button.boton.fantasma", { type: "button", onclick: async () => {
        const o = h("input", { type: "text", placeholder: "CDX-26-XXXXX" });
        if (await dialogo("Marcar como duplicado", campo("Código del caso original", o), { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Marcar", valor: true, clase: "primario" }] }))
          accion("duplicado", { duplicado_de: o.value.trim() });
      } }, "Duplicado"),
      !["pendiente"].includes(r.estado) ? h("button.boton.fantasma", { type: "button", onclick: () => accion("pendiente") }, "Volver a pendiente") : null] : null,
      puede("retirar") && r.estado === "aprobado" ? h("button.boton.fantasma", { type: "button", onclick: async () => { const m = await elegirMensaje("Retirar publicación", "reporte", false); if (m !== null) accion("retirar", { mensaje: m }); } }, "Retirar") : null,
      puede("retirar") ? h("button.boton.fantasma", { type: "button", onclick: async () => {
        const x = await panel("/papelera/mover", { metodo: "POST", datos: { tipo: "reporte", id } });
        conDeshacer("Movido a la papelera (30 días).", x.deshacer, () => location.reload());
        location.hash = r.siguiente ? `#/admin/cola/${r.siguiente}?estado=${estado}` : `#/admin/cola?estado=${estado}`;
      } }, "Papelera") : null,
      r.siguiente ? h("a.boton.fantasma", { href: `#/admin/cola/${r.siguiente}?estado=${estado}&sin-subir=1` }, "Siguiente →") : null)));
}

async function relacion(xid, estado, recargar) {
  try { await panel(`/relaciones/${xid}`, { metodo: "POST", datos: { estado } }); recargar(); } catch (e) { toast(e.message, "error"); }
}

function tarjetaPrueba(p, r, recargar) {
  const vista = h("div", cargando("Cargando prueba…"));
  const tarjeta = h("div.tarjeta", { estilo: { padding: "12px" } },
    h("div.fila", { estilo: { justifyContent: "space-between" } }, h("strong", p.nombre), h("div.fila", h("span.tenue", `${p.mime} · ${bytes(p.bytes)}`),
      insignia(p.publicar ? "publicada" : "privada", p.publicar ? "verde" : ""), p.antivirus === "limpio" ? insignia("antivirus OK", "verde") : null)),
    p.repetida_en.length ? h("div.aviso.atencion", `Esta misma prueba aparece en: ${p.repetida_en.join(", ")} (posible reenvío).`) : null,
    vista, p.texto_ocr ? h("details", h("summary", "Texto leído (OCR)"), h("pre.pequeno", { estilo: { whiteSpace: "pre-wrap" } }, p.texto_ocr)) : null);
  (async () => {
    if (!puede("datos_privados")) { vaciar(vista, h("p.tenue", "Tu rol no permite ver originales.")); return; }
    try {
      const url = await blobUrl(`/api/panel/pruebas/${p.id}/original`);
      if (p.mime.startsWith("image/") && p.mime !== "image/heic") {
        vaciar(vista, h("img", { src: url, alt: p.nombre, estilo: { maxHeight: "360px", borderRadius: "10px" } }),
          puede("censurar") ? h("div.fila", { estilo: { marginTop: "8px" } },
            h("button.boton.chico.primario", { type: "button", onclick: () => editorTapado(p, url, r, recargar) }, p.publicar ? "Editar zonas tapadas" : "Tapar datos y publicar"),
            p.publicar ? h("button.boton.chico.fantasma", { type: "button", onclick: async () => { await panel(`/pruebas/${p.id}/publicar`, { metodo: "POST", datos: { publicar: false } }); recargar(); } }, "Dejar de publicar") : null) : null);
      } else {
        vaciar(vista, p.mime.startsWith("video/") ? h("video", { src: url, controls: true, estilo: { maxHeight: "360px", width: "100%" } })
          : p.mime.startsWith("audio/") ? h("audio", { src: url, controls: true }) : h("a.boton.chico", { href: url, target: "_blank" }, "Abrir documento"),
          puede("censurar") ? h("div.pila", { estilo: { marginTop: "8px" } }, h("p.tenue", "Para publicar un PDF, video o audio, sube una copia revisada con los datos tapados."),
            subidaPublica(p, recargar)) : null);
      }
    } catch (e) { vaciar(vista, h("p.tenue", e.message)); }
  })();
  return tarjeta;
}

function subidaPublica(p, recargar) {
  const a = h("input", { type: "file", accept: "image/*,application/pdf,video/*" });
  return h("form.fila", { onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("datos", JSON.stringify({ publicar: true }));
    if (a.files[0]) fd.append("archivo", a.files[0]);
    try { const { subir } = await import("../api.js"); await subir(`/api/panel/pruebas/${p.id}/publicar`, fd, null, { panel: true }); toast("Copia pública guardada.", "ok"); recargar(); }
    catch (err) { toast(err.message, "error"); }
  } }, a, h("button.boton.chico", { type: "submit" }, "Subir y publicar"));
}

async function editorTapado(p, url, r, recargar) {
  const cuadros = (p.rectangulos || []).map((x) => [...x]);
  const img = h("img", { src: url, alt: "Prueba", draggable: "false" });
  const lienzo = h("div.editor-tapado", img);
  const pintar = () => {
    lienzo.querySelectorAll(".cuadro").forEach((e) => e.remove());
    cuadros.forEach(([x, y, w, hh], i) => {
      const c = h("div.cuadro", { title: "Toca para quitar", onclick: (e) => { e.stopPropagation(); cuadros.splice(i, 1); pintar(); } });
      Object.assign(c.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${hh * 100}%` });
      lienzo.append(c);
    });
  };
  let inicio = null, temporal = null;
  const rel = (e) => { const b = img.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))]; };
  lienzo.addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("cuadro") || e.target.classList.contains("sugerido")) return;
    inicio = rel(e); temporal = h("div.cuadro"); lienzo.append(temporal); lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener("pointermove", (e) => {
    if (!inicio) return;
    const [x, y] = rel(e);
    Object.assign(temporal.style, { left: `${Math.min(x, inicio[0]) * 100}%`, top: `${Math.min(y, inicio[1]) * 100}%`, width: `${Math.abs(x - inicio[0]) * 100}%`, height: `${Math.abs(y - inicio[1]) * 100}%` });
  });
  lienzo.addEventListener("pointerup", (e) => {
    if (!inicio) return;
    const [x, y] = rel(e);
    const w = Math.abs(x - inicio[0]), hh = Math.abs(y - inicio[1]);
    if (w > 0.005 && hh > 0.005) cuadros.push([Math.min(x, inicio[0]), Math.min(y, inicio[1]), w, hh]);
    inicio = null; temporal?.remove(); pintar();
  });
  const sugerir = async () => {
    try {
      const c = (await panel(`/pruebas/${p.id}/cajas`)).cajas;
      if (!c.length) { toast("No se encontraron datos que tapar automáticamente.", "info"); return; }
      c.forEach((s) => {
        const m = 0.004;
        const el = h("div.sugerido", { title: `${s.motivo}: ${s.texto} (toca para tapar)`, onclick: (e) => { e.stopPropagation(); cuadros.push([s.x - m, s.y - m, s.w + 2 * m, s.h + 2 * m]); el.remove(); pintar(); } });
        Object.assign(el.style, { left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%`, height: `${s.h * 100}%` });
        lienzo.append(el);
      });
      toast(`${c.length} posibles datos marcados en naranja: toca los que quieras tapar.`, "info");
    } catch (e) { toast(e.message, "error"); }
  };
  pintar();
  const ok = await dialogo("Tapar datos de la víctima", h("div.pila",
    h("p.suave", "Arrastra sobre la imagen para dibujar cuadros negros. Toca un cuadro para quitarlo. Al publicar se quitan los metadatos (GPS, modelo del teléfono) y se añade la marca de agua."),
    h("div.fila", h("button.boton.chico", { type: "button", onclick: sugerir }, "Marcar datos automáticamente"), h("button.boton.chico.fantasma", { type: "button", onclick: () => { cuadros.length = 0; pintar(); } }, "Quitar todos")),
    h("div.centro", lienzo)), { ancho: true, acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Guardar y publicar", valor: true, clase: "primario" }] });
  if (!ok) return;
  try {
    await panel(`/pruebas/${p.id}/publicar`, { metodo: "POST", datos: { publicar: true, rectangulos: cuadros } });
    toast(`Prueba lista para el público (con marca de agua «${r.codigo}»).`, "ok");
    recargar();
  } catch (e) { toast(e.message, "error"); }
}
