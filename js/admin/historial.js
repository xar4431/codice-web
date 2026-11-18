import { panel } from "../api.js";
import { h, vaciar, fechaHora, vacio } from "../ui.js";
import { yo } from "./panel.js";

export async function mostrar(caja, _p, params) {
  const pagina = Number(params.get("pagina") || 1);
  const q = h("input", { type: "search", placeholder: "Filtrar por acción, objeto o detalle…", value: params.get("q") || "" });
  q.addEventListener("change", () => { location.hash = `#/admin/historial?q=${encodeURIComponent(q.value)}`; });
  const d = await panel(`/historial?pagina=${pagina}&q=${encodeURIComponent(q.value)}`);
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Historial"), h("p", yo.rol === "admin" ? "Registro imborrable de todas las acciones." : "Tus acciones (el admin ve las de todos)."))),
    h("div.campo", q),
    h("div.tarjeta.desplazable", d.eventos.length ? h("table.tabla", h("thead", h("tr", h("th", "Fecha"), h("th", "Quién"), h("th", "Acción"), h("th", "Objeto"), h("th", "Detalle"))),
      h("tbody", d.eventos.map((e) => h("tr", h("td.tenue", fechaHora(e.fecha)), h("td", e.actor), h("td", e.accion), h("td.mono.pequeno", e.objeto || ""),
        h("td.pequeno", Object.entries(e.detalle || {}).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")))))) : vacio("Sin eventos.")),
    h("div.fila", { estilo: { justifyContent: "center", marginTop: "12px" } }, pagina > 1 ? h("a.boton", { href: `#/admin/historial?pagina=${pagina - 1}&q=${encodeURIComponent(q.value)}` }, "Anterior") : null,
      d.eventos.length === 100 ? h("a.boton", { href: `#/admin/historial?pagina=${pagina + 1}&q=${encodeURIComponent(q.value)}` }, "Más antiguos") : null));
}
