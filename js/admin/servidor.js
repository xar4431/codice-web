// Apartado «Servidor»: ver todo y gestionar solo lo que no puede dejarte sin servidor.
import { panel, blobUrl } from "../api.js";
import { h, vaciar, insignia, bytes, fechaHora, hace, toast, cargando, vacio, confirmar } from "../ui.js";
import { pedirCodigo2fa } from "./panel.js";

const TABS = [["resumen", "Resumen"], ["almacenamiento", "Almacenamiento"], ["explorador", "Explorador"], ["limpieza", "Limpieza"], ["respaldos", "Respaldos"], ["red", "Red"], ["seguridad", "Seguridad"], ["registros", "Registros"]];
const COLORES = ["var(--azul)", "var(--violeta)", "var(--ambar)", "var(--verde)", "var(--rojo)", "var(--tenue)"];

export async function mostrar(caja, [tab = "resumen"], params) {
  const cuerpo = h("div", cargando());
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Servidor faro"), h("p", "Iniciar, detener o reiniciar el servidor y apagar la PC solo se hace en la app de faro, nunca desde la web."))),
    h("div.pestanas", { role: "tablist" }, TABS.map(([k, t]) => h("button", { type: "button", role: "tab", "aria-selected": String(k === tab), onclick: () => { location.hash = `#/admin/servidor/${k}`; } }, t))),
    cuerpo);
  // En el móvil, que la pestaña abierta quede a la vista aunque esté al final de la fila.
  caja.querySelector('.pestanas [aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  try { await SECCIONES[tab](cuerpo, params); } catch (e) { vaciar(cuerpo, h("div.aviso.error", e.message)); }
}

const estadoServicio = (e) => insignia(e === "active" ? "funcionando" : e === "inactive" ? "detenido" : e === "failed" ? "con fallo" : e, e === "active" ? "verde" : e === "failed" ? "rojo" : "");
const barra = (pct, color) => h("div.medidor", h("div", { estilo: { width: `${Math.min(100, pct || 0)}%`, background: color || (pct > 85 ? "var(--rojo)" : pct > 70 ? "var(--ambar)" : "var(--verde)") } }));

const SECCIONES = {
  async resumen(c) {
    const d = await panel("/servidor/resumen");
    vaciar(c, h("div.rejilla",
      h("section.tarjeta", h("h2", h("span.punto.verde"), " En línea"), h("p", `Encendido ${hace(d.encendido_desde)} (${fechaHora(d.encendido_desde)})`), h("p.tenue", `CODICE ${d.version}`),
        d.agente_visto ? h("p.tenue", `Vigilante activo ${hace(d.agente_visto)}`) : h("p.aviso.atencion", "El vigilante de faro aún no ha escrito su estado.")),
      h("section.tarjeta", h("h2", "Equipo"),
        h("p", `CPU ${d.cpu ?? "—"} %`), barra(d.cpu), h("p", { estilo: { marginTop: "10px" } }, `Memoria ${d.memoria?.porcentaje ?? "—"} % (${bytes(d.memoria?.usada)} de ${bytes(d.memoria?.total)})`), barra(d.memoria?.porcentaje),
        h("p", { estilo: { marginTop: "10px" } }, `Disco ${d.disco?.porcentaje ?? "—"} % · libres ${bytes(d.disco?.libre)}`), barra(d.disco?.porcentaje),
        h("p", { estilo: { marginTop: "10px" } }, `Temperatura: ${d.temperatura ?? "—"} °C`)),
      h("section.tarjeta", h("h2", "Servicios"), h("ul.lista-limpia", d.servicios.map((s) => h("li.elemento", h("span.crece", s.titulo), estadoServicio(s.estado))))),
      h("section.tarjeta", h("h2", "Red y respaldos"), h("p", `Latencia: ${d.latencia_ms ?? "—"} ms`), h("p", "Túnel: ", d.tunel?.activo ? insignia("activo", "verde") : insignia("sin datos")),
        h("p", "Último respaldo: ", d.ultimo_respaldo ? `${hace(d.ultimo_respaldo)} ` : "nunca ", d.respaldo_ok === false ? insignia("falló", "rojo") : d.ultimo_respaldo ? insignia("correcto", "verde") : null)),
      h("section.tarjeta", h("h2", "Alertas"), h("p", `${d.alertas_sin_ver} sin ver · ${d.accesos_fallidos_24h} accesos fallidos en 24 h`),
        d.ultimas_alertas.length ? h("ul.lista-limpia", d.ultimas_alertas.map((a) => h("li.elemento.pequeno", h("span.punto." + (a.nivel === "grave" ? "rojo" : a.nivel === "aviso" ? "ambar" : "")), h("span.crece", a.mensaje), h("span.tenue", hace(a.fecha))))) : null)),
      h("p.aviso", { estilo: { marginTop: "14px" } }, "🔒 ", d.aviso));
  },
  async almacenamiento(c) {
    const d = await panel("/servidor/almacenamiento");
    const total = d.disco.total || 1;
    vaciar(c, d.aviso_80 ? h("div.aviso.error", { estilo: { marginBottom: "12px" } }, "El disco supera el 80 % de uso. Revisa la pestaña Limpieza.") : null,
      h("section.tarjeta", h("h2", `Disco: ${bytes(d.disco.usado)} usados de ${bytes(d.disco.total)} (${d.disco.porcentaje} %)`),
        h("div.medidor", { estilo: { height: "22px" } }, d.categorias.map((x, i) => h("div", { title: `${x.titulo}: ${bytes(x.bytes)}`, estilo: { width: `${(x.bytes / total) * 100}%`, background: COLORES[i % COLORES.length] } }))),
        h("ul.lista-limpia", { estilo: { marginTop: "12px" } }, d.categorias.map((x, i) => h("li.elemento", h("span.punto", { estilo: { background: COLORES[i % COLORES.length] } }), h("span.crece", x.titulo), h("strong", bytes(x.bytes))))),
        h("p.tenue", `Libre: ${bytes(d.disco.libre)} · ${d.reportes} reportes en total.`)),
      h("section.tarjeta", h("h2", "Crecimiento mensual de pruebas"), d.crecimiento.length ? h("div.desplazable", h("table.tabla", h("thead", h("tr", h("th", "Mes"), h("th", "Archivos"), h("th", "Tamaño"))),
        h("tbody", d.crecimiento.map((m) => h("tr", h("td", m.mes), h("td", String(m.archivos)), h("td", bytes(m.bytes))))))) : vacio("Aún no hay pruebas.")));
  },
  async explorador(c, params) {
    const ruta = params.get("ruta") || "";
    const d = await panel("/servidor/explorador?ruta=" + encodeURIComponent(ruta));
    vaciar(c, h("section.tarjeta", h("p.mono", "/almacen/" + d.ruta), h("p.tenue", "Ver y abrir, nunca borrar a mano: para liberar espacio usa Limpieza."),
      d.padre !== null && d.ruta ? h("a.boton.chico", { href: `#/admin/servidor/explorador?ruta=${encodeURIComponent(d.padre || "")}` }, "↑ Subir") : null,
      d.entradas.length ? h("div.desplazable", h("table.tabla", h("thead", h("tr", h("th", "Nombre"), h("th", "Tamaño"), h("th", "Modificado"), h("th", "Reporte"))),
        h("tbody", d.entradas.map((e) => h("tr",
          h("td", e.carpeta ? h("a", { href: `#/admin/servidor/explorador?ruta=${encodeURIComponent(e.ruta)}` }, "📁 " + e.nombre) : h("button.boton.chico.fantasma", { type: "button", onclick: () => abrir(e.ruta) }, e.nombre)),
          h("td", bytes(e.bytes)), h("td.tenue", fechaHora(e.modificado)), h("td", e.reporte ? h("a", { href: `#/admin/cola/${e.reporte.id}` }, e.reporte.codigo) : "—")))))) : vacio("Carpeta vacía.")));
  },
  async limpieza(c) {
    const d = await panel("/servidor/limpieza");
    const marcas = d.opciones.map((o) => [o, h("input", { type: "checkbox", value: o.clave, disabled: !o.elementos || o.clave === "respaldos" })]);
    vaciar(c, h("section.tarjeta", h("h2", "Limpieza segura"), h("p.suave", "Vista previa de lo que se borra y cuánto libera. Se borran a la vez el archivo y su ficha: nada queda roto."),
      h("ul.lista-limpia", marcas.map(([o, cb]) => h("li.elemento", h("label.casilla.crece", cb, h("span", h("strong", o.titulo), h("br"), h("span.tenue", `${o.elementos} elementos · libera ${bytes(o.bytes)}${o.nota ? " · " + o.nota : ""}${o.afecta_pruebas ? " · afecta a pruebas" : ""}`)))))),
      h("button.boton.peligro", { type: "button", onclick: async () => {
        const tipos = marcas.filter(([, cb]) => cb.checked).map(([o]) => o.clave);
        if (!tipos.length) { toast("Marca qué limpiar.", "error"); return; }
        if (!(await confirmar("Limpiar", "Lo seleccionado se borrará para siempre.", { boton: "Continuar", peligro: true }))) return;
        const codigo = await pedirCodigo2fa();
        if (!codigo) return;
        try { const r = await panel("/servidor/limpieza", { metodo: "POST", datos: { tipos, codigo_2fa: codigo } }); toast(`Limpieza hecha: ${r.elementos} elementos, ${bytes(r.bytes)} liberados.`, "ok"); SECCIONES.limpieza(c); }
        catch (e) { toast(e.message, "error"); }
      } }, "Limpiar lo marcado")));
  },
  async respaldos(c) {
    const d = await panel("/servidor/respaldos");
    vaciar(c, h("section.tarjeta", h("h2", "Respaldos"),
      h("p", "Diarios, incrementales (solo copia lo nuevo) y cifrados. Se guardan los ", String(d.conserva), " más recientes."),
      h("p", "Último: ", d.ultimo ? `${fechaHora(d.ultimo)} ` : "nunca ", d.ok === false ? insignia("falló", "rojo") : d.ultimo ? insignia("correcto", "verde") : null, d.mensaje ? h("span.tenue", ` ${d.mensaje}`) : null),
      d.comprobado ? h("p.tenue", `Última comprobación de integridad: ${fechaHora(d.comprobado)}`) : null,
      h("button.boton.primario", { type: "button", onclick: async () => { try { const r = await panel("/servidor/respaldo", { metodo: "POST" }); toast(r.mensaje, "ok"); SECCIONES.respaldos(c); } catch (e) { toast(e.message, "error"); } } }, "Hacer un respaldo ahora"),
      h("p.aviso", { estilo: { marginTop: "12px" } }, "🔒 ", d.nota)),
      h("section.tarjeta", h("h2", "Copias guardadas"), d.instantaneas.length ? h("div.desplazable", h("table.tabla", h("thead", h("tr", h("th", "Fecha"), h("th", "Id"), h("th", "Tamaño añadido"))),
        h("tbody", d.instantaneas.slice().reverse().map((s) => h("tr", h("td", fechaHora(s.fecha)), h("td.mono", s.id), h("td", bytes(s.bytes))))))) : vacio("Todavía no hay copias.")),
      h("section.tarjeta", h("h2", "Tareas recientes"), d.tareas.length ? h("ul.lista-limpia", d.tareas.map((t) => h("li.elemento.pequeno", h("span.crece", `${t.tipo} · ${t.resultado || ""}`), insignia(t.estado, t.estado === "hecha" ? "verde" : t.estado === "fallida" ? "rojo" : "azul"), h("span.tenue", fechaHora(t.pedida))))) : vacio("Sin tareas.")));
  },
  async red(c) {
    const d = await panel("/servidor/red");
    const hist = d.historial_latencia || [];
    const max = Math.max(50, ...hist.map((x) => x.ms || 0));
    vaciar(c, h("div.rejilla",
      h("section.tarjeta", h("h2", "Latencia"), h("p.grande", `${d.latencia_ms ?? "—"} ms`), h("p", "Internet: ", d.internet === false ? insignia("sin conexión", "rojo") : insignia("conectado", "verde")),
        hist.length ? h("div.linea-tiempo", { estilo: { height: "80px" } }, hist.map((x) => h("div.barra", { title: `${fechaHora(x.fecha)}: ${x.ms ?? "sin red"} ms`, estilo: { height: `${((x.ms || max) / max) * 100}%`, background: x.ms == null ? "var(--rojo)" : "var(--azul)" } }))) : null),
      h("section.tarjeta", h("h2", "Tráfico"), h("p", `Hoy: ↓ ${bytes(d.trafico?.hoy_rx)} · ↑ ${bytes(d.trafico?.hoy_tx)}`), h("p", `Este mes: ↓ ${bytes(d.trafico?.mes_rx)} · ↑ ${bytes(d.trafico?.mes_tx)}`), h("p.tenue", d.trafico?.fuente || "")),
      h("section.tarjeta", h("h2", "Túnel"), h("p", d.tunel?.activo ? insignia("activo", "verde") : insignia("sin datos", "rojo")), d.tunel?.direccion ? h("p.mono.pequeno", d.tunel.direccion) : null, d.tunel?.detalle ? h("p.tenue", d.tunel.detalle) : null),
      h("section.tarjeta", h("h2", "Cortes de Internet"), d.cortes?.length ? h("ul.lista-limpia", d.cortes.map((x) => h("li.elemento.pequeno", h("span.crece", `${fechaHora(x.desde)} → ${x.hasta ? fechaHora(x.hasta) : "ahora"}`)))) : h("p.tenue", "Sin cortes registrados."))));
  },
  async seguridad(c) {
    const d = await panel("/servidor/seguridad");
    await panel("/alertas/vistas", { metodo: "POST" }).catch(() => {});
    vaciar(c, h("div.rejilla",
      h("section.tarjeta", h("h2", "Orígenes bloqueados"), h("p.tenue", "Bloqueos cortos: en Cuba muchas personas comparten conexión."), d.bloqueos.length ? h("ul.lista-limpia", d.bloqueos.map((b) => h("li.elemento",
        h("span.crece", h("span.titulo.mono", b.origen.slice(0, 10) + "…"), h("span.meta", `${b.motivo} · hasta ${fechaHora(b.hasta)}`)),
        h("button.boton.chico", { type: "button", onclick: async () => { await panel("/servidor/desbloquear", { metodo: "POST", datos: { origen: b.origen } }); toast("Desbloqueado.", "ok"); SECCIONES.seguridad(c); } }, "Desbloquear")))) : h("p.tenue", "Ninguno ahora.")),
      h("section.tarjeta", h("h2", "Intentos de acceso fallidos (24 h)"), d.fallos_por_hora.length ? h("div.linea-tiempo", { estilo: { height: "80px" } }, d.fallos_por_hora.map((f) => h("div.barra", { title: `${fechaHora(f.hora)}: ${f.intentos}`, estilo: { height: `${Math.min(100, f.intentos * 5)}%`, background: "var(--ambar)" } }))) : h("p.tenue", "Ninguno.")),
      h("section.tarjeta", h("h2", "Antivirus y cortafuegos"), h("p", "Antivirus: ", d.antivirus?.activo ? insignia("activo", "verde") : insignia("sin datos")), d.antivirus?.firmas ? h("p.tenue", `Firmas: ${d.antivirus.firmas}`) : null,
        h("p", "Cortafuegos: ", d.cortafuegos ? insignia(d.cortafuegos, d.cortafuegos === "activo" ? "verde" : "rojo") : insignia("sin datos")))),
      h("section.tarjeta", h("h2", "Alertas"), d.alertas.length ? h("ul.lista-limpia", d.alertas.map((a) => h("li.elemento.pequeno", h("span.punto." + (a.nivel === "grave" ? "rojo" : a.nivel === "aviso" ? "ambar" : "")), h("span.crece", a.mensaje), h("span.tenue", fechaHora(a.fecha))))) : vacio("Sin alertas.")));
  },
  async registros(c, params) {
    const fuente = params.get("fuente") || "api";
    const nivel = params.get("nivel") || "";
    const d = await panel(`/servidor/registros?fuente=${fuente}&nivel=${nivel}`);
    const fuentes = { api: "API", web: "Servidor web", tunel: "Túnel", base: "Base de datos", respaldo: "Respaldos", agente: "Vigilante", antivirus: "Antivirus" };
    vaciar(c, h("div.fila", { estilo: { marginBottom: "10px" } }, Object.entries(fuentes).map(([k, t]) => h("a.boton.chico" + (k === fuente ? ".primario" : ""), { href: `#/admin/servidor/registros?fuente=${k}&nivel=${nivel}` }, t)),
      h("a.boton.chico" + (nivel ? ".primario" : ".fantasma"), { href: `#/admin/servidor/registros?fuente=${fuente}&nivel=${nivel ? "" : "errores"}` }, "Solo errores")),
      h("pre.tarjeta.pequeno", { estilo: { whiteSpace: "pre-wrap", maxHeight: "65vh", overflow: "auto" } }, d.lineas.join("\n")));
  },
};

async function abrir(ruta) {
  try { window.open(await blobUrl(`/api/panel/servidor/archivo?ruta=${encodeURIComponent(ruta)}`), "_blank", "noopener"); }
  catch (e) { toast(e.message, "error"); }
}
