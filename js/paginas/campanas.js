import { pedir, SinConexion } from "../api.js";
import { campanasEnCopia } from "../copia.js";
import { h, vaciar, insignia, fecha, vacio } from "../ui.js";

export async function mostrar(main) {
  let lista, aviso = null;
  try { lista = (await pedir("/api/campanas")).campanas; }
  catch (e) {
    if (!(e instanceof SinConexion)) throw e;
    lista = await campanasEnCopia().catch(() => []);
    aviso = (await import("../mantenimiento.js" + ((window.CODICE_CONFIG || {}).edicion ? "?e=" + window.CODICE_CONFIG.edicion : ""))).aviso();
  }
  const filtro = h("input", { type: "search", placeholder: "Filtrar por nombre…", "aria-label": "Filtrar campañas" });
  const rejilla = h("div.rejilla");
  const pintar = () => {
    const q = filtro.value.trim().toLowerCase();
    const vis = lista.filter((k) => !q || k.nombre.toLowerCase().includes(q));
    vaciar(rejilla, vis.length ? vis.map(tarjeta) : vacio("No hay campañas que coincidan."));
  };
  filtro.addEventListener("input", pintar);
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Campañas de estafa"), h("p", "Grupos de casos que el equipo de CODICE ha relacionado entre sí."))), aviso,
    h("div.campo", filtro), rejilla);
  pintar();
}

function tarjeta(k) {
  return h("a.tarjeta", { href: `#/campana/${k.slug}`, estilo: { textDecoration: "none", color: "inherit", display: "block" } },
    h("div.fila", { estilo: { justifyContent: "space-between" } }, insignia(k.veredicto_nombre, "ver-" + k.veredicto), h("span.tenue", `${k.casos} casos`)),
    h("h3", { estilo: { marginTop: "10px" } }, k.nombre),
    k.resumen ? h("p.suave", k.resumen.slice(0, 180)) : null,
    k.desde ? h("p.tenue", `${fecha(k.desde)} – ${fecha(k.hasta)}${k.provincias?.length ? " · " + k.provincias.slice(0, 3).join(", ") : ""}`) : null);
}
