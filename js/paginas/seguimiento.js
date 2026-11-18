import { pedir, subir, sesion } from "../api.js";
import { h, vaciar, campo, insignia, fechaHora, toast, icono } from "../ui.js";

export async function mostrar(main, [caso]) {
  const cod = h("input", { type: "text", name: "codigo", autocomplete: "off", placeholder: "XXXX-XXXX-XXXX-XXXX-XXXX", autocapitalize: "characters" });
  const res = h("div", { "aria-live": "polite" });
  let codigoActual = null;
  const consultar = async () => {
    try {
      codigoActual = cod.value.trim();
      const r = await pedir("/api/seguimiento", { metodo: "POST", datos: { codigo: codigoActual } });
      pintar(res, r.reporte, { codigo: codigoActual }, consultar);
    } catch (e) { vaciar(res, h("div.aviso.error", { role: "alert" }, e.message)); }
  };
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Seguimiento de mi reporte"), h("p", "Usa el código privado que recibiste al enviar el reporte."))),
    h("div.tarjeta", { estilo: { maxWidth: "760px" } },
      h("form", { onsubmit: (e) => { e.preventDefault(); consultar(); } }, campo("Código privado", cod), h("button.boton.primario", { type: "submit" }, "Ver estado")),
      sesion.usuario ? h("p.tenue", { estilo: { marginTop: "10px" } }, "¿Lo enviaste con tu cuenta? Lo tienes en ", h("a", { href: "#/cuenta" }, "Mi cuenta"), ".") : null),
    res);
  if (caso && sesion.usuario) {
    // Reporte propio desde «Mi cuenta»
    const yo = await pedir("/api/cuenta");
    const r = yo.cuenta.reportes.find((x) => x.codigo === caso);
    if (r) vaciar(res, h("div.tarjeta", { estilo: { maxWidth: "760px", marginTop: "14px" } }, h("h2", r.codigo), insignia(r.estado_nombre, "estado-" + r.estado),
      ["pendiente", "cambios"].includes(r.estado) ? formularioRespuesta({ caso }, () => location.reload()) : null));
  }
}

export function pintar(caja, r, acceso, recargar) {
  vaciar(caja, h("div.tarjeta", { estilo: { maxWidth: "760px", marginTop: "14px" } },
    h("div.fila", { estilo: { justifyContent: "space-between" } }, h("h2", { estilo: { margin: 0 } }, r.codigo), insignia(r.estado_nombre, "estado-" + r.estado)),
    h("p.tenue", `${r.tipo} · enviado ${fechaHora(r.creado)} · ${r.pruebas} pruebas`),
    r.estado === "cambios" ? h("div.aviso.atencion", "Moderación necesita cambios: lee el mensaje y responde abajo.") : null,
    r.publicado ? h("div.aviso.ok", "Tu reporte está publicado. ", h("a", { href: `#/caso/${r.codigo}` }, "Ver la ficha pública"), ". ¡Gracias por ayudar!") : null,
    r.motivo_rechazo ? h("div.aviso", h("strong", "Motivo: "), r.motivo_rechazo) : null,
    r.mensajes.length ? h("div.pila", { estilo: { marginTop: "12px" } }, h("h3", "Conversación con moderación"), r.mensajes.map((m) =>
      h("div.aviso" + (m.autor === "moderacion" ? "" : ".ok"), h("strong", m.autor === "moderacion" ? "Moderación" : "Tú"), h("span.tenue", ` · ${fechaHora(m.fecha)}`), h("p", { estilo: { margin: "6px 0 0" } }, m.texto)))) : null,
    r.puede_responder ? formularioRespuesta(acceso, recargar) : null,
    !r.puede_responder && !r.publicado ? h("p.tenue", "¿Quieres corregir o retirar tu reporte? Escríbenos en ", h("a", { href: "#/ayuda" }, "Ayuda y quejas"), ".") : null));
}

function formularioRespuesta(acceso, recargar) {
  const texto = h("textarea", { maxlength: 3000, placeholder: "Escribe tu respuesta o explica las pruebas que añades" });
  const arch = h("input", { type: "file", multiple: true, accept: "image/*,application/pdf,video/*,audio/*" });
  const boton = h("button.boton.primario", { type: "submit" }, icono("subir"), "Enviar respuesta");
  return h("form.pila", { estilo: { marginTop: "16px" }, onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("datos", JSON.stringify({ ...acceso, texto: texto.value }));
    for (const f of arch.files) fd.append("archivos", f, f.name);
    boton.disabled = true;
    try { await subir("/api/seguimiento/responder", fd); toast("Respuesta enviada. Moderación la revisará.", "ok"); recargar(); }
    catch (err) { toast(err.message, "error"); } finally { boton.disabled = false; }
  } }, h("h3", "Responder y añadir pruebas"), campo("Tu respuesta", texto), campo("Pruebas nuevas (opcional)", arch), h("div", boton));
}
