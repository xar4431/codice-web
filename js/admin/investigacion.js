// Mapa: casos, datos y expedientes conectados. Desde aquí se centra, se amplía y se abre la ficha de cada cosa.
import { panel } from "../api.js";
import { crearMapa } from "../mapa.js";
import { h, vaciar, fecha, fechaHora, toast, campo, cargando, insignia } from "../ui.js";
import { puede } from "./panel.js";

const SITUACIONES = { desconocido: "Sin comprobar", activo: "Sigue activo", caido: "Caído o dado de baja" };
const CONFIANZAS = { baja: "Confianza baja", media: "Confianza media", alta: "Confianza alta" };

export async function mostrar(caja, _p, params) {
  let centro = params.get("centro") || (params.get("indicador") ? `indicador:${params.get("indicador")}` : "");
  const desde = h("input", { type: "date" }), hasta = h("input", { type: "date" });
  const prof = h("select", h("option", { value: 1 }, "1 salto"), h("option", { value: 2 }, "2 saltos"), h("option", { value: 3 }, "3 saltos"));
  prof.value = "2";
  const conf = h("input", { type: "checkbox" }), sueltos = h("input", { type: "checkbox" });
  const titulo = h("p.tenue");
  const hueco = h("div", cargando());
  let mapa = null;
  const cargar = async () => {
    const q = new URLSearchParams({ centro, profundidad: prof.value });
    if (desde.value) q.set("desde", desde.value);
    if (hasta.value) q.set("hasta", hasta.value);
    if (conf.checked) q.set("confirmadas", "1");
    if (sueltos.checked) q.set("sueltos", "1");
    try {
      const g = await panel("/grafo?" + q);
      titulo.textContent = centro ? `Centrado en ${descripcion(centro)} · ${prof.value} ${prof.value === "1" ? "salto" : "saltos"}` : "Últimos 60 casos y los datos que comparten";
      if (mapa) mapa.recargar(g);
      else {
        mapa = crearMapa(g, { acciones: (n) => acciones(n, (c) => { centro = c; history.replaceState(null, "", `#/admin/investigacion?centro=${encodeURIComponent(c)}`); cargar(); }), detalle });
        vaciar(hueco, mapa.el);
      }
    } catch (e) { vaciar(hueco, h("p.aviso.error", e.message)); }
  };
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Mapa"), h("p", "Cómo se conectan los casos, los datos que comparten y los expedientes. Todo queda dentro de CODICE."))),
    h("div.tarjeta",
      h("details.filtros-mapa", h("summary", "Qué cargar"),
        h("div.filtros", h("div", campo("Desde", desde)), h("div", campo("Hasta", hasta)), h("div", campo("Ampliar", prof))),
        h("div.fila", { estilo: { alignItems: "center" } },
          h("label.casilla", conf, h("span", "Solo publicados")), h("label.casilla", sueltos, h("span", "Datos de un solo caso")),
          h("button.boton.primario.chico", { type: "button", onclick: cargar }, "Aplicar"),
          h("button.boton.fantasma.chico", { type: "button", onclick: () => { centro = ""; history.replaceState(null, "", "#/admin/investigacion"); cargar(); } }, "Ver todo"))),
      titulo, hueco));
  await cargar();
}

function descripcion(c) {
  const [t, ...r] = c.split(":");
  return { reporte: "un caso", campana: "una campaña", investigacion: "un expediente", indicador: `el dato ${r.slice(1).join(":")}` }[t] || c;
}

function acciones(n, centrar) {
  if (n.clase === "reporte") return [h("a.boton.chico.primario", { href: `#/admin/cola/${n.ref}` }, "Abrir caso"), h("button.boton.chico.fantasma", { type: "button", onclick: () => centrar(`reporte:${n.ref}`) }, "Centrar aquí")];
  if (n.clase === "expediente") return [h("a.boton.chico.primario", { href: `#/admin/investigaciones/${n.ref}` }, "Abrir expediente")];
  return n.clave ? [h("button.boton.chico.fantasma", { type: "button", onclick: () => centrar(`indicador:${n.clave}`) }, "Centrar aquí")] : [];
}

// Ficha ampliada de un dato: historial, expedientes, situación compartida y notas.
async function detalle(n) {
  if (n.clase !== "indicador") return null;
  if (!n.clave) return h("p.tenue.mini", "Tu rol no permite ver el valor completo de este dato.");
  const [tipo, ...resto] = n.clave.split(":");
  const i = (await panel(`/indicador?tipo=${encodeURIComponent(tipo)}&valor=${encodeURIComponent(resto.join(":"))}`)).indicador;
  const caja = h("div.pila");
  const sit = h("select", Object.entries(SITUACIONES).map(([k, t]) => h("option", { value: k }, t)));
  const con = h("select", Object.entries(CONFIANZAS).map(([k, t]) => h("option", { value: k }, t)));
  const vic = h("input", { type: "checkbox", checked: i.ficha.posible_victima });
  sit.value = i.ficha.situacion; con.value = i.ficha.confianza;
  const guardarFicha = async () => {
    try {
      await panel("/fichas", { metodo: "PUT", datos: { clave: n.clave, situacion: sit.value, confianza: con.value, posible_victima: vic.checked } });
      Object.assign(n, { situacion: sit.value, posible_victima: vic.checked });
      toast("Ficha del dato guardada para todo el equipo.", "ok");
    } catch (e) { toast(e.message, "error"); }
  };
  const nota = h("textarea", { placeholder: "Nota sobre este dato (p. ej. «tarjeta de una mula», «número robado»)", rows: 2 });
  vaciar(caja,
    puede("investigar") ? h("div.pila.ficha-dato", h("div.dos", campo("Situación", sit), campo("Confianza", con)),
      h("label.casilla", vic, h("span", "Puede ser de una víctima (no se exporta en TXT)")),
      h("div", h("button.boton.chico", { type: "button", onclick: guardarFicha }, "Guardar ficha")),
      i.ficha.por ? h("p.tenue.mini", `Última revisión: ${i.ficha.por} · ${fechaHora(i.ficha.actualizado)}`) : null) : null,
    i.reportes.length ? h("div", h("h4", `En ${i.reportes.length} ${i.reportes.length === 1 ? "caso" : "casos"}${i.desde ? ` · ${fecha(i.desde)} – ${fecha(i.hasta)}` : ""}`),
      h("ul.lista-limpia", i.reportes.slice(0, 15).map((r) => h("li.elemento.pequeno", h("span.mono.tenue", fecha(r.fecha_incidente)), h("a.crece", { href: `#/admin/cola/${r.id}` }, r.codigo), r.campana ? h("span.tenue.mini", r.campana) : null)))) : null,
    i.expedientes.length ? h("div", h("h4", "En expedientes"), h("div.fila", i.expedientes.map((x) => h("a.insignia" + (x.estado === "cerrada" ? "" : ".azul"), { href: `#/admin/investigaciones/${x.id}` }, `${x.codigo} · ${x.estado_nombre}`)))) : null,
    h("div", h("h4", "Notas"), i.notas.length ? i.notas.map((x) => h("p.pequeno", h("strong", x.usuario || "—"), h("span.tenue", ` · ${fechaHora(x.creada)}: `), x.texto)) : h("p.tenue.mini", "Sin notas.")),
    puede("campanas") ? h("form.pila", { onsubmit: async (e) => {
      e.preventDefault();
      if (!nota.value.trim()) return;
      try { await panel("/notas", { metodo: "POST", datos: { objeto: `indicador:${n.clave}`, texto: nota.value } }); toast("Nota guardada.", "ok"); nota.value = ""; vaciar(caja, await detalle(n)); }
      catch (err) { toast(err.message, "error"); }
    } }, nota, h("div", h("button.boton.chico.fantasma", { type: "submit" }, "Añadir nota"))) : null,
    i.campanas.length ? h("p.tenue.mini", "Campañas: ", i.campanas.map((k) => insignia(k))) : null);
  return caja;
}

export { detalle as detalleDato };
