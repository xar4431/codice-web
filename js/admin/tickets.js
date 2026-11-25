import { panel, blobUrl } from "../api.js";
import { h, vaciar, insignia, fechaHora, toast, vacio, cargando, recordarSeleccion, subirAlDetalle, volverASeleccion } from "../ui.js";

export async function mostrar(caja, [id], params) {
  const estado = params.get("estado") || "abierto";
  const d = await panel(`/tickets?estado=${estado}`);
  const det = h("div", id ? cargando() : vacio("Elige un ticket."));
  const volver = id ? h("a.volver.volver-lista", { href: `#/admin/tickets?estado=${estado}&sin-subir=1` }, "← Volver a la lista de tickets") : null;
  const columnaDetalle = h("div", volver, det);
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Tickets"), h("p", "Quejas y ayuda de los usuarios. Todo queda dentro de la web."))),
    h("div.fila", { estilo: { marginBottom: "10px" } }, [["abierto", "Abiertos"], ["respondido", "Respondidos"], ["cerrado", "Cerrados"], ["todos", "Todos"]].map(([k, t]) => h("a.boton.chico" + (k === estado ? ".primario" : ""), { href: `#/admin/tickets?estado=${k}` }, t))),
    h("div.dividido" + (id ? ".con-detalle" : ""), h("div.tarjeta.lista", d.tickets.length ? h("ul.lista-limpia", d.tickets.map((t) => h("li", { clase: String(t.id) === id ? "seleccionado" : null },
      h("a.elemento", { href: `#/admin/tickets/${t.id}?estado=${estado}&sin-subir=1` }, h("span.crece", h("span.titulo", `${t.codigo} · ${t.motivo}`), h("span.meta", `${fechaHora(t.actualizado)}${t.asignado ? " · " + t.asignado : ""}`), h("span.meta", { estilo: { display: "block" } }, t.ultimo)), insignia(t.estado))))) : vacio("No hay tickets aquí.")), columnaDetalle));
  const listaTickets = caja.querySelector(".dividido .lista");
  if (!id) { volverASeleccion("tickets", listaTickets); return; }
  recordarSeleccion("tickets", id);
  subirAlDetalle(columnaDetalle);
  const r = await panel(`/tickets/${id}`);
  const t = r.ticket;
  const plantillas = (await panel("/plantillas")).plantillas.filter((p) => p.ambito === "ticket");
  const texto = h("textarea", { placeholder: "Respuesta para el usuario" });
  const sel = h("select", h("option", { value: "" }, "Plantilla…"), plantillas.map((p) => h("option", { value: p.id }, p.titulo)));
  sel.addEventListener("change", () => { const p = plantillas.find((x) => String(x.id) === sel.value); if (p) texto.value = p.texto; });
  const asignado = h("select", h("option", { value: "" }, "Sin asignar"), r.equipo.map((u) => h("option", { value: u.id }, u.usuario)));
  asignado.value = t.asignado_id || "";
  asignado.addEventListener("change", () => panel(`/tickets/${id}`, { metodo: "POST", datos: { asignado_id: asignado.value ? Number(asignado.value) : null } }).then(() => toast("Asignado.", "ok")));
  const enviar = async (estadoNuevo) => {
    try { await panel(`/tickets/${id}`, { metodo: "POST", datos: { texto: texto.value, estado: estadoNuevo } }); toast("Hecho.", "ok"); location.reload(); } catch (e) { toast(e.message, "error"); }
  };
  vaciar(det, h("div.tarjeta",
    h("div.fila", { estilo: { justifyContent: "space-between" } }, h("h2", { estilo: { margin: 0 } }, `${t.codigo} · ${t.motivo}`), insignia(t.estado)),
    h("p.tenue", `De: ${t.autor || "Anónimo"} · ${fechaHora(t.creado)}`, t.caso ? [" · caso ", h("a", { href: `#/admin/cola/${t.caso_id}` }, t.caso)] : ""),
    h("div.pila", t.mensajes.map((m) => {
      const c = h("div.aviso" + (m.autor === "equipo" ? ".ok" : ""), h("strong", m.autor === "equipo" ? "Equipo" : "Usuario"), h("span.tenue", ` · ${fechaHora(m.creado)}`), h("p", { estilo: { margin: "4px 0 0", whiteSpace: "pre-wrap" } }, m.texto));
      if (m.adjunto) blobUrl(`/api/panel/tickets/adjunto/${m.id}`).then((u) => c.append(h("img", { src: u, alt: "Captura adjunta", estilo: { maxHeight: "260px", marginTop: "8px", borderRadius: "8px" } }))).catch(() => {});
      return c;
    })),
    h("div.pila", { estilo: { marginTop: "14px" } }, h("div.fila", sel, asignado), texto,
      h("div.fila", h("button.boton.primario", { type: "button", onclick: () => enviar(null) }, "Responder"), h("button.boton", { type: "button", onclick: () => enviar("cerrado") }, "Responder y cerrar"),
        t.estado === "cerrado" ? h("button.boton.fantasma", { type: "button", onclick: () => enviar("abierto") }, "Reabrir") : h("button.boton.fantasma", { type: "button", onclick: () => { texto.value = ""; enviar("cerrado"); } }, "Cerrar sin responder")))));
  subirAlDetalle(columnaDetalle); // otra vez cuando ya cargo
}
