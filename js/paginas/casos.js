import { pedir, obtenerCatalogos } from "../api.js";
import { h, vaciar, fecha, icono, seleccion, vacio } from "../ui.js";

export async function mostrar(main, _p, params) {
  const cat = await obtenerCatalogos();
  const pagina = Number(params.get("pagina") || 1);
  const tipo = params.get("tipo") || "";
  const d = await pedir(`/api/casos?pagina=${pagina}${tipo ? "&tipo=" + encodeURIComponent(tipo) : ""}`);
  const sel = seleccion("tipo", cat.tipos, tipo, { vacioTexto: "Todos los tipos" });
  sel.addEventListener("change", () => { location.hash = `#/casos?tipo=${sel.value}`; });
  const paginas = Math.ceil(d.total / 20);
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Casos publicados"), h("p", `${d.total} casos revisados por moderación`)), h("div", { estilo: { minWidth: "240px" } }, sel)),
    h("section.tarjeta", d.casos.length ? h("ul.lista-limpia", d.casos.map((c) => h("li", h("a.elemento", { href: `#/caso/${c.codigo}` },
      h("span.crece", h("span.titulo", c.titulo), h("span.meta", `${c.codigo} · ${c.tipo_nombre} · ${c.provincia} · ${fecha(c.fecha)}`)), icono("flecha"))))) : vacio("Todavía no hay casos publicados.")),
    paginas > 1 ? h("div.fila", { estilo: { justifyContent: "center", marginTop: "16px" } },
      pagina > 1 ? h("a.boton", { href: `#/casos?pagina=${pagina - 1}&tipo=${tipo}` }, "Anterior") : null, h("span.tenue", `Página ${pagina} de ${paginas}`),
      pagina < paginas ? h("a.boton", { href: `#/casos?pagina=${pagina + 1}&tipo=${tipo}` }, "Siguiente") : null) : null);
}
