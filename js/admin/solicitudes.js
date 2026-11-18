import { panel } from "../api.js";
import { h, vaciar, insignia, fechaHora, toast, vacio, dialogo, campo } from "../ui.js";
import { yo } from "./panel.js";

export async function mostrar(caja) {
  const d = await panel("/solicitudes");
  const plantillas = (await panel("/plantillas")).plantillas.filter((p) => p.ambito === "solicitud");
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Solicitudes de colaboración"), h("p", "Desde aquí conviertes una cuenta en moderador en periodo de prueba con un clic."))),
    d.solicitudes.length ? h("div.pila", d.solicitudes.map((s) => h("div.tarjeta",
      h("div.fila", { estilo: { justifyContent: "space-between" } }, h("strong", `${s.codigo}${s.usuario ? " · cuenta: " + s.usuario : " · sin cuenta"}`), h("div.fila", insignia(s.estado), h("span.tenue", fechaHora(s.creada)))),
      h("p", h("strong", "Por qué: "), s.motivo), h("p", h("strong", "Tiempo: "), s.tiempo), h("p", h("strong", "Sabe hacer: "), s.habilidades),
      s.respuesta ? h("p.tenue", "Respuesta: ", s.respuesta) : null,
      h("div.fila",
        yo.rol === "admin" && s.usuario_id ? h("button.boton.chico.exito", { type: "button", onclick: () => responder(s, "aceptada", true, plantillas) }, "Aceptar y hacer moderador (prueba)") : null,
        h("button.boton.chico", { type: "button", onclick: () => responder(s, "aceptada", false, plantillas) }, "Responder"),
        h("button.boton.chico.fantasma", { type: "button", onclick: () => responder(s, "rechazada", false, plantillas) }, "Rechazar"),
        h("button.boton.chico.fantasma", { type: "button", onclick: () => responder(s, "archivada", false, plantillas, true) }, "Archivar"))))) : vacio("No hay solicitudes."));
}

async function responder(s, estado, moderador, plantillas, sinTexto = false) {
  let respuesta = "";
  if (!sinTexto) {
    const t = h("textarea");
    const p = plantillas.find((x) => (estado === "aceptada" ? x.titulo === "Aceptada" : x.titulo === "No por ahora"));
    if (p) t.value = p.texto;
    if (!(await dialogo(moderador ? "Aceptar como moderador" : "Responder", campo("Respuesta (la verá la persona)", t), { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Enviar", valor: true, clase: "primario" }] }))) return;
    respuesta = t.value;
  }
  try { await panel(`/solicitudes/${s.id}`, { metodo: "POST", datos: { estado, respuesta, hacer_moderador: moderador } }); toast(moderador ? "Ahora es moderador en periodo de prueba." : "Hecho.", "ok"); location.reload(); }
  catch (e) { toast(e.message, "error"); }
}
