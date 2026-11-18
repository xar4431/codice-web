import { panel } from "../api.js";
import { h, vaciar, toast, campo, vacio } from "../ui.js";

export async function mostrar(caja) {
  const a = (await panel("/ajustes")).ajustes;
  const pl = (await panel("/plantillas")).plantillas;
  const prot = h("input", { type: "checkbox", checked: a.modo_proteccion });
  const max = h("input", { type: "number", min: 1, max: 20, value: a.max_pendientes_cuenta });
  const modAv = h("input", { type: "checkbox", checked: a.moderadores_publican_avisos });
  const tgTok = h("input", { type: "text", value: a.telegram_token, placeholder: "Token del bot (opcional)" });
  const tgChat = h("input", { type: "text", value: a.telegram_chat, placeholder: "ID del chat del admin" });
  const guardar = async () => {
    try { await panel("/ajustes", { metodo: "PUT", datos: { modo_proteccion: prot.checked, max_pendientes_cuenta: Number(max.value), moderadores_publican_avisos: modAv.checked, telegram_token: tgTok.value, telegram_chat: tgChat.value } }); toast("Ajustes guardados.", "ok"); }
    catch (e) { toast(e.message, "error"); }
  };
  const amb = h("select", h("option", { value: "reporte" }, "Reportes"), h("option", { value: "ticket" }, "Tickets"), h("option", { value: "solicitud" }, "Solicitudes"));
  const tit = h("input", { type: "text", maxlength: 80 }), txt = h("textarea", { maxlength: 3000 });
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Ajustes"), h("p", "Solo el admin."))),
    h("div.portada",
      h("div.pila",
        h("section.tarjeta" + (a.modo_proteccion ? ".resultado.riesgo-alto" : ""), h("h2", "Modo protección"), h("p.suave", "Interruptor de emergencia ante una avalancha de trolls: mientras esté activo, solo se puede reportar con cuenta. La web muestra un aviso amable."),
          h("label.casilla", prot, h("span", h("strong", "Activar modo protección"))),
          h("button.boton" + (a.modo_proteccion ? "" : ".peligro"), { type: "button", onclick: async () => { await panel("/proteccion", { metodo: "POST", datos: { activo: !a.modo_proteccion } }); toast("Modo protección " + (a.modo_proteccion ? "desactivado." : "activado."), "ok"); mostrar(caja); } },
            a.modo_proteccion ? "Desactivar ahora" : "Activar ahora")),
        h("section.tarjeta", h("h2", "Reglas"), campo("Máximo de reportes pendientes por cuenta", max), h("label.casilla", modAv, h("span", "Permitir que los moderadores con permiso publiquen avisos"))),
        h("section.tarjeta", h("h2", "Alertas graves al móvil (opcional)"), h("p.suave", "Por un bot de Telegram: crea uno con @BotFather y escribe aquí su token y tu ID de chat."), campo("Token", tgTok), campo("ID del chat", tgChat)),
        h("div", h("button.boton.primario", { type: "button", onclick: guardar }, "Guardar ajustes"))),
      h("aside.pila", h("section.tarjeta", h("h2", "Plantillas de respuesta"),
        pl.length ? h("ul.lista-limpia", pl.map((p) => h("li.elemento", h("span.crece", h("span.titulo", p.titulo), h("span.meta", p.ambito)),
          h("button.boton.chico.fantasma", { type: "button", onclick: () => { amb.value = p.ambito; tit.value = p.titulo; txt.value = p.texto; tit.dataset.id = p.id; } }, "Editar"),
          h("button.boton.chico.fantasma", { type: "button", onclick: async () => { await panel(`/plantillas/${p.id}`, { metodo: "DELETE" }); mostrar(caja); } }, "Borrar")))) : vacio("Sin plantillas."),
        h("hr.separador"), campo("Para", amb), campo("Título", tit), campo("Texto", txt),
        h("button.boton", { type: "button", onclick: async () => { try { await panel("/plantillas", { metodo: "POST", datos: { id: tit.dataset.id ? Number(tit.dataset.id) : null, ambito: amb.value, titulo: tit.value, texto: txt.value } }); toast("Plantilla guardada.", "ok"); mostrar(caja); } catch (e) { toast(e.message, "error"); } } }, "Guardar plantilla")))));
}
