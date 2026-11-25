import { panel } from "../api.js";
import { h, vaciar, toast, campo, vacio } from "../ui.js";

const HORA = new Intl.DateTimeFormat("es", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export async function mostrar(caja) {
  const r = await panel("/ajustes");
  const a = r.ajustes, escudo = r.escudo || {};
  const pl = (await panel("/plantillas")).plantillas;
  const prot = h("input", { type: "checkbox", checked: a.modo_proteccion });
  const max = h("input", { type: "number", min: 1, max: 20, value: a.max_pendientes_cuenta });
  const modAv = h("input", { type: "checkbox", checked: a.moderadores_publican_avisos });
  const escAuto = h("input", { type: "checkbox", checked: a.escudo_auto ?? true });
  const escUmbral = h("input", { type: "number", min: 3, max: 200, value: a.escudo_umbral ?? 12, inputmode: "numeric" });
  const escHoras = h("input", { type: "number", min: 1, max: 48, value: a.escudo_horas ?? 3, inputmode: "numeric" });
  const trampas = h("input", { type: "checkbox", checked: a.trampas_bloquean ?? true });
  const guardar = async () => {
    try {
      await panel("/ajustes", { metodo: "PUT", datos: { modo_proteccion: prot.checked, max_pendientes_cuenta: Number(max.value), moderadores_publican_avisos: modAv.checked,
        escudo_auto: escAuto.checked, escudo_umbral: Number(escUmbral.value), escudo_horas: Number(escHoras.value), trampas_bloquean: trampas.checked } });
      toast("Ajustes guardados.", "ok"); mostrar(caja);
    } catch (e) { toast(e.message, "error"); }
  };
  const amb = h("select", h("option", { value: "reporte" }, "Reportes"), h("option", { value: "ticket" }, "Tickets"), h("option", { value: "solicitud" }, "Solicitudes"));
  const tit = h("input", { type: "text", maxlength: 80 }), txt = h("textarea", { maxlength: 3000 });
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Ajustes"), h("p", "Solo el admin."))),
    h("div.portada",
      h("div.pila",
        h("section.tarjeta" + (a.modo_proteccion ? ".resultado.riesgo-alto" : ""), h("h2", "Modo protección"), h("p.suave", "Interruptor de emergencia ante una avalancha de trolls: mientras esté activo, solo se puede reportar con cuenta. La web muestra un aviso amable."),
          a.modo_proteccion && escudo.auto ? h("p.aviso.atencion", `${("Lo activó solo el escudo automático por una avalancha de reportes")}${escudo.hasta ? `; ${("se apaga solo el")} ${HORA.format(new Date(escudo.hasta))}` : ""}.`) : null,
          h("label.casilla", prot, h("span", h("strong", "Activar modo protección"))),
          h("button.boton" + (a.modo_proteccion ? "" : ".peligro"), { type: "button", onclick: async () => { await panel("/proteccion", { metodo: "POST", datos: { activo: !a.modo_proteccion } }); toast("Modo protección " + (a.modo_proteccion ? "desactivado." : "activado."), "ok"); mostrar(caja); } },
            a.modo_proteccion ? "Desactivar ahora" : "Activar ahora")),
        h("section.tarjeta", h("h2", "Reglas"), campo("Máximo de reportes pendientes por cuenta", max), h("label.casilla", modAv, h("span", "Permitir que los moderadores con permiso publiquen avisos"))),
        h("section.tarjeta", h("h2", "Escudo automático"),
          h("p.suave", "Si llegan muchos reportes sin cuenta en poco tiempo, faro activa solo el modo protección durante unas horas, te avisa en Servidor → Seguridad y luego lo apaga solo."),
          h("label.casilla", escAuto, h("span", h("strong", "Activar el escudo automático"))),
          h("div.fila-indicador", { estilo: { marginTop: "10px" } },
            campo("Reportes sin cuenta en 10 minutos", escUmbral, { ayuda: "A partir de cuántos se activa (3 a 200)." }),
            campo("Horas que dura", escHoras, { ayuda: "De 1 a 48 horas." })),
          h("label.casilla", { estilo: { marginTop: "10px" } }, trampas, h("span", "Bloquear 24 h a los robots que buscan fallos (rutas trampa como /wp-admin o /.env)")),
          h("p.tenue", { estilo: { marginTop: "10px" } }, "Los avisos quedan solo dentro del panel: nada de CODICE sale de faro hacia otros servicios.")),
        h("div", h("button.boton.primario", { type: "button", onclick: guardar }, "Guardar ajustes"))),
      h("aside.pila", h("section.tarjeta", h("h2", "Plantillas de respuesta"),
        pl.length ? h("ul.lista-limpia", pl.map((p) => h("li.elemento", h("span.crece", h("span.titulo", p.titulo), h("span.meta", p.ambito)),
          h("button.boton.chico.fantasma", { type: "button", onclick: () => { amb.value = p.ambito; tit.value = p.titulo; txt.value = p.texto; tit.dataset.id = p.id; } }, "Editar"),
          h("button.boton.chico.fantasma", { type: "button", onclick: async () => { await panel(`/plantillas/${p.id}`, { metodo: "DELETE" }); mostrar(caja); } }, "Borrar")))) : vacio("Sin plantillas."),
        h("hr.separador"), campo("Para", amb), campo("Título", tit), campo("Texto", txt),
        h("button.boton", { type: "button", onclick: async () => { try { await panel("/plantillas", { metodo: "POST", datos: { id: tit.dataset.id ? Number(tit.dataset.id) : null, ambito: amb.value, titulo: tit.value, texto: txt.value } }); toast("Plantilla guardada.", "ok"); mostrar(caja); } catch (e) { toast(e.message, "error"); } } }, "Guardar plantilla")))));
}
