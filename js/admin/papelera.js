import { panel } from "../api.js";
import { h, vaciar, fechaHora, fecha, toast, vacio, confirmar } from "../ui.js";
import { yo, pedirCodigo2fa } from "./panel.js";

const NOMBRES = { reporte: "Reporte", campana: "Campaña", aviso: "Aviso", ticket: "Ticket", solicitud: "Solicitud" };

export async function mostrar(caja) {
  const d = await panel("/papelera");
  const borrar = async (datos, texto) => {
    if (!(await confirmar("Borrar para siempre", texto, { boton: "Continuar", peligro: true }))) return;
    const codigo = await pedirCodigo2fa();
    if (!codigo) return;
    try { const r = await panel("/papelera/eliminar", { metodo: "POST", datos: { ...datos, codigo_2fa: codigo } }); toast(`${r.eliminados} elementos borrados para siempre.`, "ok"); location.reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Papelera"), h("p", "Lo borrado se puede recuperar durante 30 días. Solo el admin borra para siempre.")),
    yo.rol === "admin" && d.items.length ? h("button.boton.peligro", { type: "button", onclick: () => borrar({ todo: true }, "Se borrará todo lo que hay en la papelera, con sus archivos. No se puede deshacer.") }, "Vaciar papelera") : null),
    h("div.tarjeta", d.items.length ? h("ul.lista-limpia", d.items.map((x) => h("li.elemento", h("span.crece", h("span.titulo", `${NOMBRES[x.tipo]} · ${x.nombre}`), h("span.meta", `Borrado ${fechaHora(x.borrado)} · se elimina solo el ${fecha(x.se_borra)}`)),
      h("button.boton.chico", { type: "button", onclick: async () => { await panel("/papelera/restaurar", { metodo: "POST", datos: { tipo: x.tipo, id: x.id } }); toast("Restaurado.", "ok"); location.reload(); } }, "Restaurar"),
      yo.rol === "admin" ? h("button.boton.chico.peligro", { type: "button", onclick: () => borrar({ tipo: x.tipo, id: x.id }, `Se borrará «${x.nombre}» para siempre.`) }, "Borrar ya") : null))) : vacio("La papelera está vacía.")));
}
