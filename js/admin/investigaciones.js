// Investigaciones: bandeja y expediente único para casos, campañas y ataques.
// Todo el equipo trabaja igual: hallazgos con el mismo formato, datos con ficha compartida, cadena de custodia
// y veredicto aprobado por una segunda persona. Sin enlaces ni conexiones a servicios externos.
import { panel, descargar, blobUrl } from "../api.js";
import { crearMapa } from "../mapa.js";
import { h, vaciar, insignia, fecha, fechaHora, hace, toast, campo, cargando, vacio, dialogo, confirmar, pedirTexto, pestanas, copiar, bytes } from "../ui.js";
import { puede, yo } from "./panel.js";
import { detalleDato } from "./investigacion.js";

const VISTAS = [["mias", "Mías"], ["sin_asignar", "Sin asignar"], ["revisar", "Para revisar"], ["todas", "Todas"], ["cerradas", "Cerradas"]];
const CLASE_ESTADO = { abierta: "azul", para_revisar: "ambar", cerrada: "" };
const CLASE_VEREDICTO = { confirmada: "rojo", resuelta: "verde", descartada: "" };
const CLASE_CONFIANZA = { alta: "verde", media: "ambar", baja: "" };
const CORTO = { telefono: "Teléfono", perfil: "Perfil", url: "Enlace", dominio: "Dominio", correo: "Correo", referencia_pago: "Cuenta de cobro", ip: "IP", hash: "Hash", billetera: "Billetera", app: "App", marca: "Marca", otro: "Otro" };
const PRIORIDADES = { alta: "Prioridad alta", normal: "Prioridad normal", baja: "Prioridad baja" };
const AYUDA_HALLAZGO = {
  conexion: "Qué une estos casos entre sí (mismo número, misma web, mismo texto…).",
  identidad: "Quién puede estar detrás. Ojo: un número o tarjeta puede ser de una «mula» o de una víctima.",
  infraestructura: "Webs, dominios, servidores o apps que usan.",
  dinero: "Cuentas, tarjetas, billeteras o forma de cobro.",
  modo: "Cómo engañan: guion, canal, horarios, a quién buscan.",
  otro: "Cualquier otra cosa que ayude a entender el caso.",
};

export async function mostrar(caja, [id], params) {
  if (id) return expediente(caja, Number(id), params.get("ver"));
  return bandeja(caja, params);
}

// --- Bandeja -------------------------------------------------------------------------------------

async function bandeja(caja, params) {
  const vista = params.get("vista") || "mias";
  const q = params.get("q") || "";
  const d = await panel(`/investigaciones?vista=${vista}&q=${encodeURIComponent(q)}`);
  const buscar = h("input", { type: "search", placeholder: "Buscar por código, título o resumen…", value: q, "aria-label": "Buscar expedientes" });
  buscar.addEventListener("change", () => { location.hash = `#/admin/investigaciones?vista=${vista}&q=${encodeURIComponent(buscar.value)}`; });
  vaciar(caja,
    h("div.cabecera-pagina", h("div", h("h1", "Investigaciones"), h("p", "Un expediente por caso, campaña o ataque. Mismo formato para todo el equipo.")),
      h("button.boton.primario", { type: "button", onclick: nuevo }, "+ Nuevo expediente")),
    h("div.bandeja-vistas", { role: "tablist" }, VISTAS.map(([k, t]) => h("a.boton.chico" + (k === d.vista ? ".primario" : ""), { href: `#/admin/investigaciones?vista=${k}`, role: "tab", "aria-selected": String(k === d.vista) },
      t, d.cuentas[k] ? h("span.contador" + (k === "revisar" ? ".rojo" : ""), String(d.cuentas[k])) : null))),
    h("div.campo", { estilo: { marginTop: "10px" } }, buscar),
    d.investigaciones.length ? h("ul.lista-limpia.bandeja", d.investigaciones.map(fila))
      : h("div.tarjeta", vacio({ mias: "No tienes expedientes abiertos. Abre uno nuevo o toma uno de «Sin asignar».", sin_asignar: "Todos los expedientes tienen responsable.",
        revisar: "No hay veredictos esperando tu revisión.", todas: "No hay expedientes abiertos.", cerradas: "Todavía no se ha cerrado ningún expediente." }[d.vista])));
}

function fila(x) {
  return h("li", h("a.tarjeta.expediente-fila", { href: `#/admin/investigaciones/${x.id}` },
    h("div.expediente-cab", h("span.mono.tenue", x.codigo), insignia(x.tipo_nombre), insignia(x.estado_nombre, CLASE_ESTADO[x.estado]),
      x.prioridad === "alta" ? insignia("prioridad alta", "rojo") : null, x.veredicto ? insignia(x.veredicto, CLASE_VEREDICTO[x.veredicto]) : null),
    h("strong.expediente-titulo", x.titulo),
    h("span.tenue.mini", [x.responsable ? `Responsable: ${x.responsable}` : "Sin responsable", `${x.hallazgos} hallazgos`, x.campana ? `campaña ${x.campana}` : null,
      x.propuesta && x.estado === "para_revisar" ? `${x.propuesta.usuario} propone «${x.propuesta.veredicto}»` : null, `actualizado ${hace(x.actualizada)}`].filter(Boolean).join(" · "))));
}

async function nuevo() {
  const tipo = h("div.opciones-tipo", { role: "radiogroup" });
  const extra = h("div");
  const err = h("div.error");
  let elegido = "ataque";
  const codigo = h("input", { type: "text", placeholder: "Ej.: CDC-2026-0042", autocapitalize: "characters" });
  const titulo = h("input", { type: "text", maxlength: 160, placeholder: "Ej.: Phishing de Transfermóvil por SMS" });
  const campana = h("select", h("option", { value: "" }, "Cargando…"));
  const prioridad = h("select", Object.entries(PRIORIDADES).map(([k, t]) => h("option", { value: k }, t)));
  prioridad.value = "normal";
  const pintar = () => {
    tipo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.clave === elegido)));
    vaciar(extra, elegido === "caso" ? campo("Código del caso", codigo, { ayuda: "Lo ves en Reportes. También puedes abrirlo desde el propio caso con «Investigar este caso»." })
      : elegido === "campana" ? campo("Campaña", campana) : campo("Título del expediente", titulo, { ayuda: "Para ataques sin reporte: una web falsa, una APK, una oleada de SMS…" }));
  };
  for (const [k, t, a] of [["ataque", "Ataque o phishing", "Web, APK, SMS… aunque no haya reportes"], ["caso", "Un caso", "Investigar un reporte concreto"], ["campana", "Una campaña", "Investigar y dar veredicto a una campaña"]])
    tipo.append(h("button", { type: "button", role: "radio", datos: { clave: k }, onclick: () => { elegido = k; err.textContent = ""; pintar(); } }, h("strong", t), h("span.tenue.mini", a)));
  pintar();
  panel("/campanas").then((d) => vaciar(campana, d.campanas.map((k) => h("option", { value: k.id }, `${k.nombre} (${k.casos} casos)`)))).catch(() => {});
  const r = await dialogo("Nuevo expediente", h("div.pila", tipo, extra, campo("Prioridad", prioridad), err), {
    acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Abrir expediente", valor: "ok", clase: "primario", antes: async () => {
      const datos = { tipo: elegido, prioridad: prioridad.value };
      try {
        if (elegido === "caso") {
          const c = codigo.value.trim().toUpperCase();
          const res = (await panel("/buscar?q=" + encodeURIComponent(c))).resultados.find((x) => x.clase === "reporte" && x.titulo === c);
          if (!res) { err.textContent = "No encuentro ese código de caso."; return false; }
          datos.reporte_id = res.id;
        } else if (elegido === "campana") datos.campana_id = Number(campana.value);
        else datos.titulo = titulo.value;
        const x = await panel("/investigaciones", { metodo: "POST", datos });
        if (x.existente) toast(`Ese ${elegido === "caso" ? "caso" : "tema"} ya tenía un expediente abierto: ${x.codigo}.`, "info", 6000);
        location.hash = `#/admin/investigaciones/${x.id}`;
      } catch (e) { err.textContent = e.message; return false; }
    } }] });
  return r;
}

// --- Expediente ----------------------------------------------------------------------------------

async function expediente(caja, id, pestanaInicial) {
  const d = await panel(`/investigaciones/${id}`);
  const x = d.expediente, cat = d.catalogo;
  const recargar = (p) => expediente(caja, id, p || actual);
  let actual = pestanaInicial || "resumen";
  const abierta = x.estado !== "cerrada";
  const contenido = h("div");
  const responsable = h("select", { "aria-label": "Responsable" }, h("option", { value: "" }, "Sin responsable"), d.equipo.map((u) => h("option", { value: u.id }, u.usuario)));
  responsable.value = x.responsable_id || "";
  responsable.addEventListener("change", async () => {
    try { await panel(`/investigaciones/${id}`, { metodo: "PUT", datos: { responsable_id: Number(responsable.value) || null } }); toast("Responsable cambiado. Se le avisó en el panel.", "ok"); recargar(); }
    catch (e) { toast(e.message, "error"); }
  });
  const secciones = {
    resumen: () => seccionResumen(x, cat, id, recargar, abierta),
    hallazgos: () => seccionHallazgos(x, cat, id, recargar, abierta),
    datos: () => seccionDatos(x, cat, id, recargar, abierta),
    custodia: () => seccionCustodia(x, id, recargar, abierta),
    mapa: () => seccionMapa(x, id, recargar, abierta),
    notas: () => seccionNotas(x, id, recargar),
  };
  vaciar(caja,
    h("a.volver", { href: "#/admin/investigaciones" }, "← Investigaciones"),
    h("div.cabecera-pagina.expediente",
      h("div",
        h("div.expediente-cab", h("span.mono", x.codigo), insignia(x.tipo_nombre), insignia(x.estado_nombre, CLASE_ESTADO[x.estado]),
          x.prioridad !== "normal" ? insignia(PRIORIDADES[x.prioridad], x.prioridad === "alta" ? "rojo" : "") : null),
        h("h1", x.titulo),
        h("p.tenue", [x.reporte ? h("a", { href: `#/admin/cola/${x.reporte.id}` }, `Caso ${x.reporte.codigo}`) : null,
          x.campana_info ? h("a", { href: `#/admin/campanas/${x.campana_info.id}` }, `Campaña ${x.campana_info.nombre}`) : null,
          `abierto por ${x.creada_por || "—"} · ${fecha(x.creada)}`].filter(Boolean).flatMap((v, i) => (i ? [" · ", v] : [v])))),
      h("div.expediente-responsable", h("label.mini.tenue", "Responsable"), h("div.fila", responsable,
        x.responsable_id !== yo?.id ? h("button.boton.chico", { type: "button", onclick: async () => { await panel(`/investigaciones/${id}/tomar`, { metodo: "POST" }); toast("Ahora eres responsable.", "ok"); recargar(); } }, "Tomarlo yo") : null))),
    x.sugerencia && abierta ? h("div.aviso.atencion", h("strong", "Sugerencia: "), x.sugerencia.texto) : null,
    cajaVeredicto(x, cat, id, recargar),
    h("div.tarjeta", pestanas([["resumen", "Resumen"], ["hallazgos", `Hallazgos (${x.hallazgos.length})`], ["datos", `Datos (${x.datos.length})`],
      ["custodia", `Custodia (${x.custodia.length})`], ["mapa", "Mapa"], ["notas", `Comentarios (${x.notas.length})`]],
    (k) => { actual = k; history.replaceState(null, "", `#/admin/investigaciones/${id}?ver=${k}`); vaciar(contenido, secciones[k]()); }, actual), contenido));
}

function cajaVeredicto(x, cat, id, recargar) {
  const p = x.propuesta;
  if (x.estado === "cerrada") {
    return h("div.veredicto-caja.cerrada", h("div", h("strong", `Veredicto: ${cat.veredictos[x.veredicto] || x.veredicto}`),
      h("p.tenue.mini", `Propuesto por ${p?.usuario || "—"} · aprobado por ${x.aprobado_por || "—"} · ${fechaHora(x.cerrada_en)}`), p?.motivo ? h("p.pequeno", p.motivo) : null),
      h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
        const m = await pedirTexto("Reabrir el expediente", { etiqueta: "¿Por qué se reabre?", largo: true });
        if (!m) return;
        try { await panel(`/investigaciones/${id}/reabrir`, { metodo: "POST", datos: { motivo: m } }); recargar(); } catch (e) { toast(e.message, "error"); }
      } }, "Reabrir"));
  }
  if (x.estado === "para_revisar") {
    return h("div.veredicto-caja.revisar", h("div", h("strong", `${p.usuario} propone: ${cat.veredictos[p.veredicto]}`), h("p.pequeno", p.motivo),
      h("p.tenue.mini", `${fechaHora(p.fecha)} · ${x.puedo_revisar ? "Necesita tu segunda revisión." : p.por === yo?.id ? "Esperando que otra persona del equipo lo revise." : "Esperando revisión."}`)),
      x.puedo_revisar ? h("div.fila",
        h("button.boton.exito", { type: "button", onclick: async () => {
          const c = h("textarea", { rows: 2, placeholder: "Opcional: comentario para el expediente" });
          if (await dialogo("Aprobar veredicto", h("div.pila", h("p", `Vas a cerrar el expediente como «${cat.veredictos[p.veredicto]}».${x.campana_id ? " La campaña tomará ese veredicto." : ""}`), c),
            { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Aprobar y cerrar", valor: "ok", clase: "exito" }] }) !== "ok") return;
          try { await panel(`/investigaciones/${id}/revisar`, { metodo: "POST", datos: { aprobar: true, comentario: c.value } }); toast("Veredicto aprobado.", "ok"); recargar(); } catch (e) { toast(e.message, "error"); }
        } }, "Aprobar"),
        h("button.boton.fantasma", { type: "button", onclick: async () => {
          const m = await pedirTexto("Devolver al responsable", { etiqueta: "¿Qué falta o qué hay que revisar?", largo: true });
          if (!m) return;
          try { await panel(`/investigaciones/${id}/revisar`, { metodo: "POST", datos: { aprobar: false, comentario: m } }); toast("Devuelto con tu comentario.", "ok"); recargar(); } catch (e) { toast(e.message, "error"); }
        } }, "Devolver")) : null);
  }
  const faltan = x.lista.filter((i) => !i.final && !i.hecho && i.obligatorio).length;
  return h("div.veredicto-caja", h("div", h("strong", "Veredicto"), h("p.tenue.mini", "Cuando tengas hallazgos suficientes, propón un veredicto. Otra persona del equipo lo revisa y lo aprueba.")),
    h("button.boton.primario", { type: "button", onclick: () => proponer(x, cat, id, recargar) }, faltan ? `Proponer veredicto (faltan ${faltan})` : "Proponer veredicto"));
}

async function proponer(x, cat, id, recargar) {
  const v = h("select", Object.entries(cat.veredictos).map(([k, t]) => h("option", { value: k }, t)));
  if (x.sugerencia) v.value = x.sugerencia.veredicto;
  const motivo = h("textarea", { rows: 3, placeholder: "En una o dos frases: por qué este veredicto. Ej.: «Seis casos con el mismo número y la misma web; la web sigue activa»." });
  const lista = h("ul.lista-verificacion");
  const err = h("div.error");
  const pintar = () => vaciar(lista, x.lista.filter((i) => !i.final).map((i) => {
    const obligatorio = i.clave === "responsable" || i.clave === "hallazgos" || (i.clave === "confianza_alta" && v.value === "confirmada") || (i.clave === "datos" && v.value === "resuelta");
    return h("li." + (i.hecho ? "v-hecho" : obligatorio ? "v-falta" : "v-pend"), h("span.marca", i.hecho ? "✓" : obligatorio ? "✗" : "!"), i.texto, !i.hecho && obligatorio ? h("span.mini", " · obligatorio") : null);
  }));
  v.addEventListener("change", pintar); pintar();
  await dialogo("Proponer veredicto", h("div.pila", campo("Veredicto", v), campo("Por qué", motivo), h("div", h("strong.mini", "Antes de proponer"), lista), err), {
    acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Enviar a revisión", valor: "ok", clase: "primario", antes: async () => {
      try { await panel(`/investigaciones/${id}/proponer`, { metodo: "POST", datos: { veredicto: v.value, motivo: motivo.value } }); toast("Enviado. El equipo verá la burbuja roja para revisarlo.", "ok"); recargar(); }
      catch (e) { err.textContent = e.message; return false; }
    } }] });
}

// Resumen: título, prioridad, resumen, casos y lista de verificación.
function seccionResumen(x, cat, id, recargar, abierta) {
  const titulo = h("input", { type: "text", value: x.titulo, maxlength: 160 });
  const prioridad = h("select", Object.entries(PRIORIDADES).map(([k, t]) => h("option", { value: k }, t)));
  prioridad.value = x.prioridad;
  const resumen = h("textarea", { rows: 6, maxlength: 4000, placeholder: "Qué se sabe hasta ahora, qué falta y siguientes pasos. Escribe @usuario para avisar a alguien." });
  resumen.value = x.resumen || "";
  return h("div.pila",
    h("div.dos",
      h("div.pila", h("div.dos", campo("Título", titulo), campo("Prioridad", prioridad)), campo("Resumen de la investigación", resumen),
        abierta ? h("div", h("button.boton.primario", { type: "button", onclick: async () => {
          try { await panel(`/investigaciones/${id}`, { metodo: "PUT", datos: { titulo: titulo.value, prioridad: prioridad.value, resumen: resumen.value } }); toast("Guardado.", "ok"); recargar("resumen"); }
          catch (e) { toast(e.message, "error"); }
        } }, "Guardar")) : null),
      h("div.pila", h("h3", "Lista de verificación"), h("ul.lista-verificacion", x.lista.map((i) => h("li." + (i.hecho ? "v-hecho" : i.obligatorio ? "v-falta" : "v-pend"), h("span.marca", i.hecho ? "✓" : "·"), i.texto))),
        h("div.cifras-mini", cifra(x.hallazgos.length, "hallazgos"), cifra(x.datos.length, "datos"), cifra(x.casos.length, "casos"), cifra(x.custodia.length, "pruebas")))),
    h("h3", `Casos del expediente (${x.casos.length})`),
    x.casos.length ? h("ul.lista-limpia", x.casos.map((r) => h("li.elemento", h("span.mono.tenue", fecha(r.fecha)), h("span.crece", h("a", { href: `#/admin/cola/${r.id}` }, r.codigo), r.titulo ? ` · ${r.titulo}` : ` · ${r.tipo}`, h("span.tenue.mini", ` · ${r.lugar}`)), insignia(r.estado_nombre, "estado-" + r.estado))))
      : h("p.tenue", x.tipo === "ataque" ? "Este expediente no viene de un reporte. Añade los datos del ataque en «Datos»: el mapa mostrará si coinciden con algún caso." : "Sin casos."));
}
const cifra = (n, t) => h("div.cifra-mini", h("b", String(n)), h("span", t));

// Hallazgos: siempre qué, cómo y con cuánta confianza.
function seccionHallazgos(x, cat, id, recargar, abierta) {
  const form = abierta ? formHallazgo(cat, null, async (datos) => { await panel(`/investigaciones/${id}/hallazgos`, { metodo: "POST", datos }); toast("Hallazgo añadido.", "ok"); recargar("hallazgos"); }) : null;
  return h("div.pila",
    form ? h("details.tarjeta-suave", { open: !x.hallazgos.length }, h("summary", h("strong", "+ Nuevo hallazgo")), form) : null,
    x.hallazgos.length ? h("ul.lista-limpia.hallazgos", x.hallazgos.slice().reverse().map((hz) => {
      const li = h("li.hallazgo");
      const pintar = () => vaciar(li,
        h("div.expediente-cab", insignia(hz.tipo_nombre), insignia(cat.confianzas[hz.confianza], CLASE_CONFIANZA[hz.confianza]), h("span.tenue.mini", `${hz.autor || "—"} · ${fechaHora(hz.creado)}${hz.editado ? " · editado" : ""}`)),
        h("p.hallazgo-que", hz.que), hz.como ? h("p.hallazgo-como", h("span.tenue", "Cómo se comprobó: "), hz.como) : null,
        abierta && (hz.mio || yo?.rol === "admin") ? h("div.fila",
          h("button.boton.chico.fantasma", { type: "button", onclick: () => vaciar(li, formHallazgo(cat, hz, async (datos) => { await panel(`/hallazgos/${hz.id}`, { metodo: "PUT", datos }); toast("Hallazgo actualizado.", "ok"); recargar("hallazgos"); }, pintar)) }, "Editar"),
          h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
            if (!(await confirmar("Quitar hallazgo", "Quedará registrado en el historial del expediente.", { boton: "Quitar", peligro: true }))) return;
            await panel(`/hallazgos/${hz.id}`, { metodo: "DELETE" }); recargar("hallazgos");
          } }, "Quitar")) : null);
      pintar();
      return li;
    })) : vacio("Sin hallazgos todavía. Cada hallazgo dice qué encontraste, cómo lo comprobaste y con cuánta confianza."));
}

function formHallazgo(cat, previo, enviar, cancelar) {
  const tipo = h("select", Object.entries(cat.hallazgos).map(([k, t]) => h("option", { value: k }, t)));
  const ayuda = h("div.ayuda");
  tipo.value = previo?.tipo || "conexion";
  const ponerAyuda = () => { ayuda.textContent = AYUDA_HALLAZGO[tipo.value]; };
  tipo.addEventListener("change", ponerAyuda); ponerAyuda();
  const que = h("textarea", { rows: 3, maxlength: 3000, placeholder: "Qué encontraste. Ej.: «Los 6 casos usan el número +53 5 883 ….»" });
  const como = h("textarea", { rows: 2, maxlength: 3000, placeholder: "Cómo lo comprobaste (con tus propias herramientas). Ej.: «Comparé las capturas de los casos 12 y 15»." });
  que.value = previo?.que || ""; como.value = previo?.como || "";
  let confianza = previo?.confianza || "media";
  const grupo = h("div.segmentado", { role: "radiogroup", "aria-label": "Confianza" });
  const pintarConf = () => grupo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.clave === confianza)));
  for (const [k, t] of Object.entries(cat.confianzas)) grupo.append(h("button", { type: "button", role: "radio", datos: { clave: k }, onclick: () => { confianza = k; pintarConf(); } }, t.replace("Confianza ", "")));
  pintarConf();
  const err = h("div.error");
  return h("form.pila.form-hallazgo", { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = "";
    if (que.value.trim().length < 5) { err.textContent = "Escribe qué encontraste."; que.focus(); return; }
    try { await enviar({ tipo: tipo.value, que: que.value, como: como.value, confianza }); } catch (ex) { err.textContent = ex.message; }
  } },
  h("div.dos", h("div.campo", h("label", "Tipo de hallazgo"), tipo, ayuda), h("div.campo", h("label", "Confianza"), grupo, h("div.ayuda", "Alta: comprobado por dos vías. Media: muy probable. Baja: pista por confirmar."))),
  campo("Qué encontraste", que), campo("Cómo lo comprobaste", como), err,
  h("div.fila", h("button.boton.primario", { type: "submit" }, previo ? "Guardar cambios" : "Añadir hallazgo"), cancelar ? h("button.boton.fantasma", { type: "button", onclick: cancelar }, "Cancelar") : null,
    h("span.tenue.mini", "Escribe @usuario para avisar a alguien del equipo.")));
}

// Datos: lo que aportan los casos y lo que añade el equipo, con su ficha compartida.
function seccionDatos(x, cat, id, recargar, abierta) {
  const zonaPegar = h("div");
  const privado = puede("datos_privados");
  const exportar = (f) => descargar(`/api/panel/investigaciones/${id}/datos.${f}`, `${x.codigo}-datos.${f}`).catch((e) => toast(e.message, "error"));
  return h("div.pila",
    h("div.fila.barra-datos",
      abierta ? h("button.boton.primario.chico", { type: "button", onclick: () => pegar(zonaPegar, cat, id, recargar) }, "+ Pegar datos") : null,
      privado ? [h("span.tenue.mini", "Exportar:"), ["txt", "csv", "json"].map((f) => h("button.boton.chico.fantasma", { type: "button", onclick: () => exportar(f) }, f.toUpperCase()))] : null),
    zonaPegar,
    x.datos.length ? h("ul.lista-limpia.datos", x.datos.map((dt) => filaDato(dt, cat, id, recargar, abierta)))
      : vacio("Sin datos. Pega números, enlaces, IP, hashes, billeteras… uno por línea."),
    privado ? h("p.tenue.mini", "El TXT es una lista simple, un dato por línea, para tus propias herramientas: no incluye los datos marcados como «posible víctima».") : null);
}

function filaDato(dt, cat, id, recargar, abierta) {
  const sit = h("select", { "aria-label": "Situación", disabled: !dt.clave }, Object.entries(cat.situaciones_dato).map(([k, t]) => h("option", { value: k }, t)));
  sit.value = dt.situacion;
  const vic = h("input", { type: "checkbox", checked: dt.posible_victima, disabled: !dt.clave });
  const guardar = async () => {
    try { await panel("/fichas", { metodo: "PUT", datos: { clave: dt.clave, situacion: sit.value, posible_victima: vic.checked } }); toast("Ficha guardada para todo el equipo.", "ok", 2500); }
    catch (e) { toast(e.message, "error"); }
  };
  sit.addEventListener("change", guardar); vic.addEventListener("change", guardar);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const usos = [dt.en_codice ? `en ${plural(dt.en_codice, "caso", "casos")} de CODICE` : "en ningún caso", dt.en_otros_expedientes ? `en ${plural(dt.en_otros_expedientes, "expediente más", "expedientes más")}` : null].filter(Boolean).join(" · ");
  return h("li.dato" + (dt.situacion === "caido" ? ".caido" : ""),
    h("div.dato-valor", h("span.insignia", { title: dt.tipo_nombre }, CORTO[dt.tipo] || dt.tipo_nombre), h("span.indicador", dt.valor), dt.clave ? h("button.boton.chico.fantasma", { type: "button", "aria-label": `Copiar ${dt.valor}`, onclick: () => copiar(dt.clave.split(":").slice(1).join(":")) }, "Copiar") : null),
    h("div.dato-usos.tenue.mini", usos, dt.propio && dt.autor ? ` · añadido por ${dt.autor}` : null,
      dt.en_codice > 1 || dt.en_otros_expedientes ? [" · ", h("a", { href: `#/admin/investigacion?indicador=${encodeURIComponent(dt.clave || "")}` }, "ver en el mapa")] : null),
    h("div.dato-ficha", sit, h("label.casilla.mini", vic, h("span", "Posible víctima")),
      abierta && dt.propio ? h("button.boton.chico.fantasma", { type: "button", onclick: async () => { await panel(`/investigaciones/${id}/datos/${dt.propio}`, { metodo: "DELETE" }); recargar("datos"); } }, "Quitar") : null));
}

async function pegar(zona, cat, id, recargar) {
  const texto = h("textarea", { rows: 6, placeholder: "Un dato por línea. Se reconoce solo el tipo:\n+53 5 883 4122\nhxxps://falsa-web[.]com/pago\n8.8.8.8\nsha256 del archivo…\nTambién puedes forzarlo: «marca: GasCuba»" });
  const prev = h("div");
  vaciar(zona, h("div.tarjeta-suave.pila", texto, h("div.fila",
    h("button.boton.primario.chico", { type: "button", onclick: async () => {
      try {
        const r = await panel(`/investigaciones/${id}/datos/analizar`, { metodo: "POST", datos: { texto: texto.value } });
        if (!r.lineas.length) { vaciar(prev, h("p.tenue", "No encontré datos en lo que pegaste.")); return; }
        vistaPrevia(prev, r.lineas, cat, id, recargar);
      } catch (e) { toast(e.message, "error"); }
    } }, "Revisar"),
    h("button.boton.fantasma.chico", { type: "button", onclick: () => vaciar(zona) }, "Cancelar")), prev));
  texto.focus();
}

function vistaPrevia(caja, lineas, cat, id, recargar) {
  const filas = lineas.map((l) => {
    const sel = h("select", { "aria-label": "Tipo" }, Object.entries(cat.indicadores).map(([k, t]) => h("option", { value: k }, t)));
    sel.value = l.tipo;
    const ok = !l.error && !l.ya && !l.repetido;
    const marca = h("input", { type: "checkbox", checked: ok, disabled: !!l.ya || !!l.repetido });
    return { l, sel, marca, el: h("li.previa" + (l.error ? ".error" : ""), marca, h("span.indicador", l.valor), sel,
      h("span.mini." + (l.error ? "error" : "tenue"), l.error || (l.ya ? "ya está en el expediente" : l.repetido ? "repetido" : l.en_codice ? `aparece en ${l.en_codice} casos de CODICE` : "nuevo"))) };
  });
  vaciar(caja, h("ul.lista-limpia.previas", filas.map((f) => f.el)), h("div.fila",
    h("button.boton.exito", { type: "button", onclick: async () => {
      const items = filas.filter((f) => f.marca.checked && !f.marca.disabled).map((f) => ({ tipo: f.sel.value, valor: f.l.valor }));
      if (!items.length) { toast("No hay datos marcados.", "error"); return; }
      try {
        const r = await panel(`/investigaciones/${id}/datos`, { metodo: "POST", datos: { items } });
        toast(`${r.anadidos} datos añadidos${r.errores.length ? ` · ${r.errores.length} con error` : ""}.`, r.errores.length ? "error" : "ok", 6000);
        recargar("datos");
      } catch (e) { toast(e.message, "error"); }
    } }, `Añadir los marcados`)));
}

// Cadena de custodia: archivo guardado en faro o solo su huella calculada en tu equipo.
function seccionCustodia(x, id, recargar, abierta) {
  const archivo = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,audio/ogg,audio/mpeg" });
  const desc = h("input", { type: "text", maxlength: 1000, placeholder: "Qué es: «Captura del SMS recibido el 12/11»" });
  const peligroso = h("input", { type: "file" });
  const descH = h("input", { type: "text", maxlength: 1000, placeholder: "Qué es: «APK que enviaban por WhatsApp»" });
  const pegado = h("input", { type: "text", placeholder: "…o pega aquí la huella SHA-256 (64 caracteres)", spellcheck: "false", autocomplete: "off" });
  const estado = h("p.tenue.mini");
  const subir = async (e) => {
    e.preventDefault();
    if (!archivo.files[0]) { toast("Elige un archivo.", "error"); return; }
    const fd = new FormData(); fd.append("archivo", archivo.files[0]); fd.append("descripcion", desc.value);
    try {
      estado.textContent = "Subiendo y comprobando…";
      const r = await panel(`/investigaciones/${id}/custodia`, { metodo: "POST", datos: fd });
      avisoRepetida(r); recargar("custodia");
    } catch (err) { estado.textContent = ""; toast(err.message, "error", 8000); }
  };
  const registrarHuella = async (e) => {
    e.preventDefault();
    let sha = pegado.value.trim().toLowerCase(), nombre = "archivo", tam = null;
    const f = peligroso.files[0];
    if (f) {
      if (!crypto?.subtle) { toast("Este navegador no puede calcular la huella. Pégala a mano.", "error"); return; }
      estado.textContent = "Calculando la huella en tu equipo (el archivo no se envía)…";
      const buf = await f.arrayBuffer();
      sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");
      nombre = f.name; tam = f.size;
    }
    if (!/^[0-9a-f]{64}$/.test(sha)) { estado.textContent = ""; toast("Elige el archivo o pega una huella SHA-256 válida.", "error"); return; }
    try {
      const r = await panel(`/investigaciones/${id}/custodia`, { metodo: "POST", datos: { nombre, sha256: sha, bytes: tam, descripcion: descH.value } });
      avisoRepetida(r); recargar("custodia");
    } catch (err) { estado.textContent = ""; toast(err.message, "error"); }
  };
  return h("div.pila",
    abierta ? h("div.dos",
      h("form.tarjeta-suave.pila", { onsubmit: subir }, h("strong", "Guardar una prueba en faro"), h("p.tenue.mini", "Capturas, PDF, vídeo o audio. Se guarda con su huella SHA-256, quién la subió y cuándo. Pasa por el antivirus de faro si está instalado."),
        archivo, desc, h("div", h("button.boton.chico.primario", { type: "submit" }, "Subir prueba"))),
      h("form.tarjeta-suave.pila", { onsubmit: registrarHuella }, h("strong", "Registrar solo la huella (malware, APK…)"), h("p.tenue.mini", "El archivo NO se sube: tu navegador calcula su SHA-256 y solo se guarda la huella. Así se cruza con otros casos sin meter nada peligroso en faro."),
        peligroso, pegado, descH, h("div", h("button.boton.chico", { type: "submit" }, "Registrar huella")))) : null,
    estado,
    x.custodia.length ? h("ul.lista-limpia.custodia", x.custodia.map((p) => h("li.prueba-custodia",
      h("div.expediente-cab", h("strong", p.nombre), p.archivo ? insignia(p.mime || "archivo") : insignia("solo huella", "ambar"),
        p.antivirus === "limpio" ? insignia("antivirus: limpio", "verde") : p.antivirus === "sin_antivirus" ? insignia("sin antivirus en faro") : null,
        p.publicable ? insignia("publicable", "azul") : insignia("privada")),
      p.descripcion ? h("p.pequeno", p.descripcion) : null,
      h("div.huella", h("span.mono", p.sha256), h("button.boton.chico.fantasma", { type: "button", onclick: () => copiar(p.sha256) }, "Copiar")),
      h("p.tenue.mini", `${p.autor || "—"} · ${fechaHora(p.creado)}${p.bytes ? ` · ${bytes(p.bytes)}` : ""}`),
      h("div.fila",
        p.archivo && puede("datos_privados") ? h("button.boton.chico", { type: "button", onclick: () => abrirPrueba(p) }, "Abrir") : null,
        abierta && p.archivo ? h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
          try { await panel(`/custodia/${p.id}/publicable`, { metodo: "POST", datos: { publicable: !p.publicable } }); recargar("custodia"); } catch (e) { toast(e.message, "error"); }
        } }, p.publicable ? "Marcar privada" : "Marcar publicable") : null),
      h("details.registro", h("summary.mini", `Registro de custodia (${p.registro.length})`),
        h("ul.lista-limpia", p.registro.map((r) => h("li.mini", h("span.mono.tenue", fechaHora(r.fecha)), ` · ${r.usuario} · ${r.accion.replaceAll("_", " ")}`))))))) : vacio("Sin pruebas registradas."));
}

function avisoRepetida(r) {
  if (r.repetida) toast(`Ojo: esa misma huella ya está en el expediente ${r.repetida.codigo}.`, "info", 9000);
  else toast(r.antivirus === "no_aplica" ? "Huella registrada. También se añadió a «Datos» para cruzarla." : "Prueba guardada en la cadena de custodia.", "ok");
}

async function abrirPrueba(p) {
  try {
    if ((p.mime || "").startsWith("image/")) {
      const url = await blobUrl(`/api/panel/custodia/${p.id}/archivo`);
      await dialogo(p.nombre, h("div.pila", h("img.prueba-grande", { src: url, alt: p.descripcion || p.nombre }), h("p.mono.mini", p.sha256)), { ancho: true });
      URL.revokeObjectURL(url);
    } else await descargar(`/api/panel/custodia/${p.id}/archivo`, p.nombre);
  } catch (e) { toast(e.message, "error"); }
}

// Mapa del expediente: sus casos, sus datos y todo lo que comparten con el resto de CODICE.
function seccionMapa(x, id, recargar, abierta) {
  const hueco = h("div", cargando("Dibujando el mapa…"));
  panel(`/grafo?centro=investigacion:${id}&profundidad=2`).then((g) => {
    const propios = new Set(x.datos.filter((d) => d.propio || d.en_expediente).map((d) => d.clave));
    const mapa = crearMapa(g, {
      vacioTexto: "Todavía no hay casos ni datos. Añade datos en la pestaña «Datos».",
      detalle: detalleDato,
      acciones: (n) => n.clase === "reporte" ? [h("a.boton.chico.primario", { href: `#/admin/cola/${n.ref}` }, "Abrir caso")]
        : n.clase === "indicador" && n.clave && abierta && !propios.has(n.clave) ? [h("button.boton.chico.primario", { type: "button", onclick: async (e) => {
          const [tipo, ...v] = n.clave.split(":");
          try { await panel(`/investigaciones/${id}/datos`, { metodo: "POST", datos: { items: [{ tipo, valor: v.join(":") }] } }); propios.add(n.clave); e.target.remove(); toast("Añadido a los datos del expediente.", "ok"); }
          catch (err) { toast(err.message, "error"); }
        } }, "Añadir al expediente")] : [],
    });
    vaciar(hueco, mapa.el);
    setTimeout(() => mapa.seleccionar(`x${id}`), 700);
  }).catch((e) => vaciar(hueco, h("p.aviso.error", e.message)));
  return h("div.pila", hueco, h("a.boton.chico.fantasma", { href: `#/admin/investigacion?centro=investigacion:${id}` }, "Abrir en el mapa completo"));
}

// Comentarios del equipo (con @menciones) e historial de todo lo que se hizo.
function seccionNotas(x, id, recargar) {
  const t = h("textarea", { rows: 3, maxlength: 3000, placeholder: "Comentario para el equipo. Escribe @usuario para avisarle con la burbuja roja." });
  return h("div.dos",
    h("div.pila", h("h3", "Comentarios"),
      x.notas.length ? x.notas.map((n) => h("div.comentario", h("div.fila", h("strong", n.usuario || "—"), h("span.tenue.mini", fechaHora(n.creada))), h("p", n.texto))) : h("p.tenue", "Sin comentarios."),
      h("form.pila", { onsubmit: async (e) => {
        e.preventDefault();
        try { const r = await panel(`/investigaciones/${id}/notas`, { metodo: "POST", datos: { texto: t.value } }); toast(r.avisados ? `Comentario guardado. Avisadas: ${r.avisados}.` : "Comentario guardado.", "ok"); recargar("notas"); }
        catch (err) { toast(err.message, "error"); }
      } }, t, h("div", h("button.boton", { type: "submit" }, "Comentar")))),
    h("div.pila", h("h3", "Historial"), h("ul.lista-limpia.historial", x.historial.map((hx) => h("li.elemento.pequeno", h("span.crece", `${hx.actor} · ${hx.accion.replaceAll(".", " ").replaceAll("_", " ")}`), h("span.tenue.mini", fechaHora(hx.fecha)))))));
}
