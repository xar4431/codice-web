import { pedir } from "../api.js";
import { dibujarGrafo, leyendaGrafo } from "../grafo.js";
import { h, vaciar, insignia, fecha, icono, copiar } from "../ui.js";

export async function mostrar(main, [slug]) {
  const k = (await pedir("/api/campanas/" + encodeURIComponent(slug || ""))).campana;
  document.title = `${k.nombre} · CODICE`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("grafo");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Grafo de casos e indicadores compartidos de la campaña");
  const max = Math.max(1, ...k.linea.map((m) => m.casos));
  vaciar(main,
    h("a.volver", { href: "#/campanas" }, icono("atras"), "Campañas"),
    h("div.cabecera-pagina", h("div", insignia(k.veredicto_nombre, "ver-" + k.veredicto), h("h1", { estilo: { marginTop: "8px" } }, k.nombre),
      h("p", `${k.casos} casos · ${fecha(k.desde)} – ${fecha(k.hasta)} · actualizada ${fecha(k.actualizada)}`)),
      h("div.fila", h("button.boton.chico", { type: "button", onclick: () => compartir(k) }, "Compartir"), h("a.boton.chico.primario", { href: "#/reportar" }, "Me pasó a mí"))),
    h("div.portada",
      h("div.pila",
        k.resumen ? h("section.tarjeta", h("h2", "Resumen"), h("p", k.resumen)) : null,
        k.como_opera ? h("section.tarjeta", h("h2", "Cómo opera"), h("p", k.como_opera)) : null,
        k.como_protegerse ? h("section.tarjeta", h("h2", "Cómo protegerte"), h("p", k.como_protegerse)) : null,
        h("section.tarjeta", h("h2", "Cómo se conectan los casos"), svg, leyendaGrafo(h),
          h("p.tenue", "Los datos aparecen tapados en parte. Un número o tarjeta puede pertenecer a una cuenta prestada: aquí se conectan indicadores, no se acusa a personas.")),
        h("section.tarjeta", h("h2", "Casos de la campaña"), h("ul.lista-limpia", k.lista.map((c) => h("li", h("a.elemento", { href: `#/caso/${c.codigo}` },
          h("span.crece", h("span.titulo", c.titulo), h("span.meta", `${c.codigo} · ${c.municipio}, ${c.provincia} · ${fecha(c.fecha)}`)), icono("flecha"))))))),
      h("aside.pila",
        h("section.tarjeta", h("h2", "Indicadores"), h("p.tenue", "Si te escriben desde alguno de estos, es la misma campaña."),
          h("ul.lista-limpia", k.indicadores.map((i) => h("li.elemento", h("span.crece", h("span.indicador", i.valor), h("span.meta", ` ${i.tipo_nombre}`)), h("span.tenue", `${i.casos}`))))),
        h("section.tarjeta", h("h2", "Línea de tiempo"), h("div.linea-tiempo", { role: "img", "aria-label": "Casos por mes" },
          k.linea.map((m) => h("div.barra", { title: `${m.mes}: ${m.casos} casos`, estilo: { height: `${(m.casos / max) * 100}%` } }, h("span", m.mes.slice(2))))),
          h("div", { estilo: { height: "22px" } })),
        h("section.tarjeta", h("h2", "Provincias"), h("ul.lista-limpia", k.provincias.map((p) => h("li.elemento", h("span.crece", p.nombre), h("b", String(p.casos)))))))));
  requestAnimationFrame(() => dibujarGrafo(svg, k.grafo, { alTocar: (n) => { if (n.tipo === "caso") location.hash = `#/caso/${n.id}`; } }));
}

function compartir(k) {
  const url = `${(window.CODICE_CONFIG || {}).sitio || location.origin}/campana/${k.slug}`;
  if (navigator.share) navigator.share({ title: k.nombre, text: `Alerta de estafa: ${k.nombre}`, url }).catch(() => {});
  else copiar(url);
}
