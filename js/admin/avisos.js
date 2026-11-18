import { panel, subir } from "../api.js";
import { tarjetaAviso } from "../paginas/inicio.js";
import { h, vaciar, insignia, fechaHora, toast, vacio, campo, quedan, pestanas } from "../ui.js";
import { conDeshacer, puede } from "./panel.js";

export async function mostrar(caja) {
  const d = await panel("/avisos");
  const campanas = (await panel("/campanas")).campanas;
  const cuerpo = h("div");
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Avisos y noticias"), h("p", "Solo aparecen en la web mientras hay alguno activo. Cada aviso se oculta solo a las 24 horas."))),
    h("div.tarjeta", pestanas([["crear", "Nuevo aviso"], ["activos", `Activos (${d.activos.length})`], ["archivo", `Archivo (${d.archivo.length})`]],
      (k) => vaciar(cuerpo, k === "crear" ? formulario(d.puede_publicar, campanas) : lista(k === "activos" ? d.activos : d.archivo, k)), d.activos.length ? "activos" : "crear"), cuerpo));
}

function lista(avisos, tipo) {
  if (!avisos.length) return vacio(tipo === "activos" ? "No hay avisos activos: la sección no se muestra en la web." : "El archivo está vacío.");
  return h("div.pila", avisos.map((a) => h("div.tarjeta", { estilo: { padding: "12px" } },
    h("div.fila", { estilo: { justifyContent: "space-between" } }, h("strong", a.titulo || a.texto?.slice(0, 60) || "(solo imagen)"),
      h("div.fila", insignia(a.tipo === "alerta" ? "alerta" : "actualización", a.tipo === "alerta" ? "rojo" : "azul"), h("span.tenue", tipo === "activos" ? quedan(a.expira) : `publicado ${fechaHora(a.publicado)}`))),
    h("p.tenue", `por ${a.autor || "—"}`),
    h("div.fila", tipo === "activos" ? [h("button.boton.chico", { type: "button", onclick: () => accion(a.id, "extender") }, "Mantener 24 h más"),
      h("button.boton.chico.fantasma", { type: "button", onclick: () => accion(a.id, "quitar") }, "Quitar ya")]
      : [h("button.boton.chico", { type: "button", onclick: () => accion(a.id, "reactivar") }, "Volver a publicar 24 h"),
        puede("retirar") ? h("button.boton.chico.fantasma", { type: "button", onclick: async () => { const x = await panel("/papelera/mover", { metodo: "POST", datos: { tipo: "aviso", id: a.id } }); conDeshacer("Aviso en la papelera.", x.deshacer, () => location.reload()); location.reload(); } }, "Borrar") : null]))));
}

async function accion(id, a) {
  try { await panel(`/avisos/${id}/${a}`, { metodo: "POST" }); toast("Hecho.", "ok"); location.reload(); } catch (e) { toast(e.message, "error"); }
}

function formulario(puedePublicar, campanas) {
  if (!puedePublicar) return h("div.aviso", "Tu cuenta no tiene permiso para publicar avisos. El admin puede activarlo en Ajustes y en tus permisos.");
  const f = {
    tipo: h("select", h("option", { value: "actualizacion" }, "Actualización (azul, solo en la sección)"), h("option", { value: "alerta" }, "Alerta de campaña (roja, también como franja arriba)")),
    titulo: h("input", { type: "text", maxlength: 140 }), subtitulo: h("input", { type: "text", maxlength: 200 }),
    fecha: h("input", { type: "date", value: new Date().toISOString().slice(0, 10) }), texto: h("textarea", { maxlength: 3000 }),
    enlace: h("input", { type: "url", placeholder: "https://…" }), enlace_texto: h("input", { type: "text", maxlength: 40, placeholder: "Texto del botón" }),
    campana_id: h("select", h("option", { value: "" }, "Ninguna"), campanas.map((k) => h("option", { value: k.id }, k.nombre))),
  };
  const media = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif" });
  let mediaUrl = null;
  const vistaMovil = h("div.vista-movil"), vistaPc = h("div", { estilo: { maxWidth: "420px" } });
  const previa = () => {
    const a = { tipo: f.tipo.value, titulo: f.titulo.value, subtitulo: f.subtitulo.value, fecha: f.fecha.value, texto: f.texto.value, enlace: f.enlace.value || null,
      enlace_texto: f.enlace_texto.value, media: mediaUrl, media_mime: media.files[0]?.type === "image/gif" ? "image/gif" : "image/jpeg",
      campana: f.campana_id.value ? { slug: "#", nombre: "" } : null, expira: new Date(Date.now() + 86400000).toISOString() };
    vaciar(vistaMovil, h("div", { estilo: { padding: "12px" } }, tarjetaAviso(a)));
    vaciar(vistaPc, tarjetaAviso(a));
  };
  Object.values(f).forEach((c) => c.addEventListener("input", previa));
  media.addEventListener("change", () => { mediaUrl = media.files[0] ? URL.createObjectURL(media.files[0]) : null; previa(); });
  const boton = h("button.boton.primario", { type: "submit" }, "Publicar 24 horas");
  const form = h("form.portada", { onsubmit: async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(Object.entries(f).map(([k, c]) => [k, c.value]));
    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));
    if (media.files[0]) fd.append("media", media.files[0]);
    boton.disabled = true;
    try { await subir("/api/panel/avisos", fd, null, { panel: true }); toast("Aviso publicado. Se ocultará solo en 24 h.", "ok"); location.reload(); }
    catch (err) { toast(err.message, "error"); } finally { boton.disabled = false; }
  } },
    h("div.pila", h("p.suave", "Todos los campos son opcionales: lo que no rellenes no aparece. Necesitas al menos un título, un texto o una imagen."),
      campo("Tipo", f.tipo), campo("Imagen o GIF (máx. 8 MB)", media, { ayuda: "Los GIF se convierten a un formato más ligero que se ve igual." }),
      campo("Título", f.titulo), campo("Subtítulo", f.subtitulo), campo("Fecha", f.fecha), campo("Texto", f.texto),
      h("div.rejilla", campo("Enlace (solo https)", f.enlace, { nombre: "enlace" }), campo("Texto del botón", f.enlace_texto)), campo("Enlazar a una campaña", f.campana_id), h("div", boton)),
    h("div.pila", h("h3", "Vista previa · móvil"), vistaMovil, h("h3", "Vista previa · PC"), vistaPc));
  previa();
  return form;
}
