import { panel } from "../api.js";
import { h, vaciar, fechaHora } from "../ui.js";
import { yo } from "./panel.js";

export async function mostrar(caja) {
  const d = await panel("/hoy");
  const c = d.contadores;
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Hoy te toca"), h("p", `Hola, ${yo.usuario}. Lo urgente primero.`))),
    h("div.cifras", { estilo: { gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginBottom: "16px" } },
      cifra(c.pendientes, "por revisar", "#/admin/cola"), cifra(c.urgentes, "urgentes", "#/admin/cola?prioridad=alta"), cifra(c.tickets, "tickets abiertos", "#/admin/tickets"),
      cifra(d.sugerencias, "sugerencias de campaña", "#/admin/campanas?vista=sugerencias"), cifra(c.aprobados_hoy, "publicados en 24 h", "#/admin/cola?estado=aprobado")),
    h("section.tarjeta", h("h2", "Tareas"), d.tareas.length ? h("div.pila", d.tareas.map((t) => h("a.tarea." + t.nivel, { href: `#/admin/${t.ir}` }, h("span.crece", t.texto), "→")))
      : h("p.vacio", "¡Todo al día! No hay nada pendiente.")),
    d.alertas.length ? h("section.tarjeta", h("h2", "Avisos importantes"), h("ul.lista-limpia", d.alertas.map((a) =>
      h("li.elemento", h("span.punto." + (a.nivel === "grave" ? "rojo" : a.nivel === "aviso" ? "ambar" : "")), h("span.crece", a.mensaje), h("span.tenue", fechaHora(a.fecha))))),
      h("a.boton.chico", { href: "#/admin/servidor/seguridad" }, "Ver seguridad")) : null,
    c.fallos > 20 ? h("div.aviso.atencion", `${c.fallos} intentos de acceso fallidos en 24 h.`) : null);
}

function cifra(n, t, href) { return h("a.cifra", { href, estilo: { textDecoration: "none", color: "inherit" } }, h("b", String(n ?? 0)), h("span", t)); }
