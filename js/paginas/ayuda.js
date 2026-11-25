import { pedir, sesion, subir } from "../api.js";
import { h, vaciar, campo, seleccion, insignia, fechaHora, toast, copiar, erroresEnFormulario } from "../ui.js";

const MOTIVOS = { web: "Problema con la web", mi_reporte: "Corregir o retirar mi reporte", publicacion: "Queja sobre una publicación", otro: "Otro" };

export async function mostrar(main, [codigo], params) {
  const conCuenta = !!sesion.usuario;
  const caja = h("div");
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Ayuda y quejas"), h("p", "Escríbenos dentro de la web: no usamos WhatsApp ni correo, y no hace falta dar datos personales."))),
    h("div.portada", h("div", nuevoTicket(conCuenta, params.get("caso"), caja)), h("aside.pila", consultar(caja), conCuenta ? await misTickets(caja) : null)), caja);
  if (codigo && conCuenta) abrir(caja, { codigo });
}

function nuevoTicket(conCuenta, caso, caja) {
  const motivo = seleccion("motivo", MOTIVOS, caso ? "publicacion" : "");
  const casoInp = h("input", { type: "text", name: "caso", placeholder: "CDX-26-XXXXX (opcional)", value: caso || "" });
  const mensaje = h("textarea", { name: "mensaje", maxlength: 4000, placeholder: "Cuéntanos qué pasa" });
  const adjunto = h("input", { type: "file", accept: "image/*" });
  const captchaImg = h("img", { alt: "Código de seguridad", width: 220, height: 72 });
  const captcha = h("input", { type: "text", name: "captcha", autocomplete: "off", maxlength: 8, estilo: { maxWidth: "160px" } });
  let captchaId = null;
  const recargar = async () => { try { const c = await pedir("/api/captcha"); captchaId = c.id; captchaImg.src = c.imagen; captcha.value = ""; } catch { /* sin conexion */ } };
  if (!conCuenta) recargar();
  const form = h("form.tarjeta", { onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("datos", JSON.stringify({ motivo: motivo.value, caso: casoInp.value, mensaje: mensaje.value, captcha_id: captchaId, captcha: captcha.value }));
    if (adjunto.files[0]) fd.append("adjunto", adjunto.files[0]);
    try {
      const r = await subir("/api/tickets", fd);
      vaciar(form, h("h2", "Ticket enviado"), h("p", "Número: ", h("strong.mono", r.codigo)),
        r.clave ? [h("p", "Tu código privado para ver la respuesta:"), h("div.codigo-privado", r.clave),
          h("p.aviso.atencion", "Guárdalo: sin él no podrás ver la respuesta."), h("button.boton", { type: "button", onclick: () => copiar(r.clave) }, "Copiar")]
          : h("p", "Verás la respuesta en «Mi cuenta» y aquí mismo."));
    } catch (err) { toast(err.message, "error"); erroresEnFormulario(form, err.campos); if (err.campos?.captcha) recargar(); }
  } }, h("h2", "Abrir un ticket"), campo("Motivo", motivo), campo("Caso relacionado", casoInp, { ayuda: "Si tu mensaje es sobre un caso publicado." }),
    campo("Mensaje", mensaje), campo("Captura (opcional)", adjunto),
    conCuenta ? null : h("div.campo", h("label", "Escribe los caracteres de la imagen"), h("div.captcha", captchaImg, captcha, h("button.boton.fantasma.chico", { type: "button", onclick: recargar }, "Otra imagen")), h("div.error", { datos: { campo: "captcha" } })),
    h("button.boton.primario", { type: "submit" }, "Enviar"));
  return form;
}

function consultar(caja) {
  const clave = h("input", { type: "text", autocomplete: "off", placeholder: "Código privado del ticket" });
  return h("form.tarjeta", { onsubmit: (e) => { e.preventDefault(); abrir(caja, { clave: clave.value.trim() }); } },
    h("h2", "Ver un ticket"), campo("Código privado", clave), h("button.boton", { type: "submit" }, "Ver"));
}

async function misTickets(caja) {
  const yo = (await pedir("/api/cuenta")).cuenta;
  return h("section.tarjeta", h("h2", "Mis tickets"), yo.tickets.length ? h("ul.lista-limpia", yo.tickets.map((t) => h("li", h("button.elemento.boton.fantasma.ancho", { type: "button", onclick: () => abrir(caja, { codigo: t.codigo }) },
    h("span.crece", h("span.titulo", t.codigo), h("span.meta", fechaHora(t.actualizado))), insignia(t.estado))))) : h("p.tenue", "No tienes tickets."));
}

async function abrir(caja, acceso) {
  try {
    const t = (await pedir("/api/tickets/ver", { metodo: "POST", datos: acceso })).ticket;
    const resp = h("textarea", { maxlength: 4000, placeholder: "Escribe tu respuesta" });
    vaciar(caja, h("section.tarjeta", { estilo: { marginTop: "16px" } },
      h("div.fila", { estilo: { justifyContent: "space-between" } }, h("h2", { estilo: { margin: 0 } }, `${t.codigo} · ${t.motivo}`), insignia(t.estado)),
      h("div.pila", { estilo: { marginTop: "12px" } }, t.mensajes.map((m) => h("div.aviso" + (m.autor === "equipo" ? "" : ".ok"),
        h("strong", m.autor === "equipo" ? "Equipo de CODICE" : "Tú"), h("span.tenue", ` · ${fechaHora(m.creado)}`), h("p", { estilo: { margin: "6px 0 0" } }, m.texto)))),
      t.estado !== "cerrado" ? h("form.pila", { estilo: { marginTop: "14px" }, onsubmit: async (e) => {
        e.preventDefault();
        const fd = new FormData(); fd.append("datos", JSON.stringify({ ...acceso, mensaje: resp.value }));
        try { await subir("/api/tickets/responder", fd); toast("Respuesta enviada.", "ok"); abrir(caja, acceso); } catch (err) { toast(err.message, "error"); }
      } }, campo("Responder", resp), h("div", h("button.boton.primario", { type: "submit" }, "Enviar"))) : h("p.tenue", "Ticket cerrado.")));
    caja.scrollIntoView({ behavior: "smooth" });
  } catch (e) { toast(e.message, "error"); }
}
