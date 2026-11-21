// Apartado «Métricas»: visitas de la web pública en tiempo real (sin Google ni cookies; el panel no cuenta).
import { panel, ErrorApi } from "../api.js";
import { h, vaciar, cargando, fecha } from "../ui.js";
import { grafico, leyenda, barrasH, kpi, cambio, num, nombrePais, EQUIPOS } from "./graficos.js";

const PERIODOS = [["24h", "24 horas"], ["7d", "7 días"], ["30d", "30 días"]];
const CADA = 15000; // se actualiza sola cada 15 s mientras la pestaña está a la vista
const DIA = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short" });
const DIA_CORTO = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const HORA = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const MES = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });
const MES_CORTO = new Intl.DateTimeFormat("es", { month: "short" });
const TIPOS = { telefono: "Teléfono", perfil: "Perfil", url: "Enlace", dominio: "Dominio", correo: "Correo", referencia_pago: "Tarjeta o cuenta de cobro", otro: "Otro" };

let temporizador = null;

export async function mostrar(caja) {
  clearInterval(temporizador);
  let periodo = "24h", serieDe = "visitas", datos = null;
  const cambiarSerie = (x) => { serieDe = x; if (datos) pintar(cuerpo, datos, periodo, serieDe, cambiarSerie); };
  const vivo = h("span.en-vivo", h("span.punto"), "En vivo");
  const botones = PERIODOS.map(([k, t]) => h("button", { type: "button", "aria-pressed": String(k === periodo), onclick: () => { periodo = k; botones.forEach((b, i) => b.setAttribute("aria-pressed", String(PERIODOS[i][0] === k))); cargar(true); } }, t));
  const cuerpo = h("div", cargando());
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Métricas"),
    h("p", "Visitas de la web pública. Sin Google, sin cookies y sin guardar la IP de nadie; el panel no cuenta."))),
    h("div.barra-herramientas", h("div.segmentos", { role: "group", "aria-label": "Periodo" }, botones), vivo),
    cuerpo);

  async function cargar(primera = false) {
    if (!caja.isConnected) { clearInterval(temporizador); return; }
    // No se actualiza mientras la pestaña está oculta ni mientras miras el detalle de una barra.
    if (!primera && (document.hidden || cuerpo.querySelector(".con-seleccion"))) return;
    if (primera) vaciar(cuerpo, cargando());
    try {
      const d = await panel("/metricas?periodo=" + periodo);
      datos = d;
      vaciar(vivo, h("span.punto"), `En vivo · ${HORA.format(new Date())}`);
      pintar(cuerpo, d, periodo, serieDe, cambiarSerie);
    } catch (e) {
      clearInterval(temporizador);
      const viejo = e instanceof ErrorApi && e.estado === 404;
      vaciar(cuerpo, h("div.aviso" + (viejo ? ".atencion" : ".error"), viejo
        ? "Las métricas necesitan faro 1.2. Cuando actualices faro, esta sección empezará a contar las visitas."
        : e.message));
    }
  }
  await cargar(true);
  temporizador = setInterval(() => cargar(), CADA);
}

function etiquetaTiempo(t, paso) {
  const d = new Date(paso === "hour" ? t : t + "T12:00:00");
  return paso === "hour"
    ? { larga: `${DIA.format(d)} · ${HORA.format(d)}`, corta: HORA.format(d) }
    : { larga: DIA.format(d), corta: DIA_CORTO.format(d) };
}

function pintar(cuerpo, d, periodo, serieDe, alCambiarSerie) {
  const t = d.totales;
  const [cv, clv] = cambio(t.visitas, t.visitas_antes);
  const [cp, clp] = cambio(t.visitantes, t.visitantes_antes);
  const color = serieDe === "visitas" ? "var(--primario)" : "var(--violeta)";
  const nombreSerie = serieDe === "visitas" ? "visitas" : "visitantes";
  const serie = d.serie.map((s) => { const e = etiquetaTiempo(s.t, d.paso); return { etiqueta: e.larga, corta: e.corta, partes: [{ valor: s[serieDe], color, nombre: nombreSerie }], detalle: serieDe === "visitas" ? `${num(s.visitantes)} visitantes` : `${num(s.visitas)} visitas` }; });
  const pico = d.serie.reduce((a, s) => (s[serieDe] > (a?.[serieDe] ?? -1) ? s : a), null);
  const resumen = pico && pico[serieDe]
    ? [h("strong", `${num(d.serie.reduce((n, s) => n + s[serieDe], 0))} ${nombreSerie}`), ` · el ${d.paso === "hour" ? "momento" : "día"} con más: `, h("b", num(pico[serieDe])), ` (${etiquetaTiempo(pico.t, d.paso).larga})`, h("span.tenue", " · toca una barra para ver su detalle")]
    : [h("span", "Todavía no hay visitas en este periodo.")];
  const totalEquipos = d.dispositivos.reduce((n, x) => n + x.visitas, 0);
  const horas = d.horas.map((x) => ({ etiqueta: `${String(x.hora).padStart(2, "0")}:00 – ${String(x.hora).padStart(2, "0")}:59`, corta: `${x.hora} h`, partes: [{ valor: x.visitas, color: "var(--azul)", nombre: "visitas" }] }));
  const horaPico = d.horas.reduce((a, x) => (x.visitas > a.visitas ? x : a), d.horas[0]);
  const meses = d.meses.map((m) => { const f = new Date(m.mes + "-15T12:00:00"); return { etiqueta: MES.format(f), corta: MES_CORTO.format(f), partes: [{ valor: m.visitas, color: "var(--primario)", nombre: "visitas" }], detalle: `${num(m.visitantes)} visitantes` }; });
  const r = d.reportes || {};
  vaciar(cuerpo,
    h("div.kpis",
      kpi("Ahora mismo", num(d.ahora), "personas en los últimos 5 min"),
      kpi("Visitas", num(t.visitas), cv, clv),
      kpi("Visitantes", num(t.visitantes), cp, clp),
      kpi("Reportes recibidos", num(r.recibidos), `${num(r.sin_cuenta)} sin cuenta`),
      kpi("Aprobados", num(r.aprobados), `${num(r.rechazados)} rechazados`)),
    h("section.tarjeta",
      h("div.barra-herramientas", { estilo: { marginBottom: "8px" } }, h("h2", { estilo: { margin: 0 } }, d.paso === "hour" ? "Por hora" : "Por día"),
        h("div.segmentos", { role: "group", "aria-label": "Qué contar" }, [["visitas", "Visitas"], ["visitantes", "Visitantes"]].map(([k, x]) =>
          h("button", { type: "button", "aria-pressed": String(k === serieDe), onclick: () => alCambiarSerie(k) }, x)))),
      grafico(serie, { resumen }),
      h("p.tenue.mini", { estilo: { marginTop: "10px" } }, "Visitantes: personas distintas en un mismo día (no se puede seguir a nadie de un día a otro).")),
    h("div.rejilla", { estilo: { marginTop: "14px" } },
      h("section.tarjeta", h("h2", "Horas con más visitas"), h("p.tenue", "Hora de Cuba."),
        grafico(horas, { bajo: true, ejes: ["0 h", "6 h", "12 h", "18 h", "23 h"], resumen: horaPico?.visitas ? ["Más visitas a las ", h("b", `${horaPico.hora}:00`), ` (${num(horaPico.visitas)})`] : "Sin datos todavía." })),
      h("section.tarjeta", h("h2", "Equipos"),
        totalEquipos ? h("div.medidor", { estilo: { height: "18px", margin: "6px 0 12px" } }, d.dispositivos.map((x) =>
          h("div", { title: `${EQUIPOS[x.valor] || x.valor}: ${x.visitas}`, estilo: { width: `${(x.visitas / totalEquipos) * 100}%`, background: colorEquipo(x.valor) } }))) : null,
        totalEquipos ? leyenda(d.dispositivos.map((x) => [`${EQUIPOS[x.valor] || x.valor} ${Math.round((x.visitas / totalEquipos) * 100)} %`, colorEquipo(x.valor)])) : h("p.tenue", "Sin datos todavía."),
        h("h3", { estilo: { margin: "18px 0 8px", fontSize: "1rem" } }, "Sistemas"), barrasH(d.sistemas.map((x) => ({ nombre: x.valor, valor: x.visitas })), { color: "var(--azul)" })),
      h("section.tarjeta", h("h2", "Navegadores"), barrasH(d.navegadores.map((x) => ({ nombre: x.valor, valor: x.visitas })), { color: "var(--violeta)" }))),
    h("h2", { estilo: { margin: "22px 0 10px" } }, "De dónde nos visitan"),
    h("div.rejilla",
      h("section.tarjeta", h("h2", "Países"), barrasH(d.paises.map((x) => ({ nombre: nombrePais(x.valor), valor: x.visitas, detalle: `${x.visitantes} visitantes` }))),
        d.sin_ubicacion ? h("p.tenue.mini", { estilo: { marginTop: "10px" } }, `${num(d.sin_ubicacion)} sin país (VPN o redes privadas).`) : null),
      h("section.tarjeta", h("h2", "Provincias de Cuba"), barrasH(d.cuba.map((x) => ({ nombre: x.valor, valor: x.visitas })), { color: "var(--faro)", vacio: "Aún no hay visitas con provincia de Cuba." })),
      h("section.tarjeta", h("h2", "Ciudades de Cuba"), barrasH(d.ciudades.map((x) => ({ nombre: x.valor, valor: x.visitas })), { color: "var(--faro)", vacio: "Aún no hay visitas con ciudad de Cuba." }))),
    !d.geo?.rangos ? h("p.tenue.mini", { estilo: { marginTop: "8px" } }, "La base de ubicación todavía no está cargada en faro: los países aparecerán cuando termine.") : null,
    h("h2", { estilo: { margin: "22px 0 10px" } }, "Qué miran y de dónde llegan"),
    h("div.rejilla",
      h("section.tarjeta", h("h2", "Secciones más vistas"), barrasH(d.secciones.map((x) => ({ nombre: x.valor, valor: x.visitas })))),
      h("section.tarjeta", h("h2", "Páginas más vistas"), barrasH(d.paginas.map((x) => ({ nombre: x.valor === "/" ? "/ (inicio)" : x.valor, valor: x.visitas })), { color: "var(--azul)" })),
      h("section.tarjeta", h("h2", "Llegan desde"), h("p.tenue", "Otras webs y redes que enlazan a CODICE (sin contar a quien escribe la dirección)."),
        barrasH(d.origenes.map((x) => ({ nombre: nombreOrigen(x.valor), valor: x.visitas, detalle: x.valor })), { color: "var(--verde)", vacio: "Nadie ha llegado todavía desde otra web." }))),
    h("section.tarjeta", { estilo: { marginTop: "14px" } }, h("h2", "Búsquedas sin resultado"),
      h("p.tenue", "Datos que buscaron 2 o más personas en los últimos 30 días y que aún no están en CODICE: pueden ser estafas nuevas."),
      d.busquedas_vacias.length ? h("div.desplazable", h("table.tabla", h("thead", h("tr", h("th", "Tipo"), h("th", "Dato buscado"), h("th", "Personas"), h("th", "Última vez"))),
        h("tbody", d.busquedas_vacias.map((b) => h("tr", h("td", TIPOS[b.tipo] || b.tipo), h("td", h("span.indicador", b.valor)), h("td", num(b.personas)), h("td.tenue", fecha(b.ultima)))))))
        : h("p.tenue", "Ninguna por ahora.")),
    meses.length ? h("section.tarjeta", { estilo: { marginTop: "14px" } }, h("h2", "Mes a mes"),
      grafico(meses, { bajo: true, resumen: `Visitas por mes (${meses.length} ${meses.length === 1 ? "mes" : "meses"} con datos).` })) : null,
    h("p.tenue.mini", { estilo: { marginTop: "14px" } }, "Se actualiza sola cada 15 segundos."));
}

// Las redes envían a veces dominios intermedios (l.wl.co es WhatsApp; lm.facebook.com, Facebook…).
const ORIGENES = [[/(^|\.)(wa\.me|whatsapp\.com|l\.wl\.co|wl\.co)$/, "WhatsApp"], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, "Telegram"], [/(^|\.)(instagram\.com)$/, "Instagram"], [/(^|\.)(x\.com|t\.co|twitter\.com)$/, "X (Twitter)"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"], [/(^|\.)tiktok\.com$/, "TikTok"], [/(^|\.)google\.[a-z.]+$/, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"]];
function nombreOrigen(d) { const m = ORIGENES.find(([re]) => re.test(d)); return m ? `${m[1]} (${d})` : d; }

function colorEquipo(v) { return v === "movil" ? "var(--primario)" : v === "pc" ? "var(--violeta)" : "var(--ambar)"; }
