import { pedir, urlApi } from "../api.js";
import { h, vaciar, insignia, fecha, icono, copiar, NIVELES } from "../ui.js";

export async function mostrar(main, [codigo]) {
  const c = (await pedir("/api/casos/" + encodeURIComponent(codigo || ""))).caso;
  document.title = `${c.titulo} · ${c.codigo} · CODICE`;
  vaciar(main,
    h("a.volver", { href: c.campana ? `#/campana/${c.campana.slug}` : "#/casos" }, icono("atras"), c.campana ? c.campana.nombre : "Casos"),
    h("div.cabecera-pagina", h("div", h("span.mono.tenue", c.codigo), h("h1", c.titulo),
      h("div.ficha-meta", h("span", c.tipo_nombre), h("span", c.canal_nombre), h("span", `${c.municipio}, ${c.provincia}`), h("span", fecha(c.fecha)),
        c.entidad ? h("span", `Suplanta a: ${c.entidad}`) : null)),
      h("div.fila", h("button.boton.chico", { type: "button", onclick: () => compartir(c) }, "Compartir"))),
    h("div.portada",
      h("div.pila",
        h("section.tarjeta", h("h2", "Qué pasó"), h("p", c.resumen || "—"), h("p.tenue", "Reportado por: Anónimo · Resumen revisado por moderación.")),
        c.pruebas.length ? h("section.tarjeta", h("h2", "Pruebas"), h("div.galeria", c.pruebas.map((p) => prueba(p, c))),
          h("p.tenue", "Los datos personales de la víctima están tapados. Cada prueba lleva la marca de agua de CODICE.")) : null,
        h("section.tarjeta", h("h2", "¿Te pasó lo mismo?"), h("p.suave", "Súmate a este caso con tu propio reporte y tus pruebas. Pasa por la misma revisión."),
          h("a.boton.primario", { href: `#/reportar?caso=${c.codigo}` }, "Me pasó también"),
          c.tambien ? h("p.tenue", { estilo: { marginTop: "8px" } }, `${c.tambien} personas más reportaron lo mismo.`) : null)),
      h("aside.pila",
        c.campana ? h("section.tarjeta", h("h2", "Campaña"), h("a", { href: `#/campana/${c.campana.slug}` }, c.campana.nombre)) : null,
        c.indicadores.length ? h("section.tarjeta", h("h2", "Indicadores"), h("ul.lista-limpia", c.indicadores.map((i) => h("li.elemento", h("span.indicador", i.valor))))) : null,
        c.relacionados.length ? h("section.tarjeta", h("h2", "Casos relacionados"), h("ul.lista-limpia", c.relacionados.map((r) =>
          h("li", h("a.elemento", { href: `#/caso/${r.codigo}` }, h("span.crece", h("span.titulo", r.titulo), h("span.meta", r.codigo)), insignia(NIVELES[r.nivel], "nivel-" + r.nivel)))))) : null,
        h("p.tenue", "¿Algo de esta publicación es incorrecto o te afecta? ", h("a", { href: `#/ayuda?caso=${c.codigo}` }, "Envía una queja")))));
}

function prueba(p, c) {
  const url = urlApi(p.url);
  if (p.mime?.startsWith("image/")) return h("a", { href: url, target: "_blank", rel: "noopener" }, h("img", { src: url, alt: `Prueba del caso ${c.codigo}`, loading: "lazy" }));
  if (p.mime?.startsWith("video/")) return h("figure", h("video", { src: url, controls: true, preload: "metadata" }));
  return h("a.boton", { href: url, target: "_blank", rel: "noopener" }, icono("descargar"), "Ver documento");
}

function compartir(c) {
  const url = `${(window.CODICE_CONFIG || {}).sitio || location.origin}/caso/${c.codigo}`;
  if (navigator.share) navigator.share({ title: c.titulo, text: `Caso de estafa reportado en CODICE: ${c.titulo}`, url }).catch(() => {});
  else copiar(url);
}
