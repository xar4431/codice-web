import { pedir, sesion, ErrorApi } from "../api.js";
import { h, vaciar, campo, pestanas, toast, insignia, fecha, fechaHora, copiar, confirmar, erroresEnFormulario, icono } from "../ui.js";

export async function mostrar(main) {
  if (!sesion.usuario) return acceso(main);
  let yo;
  try { yo = (await pedir("/api/cuenta")).cuenta; }
  catch (e) { if (e instanceof ErrorApi && e.estado === 401) { sesion.usuario = null; return acceso(main); } throw e; }
  if (yo.sancion && ["baneo", "suspension", "silencio"].includes(yo.sancion.tipo)) pantallaSancion(main, yo);
  else panelCuenta(main, yo);
}

function mostrarCodigos(codigos) {
  return h("div.pila", h("p", "Estos son tus ", h("strong", "8 códigos de recuperación"), ". Cada uno sirve una sola vez para entrar si olvidas la contraseña. Guárdalos en un lugar seguro (captura o papel)."),
    h("div.codigo-privado", codigos.join("  ·  ")), h("button.boton", { type: "button", onclick: () => copiar(codigos.join("\n")) }, "Copiar códigos"));
}

function acceso(main) {
  const caja = h("div.tarjeta", { estilo: { maxWidth: "520px", margin: "0 auto" } });
  const formEntrar = () => {
    const u = h("input", { type: "text", name: "usuario", autocomplete: "username", autocapitalize: "none" });
    const c = h("input", { type: "password", name: "clave", autocomplete: "current-password" });
    const f = h("form", { onsubmit: async (e) => {
      e.preventDefault();
      try {
        const r = await pedir("/api/cuenta/entrar", { metodo: "POST", datos: { usuario: u.value, clave: c.value } });
        sesion.usuario = r.token; toast("Sesión iniciada.", "ok"); mostrar(main);
      } catch (err) { toast(err.message, "error"); }
    } }, campo("Usuario", u), campo("Contraseña", c), h("button.boton.primario.ancho", { type: "submit" }, "Entrar"));
    return f;
  };
  const formRegistro = () => {
    const u = h("input", { type: "text", name: "usuario", autocomplete: "username", autocapitalize: "none", maxlength: 32 });
    const c = h("input", { type: "password", name: "clave", autocomplete: "new-password" });
    const c2 = h("input", { type: "password", name: "clave2", autocomplete: "new-password" });
    const captchaImg = h("img", { alt: "Código de seguridad", width: 220, height: 72 });
    const cap = h("input", { type: "text", name: "captcha", autocomplete: "off", maxlength: 8, estilo: { maxWidth: "160px" } });
    let capId = null;
    const recargar = async () => { try { const x = await pedir("/api/captcha"); capId = x.id; captchaImg.src = x.imagen; cap.value = ""; } catch { /* */ } };
    recargar();
    const trampa = h("input", { type: "text", name: "sitio_web", tabindex: "-1", autocomplete: "off" });
    const f = h("form", { onsubmit: async (e) => {
      e.preventDefault();
      if (c.value !== c2.value) { erroresEnFormulario(f, { clave2: "Las contraseñas no coinciden." }); return; }
      try {
        const r = await pedir("/api/cuenta/registro", { metodo: "POST", datos: { usuario: u.value.trim().toLowerCase(), clave: c.value, captcha_id: capId, captcha: cap.value, sitio_web: trampa.value } });
        sesion.usuario = r.token;
        vaciar(caja, h("h2", "¡Cuenta creada!"), mostrarCodigos(r.codigos), h("a.boton.primario", { href: "#/cuenta", onclick: () => setTimeout(() => mostrar(main)) }, "Ya los guardé, continuar"));
      } catch (err) { toast(err.message, "error"); erroresEnFormulario(f, err.campos); if (err.campos?.captcha || /imagen/.test(err.message)) recargar(); }
    } }, h("p.suave", "Solo pedimos un nombre de usuario y una contraseña. Nunca correo ni teléfono. No uses tu nombre real."),
      campo("Usuario", u, { ayuda: "3 a 32 caracteres: minúsculas, números, punto o guion." }),
      campo("Contraseña", c, { ayuda: "Mínimo 10 caracteres. Mejor una frase que recuerdes." }), campo("Repite la contraseña", c2, { nombre: "clave2" }),
      h("div.campo", h("label", "Escribe los caracteres de la imagen"), h("div.captcha", captchaImg, cap, h("button.boton.fantasma.chico", { type: "button", onclick: recargar }, "Otra imagen")), h("div.error", { datos: { campo: "captcha" } })),
      h("div.trampa", { "aria-hidden": "true" }, trampa), h("button.boton.primario.ancho", { type: "submit" }, "Crear cuenta"));
    return f;
  };
  const formRecuperar = () => {
    const u = h("input", { type: "text", name: "usuario", autocapitalize: "none" });
    const cod = h("input", { type: "text", name: "codigo", autocomplete: "off" });
    const n = h("input", { type: "password", name: "nueva", autocomplete: "new-password" });
    return h("form", { onsubmit: async (e) => {
      e.preventDefault();
      try {
        const r = await pedir("/api/cuenta/recuperar", { metodo: "POST", datos: { usuario: u.value.trim().toLowerCase(), codigo: cod.value, nueva: n.value } });
        sesion.usuario = r.token; toast("Contraseña cambiada. Ya estás dentro.", "ok"); mostrar(main);
      } catch (err) { toast(err.message, "error"); }
    } }, h("p.suave", "Usa uno de tus códigos de recuperación, o el código temporal que te dé el equipo por un ticket."),
      campo("Usuario", u), campo("Código de recuperación", cod), campo("Nueva contraseña", n), h("button.boton.primario.ancho", { type: "submit" }, "Cambiar contraseña"));
  };
  const cuerpo = h("div");
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Mi cuenta"), h("p", "La cuenta es opcional: puedes reportar sin ella. Con cuenta sigues tus reportes y tickets en un solo lugar."))),
    vaciar(caja, pestanas([["entrar", "Entrar"], ["registro", "Crear cuenta"], ["recuperar", "Olvidé la contraseña"]], (k) => {
      vaciar(cuerpo, { entrar: formEntrar, registro: formRegistro, recuperar: formRecuperar }[k]());
    }), cuerpo));
}

function pantallaSancion(main, yo) {
  const s = yo.sancion;
  const titulos = { baneo: "Tu cuenta está bloqueada de forma permanente", suspension: "Tu cuenta está suspendida", silencio: "No puedes enviar reportes por ahora" };
  const texto = h("textarea", { maxlength: 2000, placeholder: "Explica por qué crees que es un error" });
  vaciar(main, h("div.tarjeta", { estilo: { maxWidth: "640px", margin: "0 auto" } },
    h("div.fila", icono("candado", 28), h("h1", { estilo: { margin: 0 } }, titulos[s.tipo])),
    h("p", { estilo: { marginTop: "12px" } }, h("strong", "Motivo: "), s.motivo),
    h("p", s.hasta ? `Hasta el ${fecha(s.hasta)}.` : "Sin fecha de fin."),
    h("div.aviso", "Puedes seguir consultando la web, buscar datos sospechosos y ver campañas y casos."),
    s.revision_pedida ? h("p.aviso.ok", { estilo: { marginTop: "12px" } }, "Ya pediste la revisión. La respuesta llegará a tus tickets.") :
      h("form.pila", { estilo: { marginTop: "16px" }, onsubmit: async (e) => {
        e.preventDefault();
        try { await pedir("/api/cuenta/sancion/revision", { metodo: "POST", datos: { texto: texto.value } }); toast("Revisión pedida. Te responderemos en un ticket.", "ok"); mostrar(main); }
        catch (err) { toast(err.message, "error"); }
      } }, h("h2", "Pedir revisión (una sola vez)"), texto, h("div", h("button.boton.primario", { type: "submit" }, "Pedir revisión"))),
    yo.tickets.length ? h("p", { estilo: { marginTop: "12px" } }, h("a", { href: "#/ayuda" }, "Ver mis tickets")) : null,
    h("button.boton.fantasma", { type: "button", estilo: { marginTop: "12px" }, onclick: () => salir(main) }, "Cerrar sesión")));
}

async function salir(main) {
  try { await pedir("/api/cuenta/salir", { metodo: "POST" }); } catch { /* da igual */ }
  sesion.usuario = null; mostrar(main);
}

function panelCuenta(main, yo) {
  const contenido = h("div");
  const secciones = {
    reportes: () => yo.reportes.length ? h("ul.lista-limpia", yo.reportes.map((r) => h("li", h("a.elemento", { href: r.estado === "aprobado" ? `#/caso/${r.codigo}` : `#/seguimiento/${r.codigo}` },
      h("span.crece", h("span.titulo", `${r.codigo} · ${r.tipo}`), h("span.meta", `Enviado ${fecha(r.creado)} · actualizado ${fechaHora(r.actualizado)}`)), insignia(r.estado_nombre, "estado-" + r.estado)))))
      : h("div.vacio", h("p", "Aún no tienes reportes guardados en tu cuenta."), h("a.boton.primario", { href: "#/reportar" }, "Reportar una estafa")),
    tickets: () => yo.tickets.length ? h("ul.lista-limpia", yo.tickets.map((t) => h("li", h("a.elemento", { href: `#/ayuda/${t.codigo}` },
      h("span.crece", h("span.titulo", t.codigo), h("span.meta", fechaHora(t.actualizado))), insignia(t.estado))))) : h("p.tenue", "No tienes tickets. ", h("a", { href: "#/ayuda" }, "Abrir uno")),
    solicitudes: () => yo.solicitudes.length ? h("ul.lista-limpia", yo.solicitudes.map((s) => h("li.elemento", h("span.crece", h("span.titulo", s.codigo), s.respuesta ? h("span.meta", s.respuesta) : h("span.meta", "Sin respuesta todavía")), insignia(s.estado))))
      : h("p.tenue", "¿Quieres ayudar a moderar? ", h("a", { href: "#/colaborar" }, "Envía una solicitud")),
    seguridad: () => seguridadCuenta(main, yo),
  };
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", `Hola, ${yo.usuario}`), h("p", `Cuenta creada el ${fecha(yo.creado)} · puedes tener hasta ${yo.max_pendientes} reportes pendientes a la vez.`)),
    h("div.fila", (yo.rol !== "usuario") ? h("a.boton", { href: "#/admin" }, "Ir al panel") : null, h("a.boton.primario", { href: "#/reportar" }, "Reportar"), h("button.boton.fantasma", { type: "button", onclick: () => salir(main) }, "Salir"))),
    yo.sancion?.tipo === "aviso" ? h("div.aviso.atencion", { estilo: { marginBottom: "14px" } }, h("strong", "Aviso de moderación: "), yo.sancion.motivo, " ",
      h("button.boton.chico", { type: "button", onclick: async () => { await pedir("/api/cuenta/sancion/visto", { metodo: "POST" }); mostrar(main); } }, "Entendido")) : null,
    h("div.tarjeta", pestanas([["reportes", `Mis reportes (${yo.reportes.length})`], ["tickets", `Mis tickets (${yo.tickets.length})`], ["solicitudes", "Mis solicitudes"], ["seguridad", "Seguridad"]],
      (k) => vaciar(contenido, secciones[k]())), contenido));
}

function seguridadCuenta(main, yo) {
  const actual = h("input", { type: "password", name: "actual", autocomplete: "current-password" });
  const nueva = h("input", { type: "password", name: "nueva", autocomplete: "new-password" });
  const caja = h("div");
  return h("div.pila",
    h("form", { onsubmit: async (e) => {
      e.preventDefault();
      try { await pedir("/api/cuenta/clave", { metodo: "POST", datos: { actual: actual.value, nueva: nueva.value } }); toast("Contraseña cambiada. Se cerraron tus otras sesiones.", "ok"); actual.value = nueva.value = ""; }
      catch (err) { toast(err.message, "error"); }
    } }, h("h3", "Cambiar contraseña"), campo("Contraseña actual", actual), campo("Nueva contraseña", nueva), h("button.boton", { type: "submit" }, "Cambiar")),
    h("hr.separador"),
    h("div", h("h3", "Códigos de recuperación"), h("p.suave", "Genera 8 códigos nuevos (los anteriores dejan de valer)."),
      h("button.boton", { type: "button", onclick: async () => {
        const c = prompt("Escribe tu contraseña para generar códigos nuevos:");
        if (!c) return;
        try { const r = await pedir("/api/cuenta/codigos", { metodo: "POST", datos: { clave: c } }); vaciar(caja, mostrarCodigos(r.codigos)); } catch (err) { toast(err.message, "error"); }
      } }, "Generar códigos nuevos"), caja),
    h("hr.separador"),
    h("div.fila", h("button.boton", { type: "button", onclick: async () => { await pedir("/api/cuenta/salir-todas", { metodo: "POST" }); sesion.usuario = null; toast("Se cerraron todas tus sesiones.", "ok"); mostrar(main); } }, "Cerrar todas mis sesiones"),
      yo.rol === "usuario" ? h("button.boton.peligro", { type: "button", onclick: async () => {
        if (!(await confirmar("Borrar mi cuenta", "Se borrará tu cuenta. Tus reportes seguirán existiendo como anónimos. Esta acción no se puede deshacer.", { boton: "Borrar cuenta", peligro: true }))) return;
        const c = prompt("Escribe tu contraseña para confirmar:");
        if (!c) return;
        try { await pedir("/api/cuenta/borrar", { metodo: "POST", datos: { clave: c } }); sesion.usuario = null; toast("Cuenta borrada.", "ok"); location.hash = "#/"; } catch (err) { toast(err.message, "error"); }
      } }, "Borrar mi cuenta") : null));
}
