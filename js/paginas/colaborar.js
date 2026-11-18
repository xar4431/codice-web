import { pedir, sesion } from "../api.js";
import { h, vaciar, campo, toast, copiar, insignia, erroresEnFormulario } from "../ui.js";

export async function mostrar(main) {
  const conCuenta = !!sesion.usuario;
  const motivo = h("textarea", { name: "motivo", maxlength: 2000, placeholder: "¿Por qué quieres ayudar?" });
  const tiempo = h("input", { type: "text", name: "tiempo", maxlength: 200, placeholder: "Ej.: 1 hora al día, fines de semana…" });
  const hab = h("textarea", { name: "habilidades", maxlength: 2000, placeholder: "Ej.: reviso capturas, conozco las estafas de recargas, sé de informática…" });
  const captchaImg = h("img", { alt: "Código de seguridad", width: 220, height: 72 });
  const captcha = h("input", { type: "text", name: "captcha", autocomplete: "off", maxlength: 8, estilo: { maxWidth: "160px" } });
  let captchaId = null;
  const recargar = async () => { try { const c = await pedir("/api/captcha"); captchaId = c.id; captchaImg.src = c.imagen; captcha.value = ""; } catch { /* */ } };
  if (!conCuenta) recargar();
  const clave = h("input", { type: "text", placeholder: "Código privado de tu solicitud" });
  const estado = h("div");
  const form = h("form.tarjeta", { onsubmit: async (e) => {
    e.preventDefault();
    try {
      const r = await pedir("/api/colaborar", { metodo: "POST", datos: { motivo: motivo.value, tiempo: tiempo.value, habilidades: hab.value, captcha_id: captchaId, captcha: captcha.value } });
      vaciar(form, h("h2", "¡Gracias por querer ayudar!"), h("p", "Revisaremos tu solicitud. La respuesta llegará aquí mismo", conCuenta ? " y en «Mi cuenta»." : "."),
        r.clave ? [h("p", "Tu código privado:"), h("div.codigo-privado", r.clave), h("button.boton", { type: "button", onclick: () => copiar(r.clave) }, "Copiar")] : null,
        conCuenta ? null : h("p.aviso.atencion", "Para poder hacerte moderador necesitas una cuenta: créala en «Mi cuenta» y vuelve a enviar la solicitud desde ella."));
    } catch (err) { toast(err.message, "error"); erroresEnFormulario(form, err.campos); if (err.campos?.captcha) recargar(); }
  } }, h("h2", "Solicitud"), campo("¿Por qué quieres colaborar?", motivo), campo("¿Cuánto tiempo puedes dedicar?", tiempo), campo("¿Qué sabes hacer?", hab),
    h("p.tenue", "No pidas ni des datos personales: ni nombre real, ni teléfono, ni correo. Todo queda guardado de forma privada."),
    conCuenta ? null : h("div.campo", h("label", "Escribe los caracteres de la imagen"), h("div.captcha", captchaImg, captcha, h("button.boton.fantasma.chico", { type: "button", onclick: recargar }, "Otra imagen")), h("div.error", { datos: { campo: "captcha" } })),
    h("button.boton.primario", { type: "submit" }, "Enviar solicitud"));
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Quiero colaborar"), h("p", "CODICE funciona gracias a voluntarios que revisan reportes y conectan casos."))),
    h("div.portada", form, h("aside.pila", h("form.tarjeta", { onsubmit: async (e) => {
      e.preventDefault();
      try {
        const s = (await pedir("/api/colaborar/ver", { metodo: "POST", datos: { clave: clave.value } })).solicitud;
        vaciar(estado, h("p", insignia(s.estado)), s.respuesta ? h("div.aviso", s.respuesta) : h("p.tenue", "Aún sin respuesta."));
      } catch (err) { vaciar(estado, h("div.aviso.error", err.message)); }
    } }, h("h2", "Ver mi solicitud"), campo("Código privado", clave), h("button.boton", { type: "submit" }, "Ver"), estado),
      h("div.tarjeta", h("h2", "Cómo funciona"), h("ol", h("li", "Envías la solicitud."), h("li", "El admin la revisa y te responde aquí."),
        h("li", "Si te acepta, tu cuenta pasa a moderador en periodo de prueba."), h("li", "Entras al panel y configuras la doble verificación en tu móvil."))))));
}
