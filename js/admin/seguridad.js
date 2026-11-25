// Servidor → Seguridad: semaforo, incidentes, bloqueos y sesiones del panel. Todo pasa dentro de faro
import { panel, blobUrl, ErrorApi } from "../api.js";
import { h, vaciar, insignia, fechaHora, hace, toast, cargando, vacio, confirmar, campo } from "../ui.js";
import { puede } from "./panel.js";
import { grafico, leyenda, barrasH, num, nombrePais, EQUIPOS } from "./graficos.js";

const VISTAS = [["resumen", "Resumen"], ["bloqueos", "Bloqueos"], ["incidentes", "Incidentes"], ["sesiones", "Sesiones"]];
const NIVEL = { alto: ["Grave", "rojo"], medio: ["Medio", "ambar"], bajo: ["Leve", ""] };
const DURACIONES = [["1h", "1 hora"], ["24h", "24 horas"], ["7d", "7 días"], ["30d", "30 días"], ["siempre", "Para siempre"]];
const HORA = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

export async function mostrar(c, params) {
  const ver = VISTAS.some(([k]) => k === params.get("ver")) ? params.get("ver") : "resumen";
  const cuerpo = h("div", cargando());
  vaciar(c, h("div.barra-herramientas", h("div.segmentos", { role: "group", "aria-label": "Seguridad" }, VISTAS.map(([k, t]) =>
    h("button", { type: "button", "aria-pressed": String(k === ver), onclick: () => { location.hash = `#/admin/servidor/seguridad?ver=${k}`; } }, t)))), cuerpo);
  try { await VISTA[ver](cuerpo, params); }
  catch (e) {
    vaciar(cuerpo, h("div.aviso" + (e instanceof ErrorApi && e.estado === 404 ? ".atencion" : ".error"),
      e instanceof ErrorApi && e.estado === 404 ? "Esta parte necesita faro 1.2. Actualiza faro y vuelve aquí." : e.message));
  }
}

const lugar = (texto) => texto ? texto.split(" · ").map((x, i) => (i === 0 && x.length === 2 ? nombrePais(x) : x)).join(" · ") : "lugar desconocido";
const nivel = (n) => insignia(NIVEL[n]?.[0] || n, NIVEL[n]?.[1] || "");

const VISTA = {
  async resumen(c) {
    const d = await panel("/servidor/seguridad");
    panel("/alertas/vistas", { metodo: "POST" }).catch(() => {});
    const s = d.semaforo || { nivel: "verde", titulo: "Sin datos", motivos: [] };
    const integ = d.integridad;
    const escudo = d.escudo || {};
    const serie = (d.incidentes_por_hora || []).map((x) => {
      const f = new Date(x.hora);
      return { etiqueta: `${HORA.format(f)} – ${HORA.format(new Date(f.getTime() + 3599e3))}`, corta: HORA.format(f),
        partes: [{ valor: x.bajo, color: "var(--tenue)", nombre: "leves" }, { valor: x.medio, color: "var(--ambar)", nombre: "medios" }, { valor: x.alto, color: "var(--rojo)", nombre: "graves" }] };
    });
    const total24 = (d.incidentes_por_tipo || []).reduce((n, t) => n + t.n, 0);
    vaciar(c,
      h("section.tarjeta.semaforo." + s.nivel, { role: "status" },
        h("div.luz", { "aria-hidden": "true" }),
        h("div", h("h2", s.titulo), h("ul", s.motivos.map((m) => h("li", m)))),
        h("div.semaforo-datos",
          h("div", h("b", num(total24)), h("span", "incidentes en 24 h")),
          h("div", h("b", num(d.bloqueos.length)), h("span", "orígenes bloqueados ahora")),
          h("div", h("b", escudo.activo ? (escudo.auto ? "Activo (solo)" : "Activo") : "Apagado"), h("span", escudo.activo && escudo.auto && escudo.hasta ? `escudo hasta las ${HORA.format(new Date(escudo.hasta))}` : "escudo / modo protección")),
          h("div", h("b", integ ? (integ.ok ? "Correctos" : "Cambiados") : "—"), h("span", "archivos de faro")))),
      h("div.pila", { estilo: { gap: "14px" } },
        h("div.dos",
          h("section.tarjeta", h("h2", "Incidentes (24 h)"),
            serie.length ? [grafico(serie, { bajo: true, resumen: total24 ? `${num(total24)} incidentes. Toca una barra para ver esa hora.` : "Ningún incidente en las últimas 24 horas." }),
              leyenda([["Graves", "var(--rojo)"], ["Medios", "var(--ambar)"], ["Leves", "var(--tenue)"]])] : h("p.tenue", "Sin datos."),
            h("h3", { estilo: { margin: "20px 0 10px", fontSize: "1rem" } }, "Qué ha pasado"),
            barrasH((d.incidentes_por_tipo || []).map((t) => ({ nombre: t.nombre, valor: t.n })), { color: "var(--ambar)", vacio: "Nada que contar: todo tranquilo." }),
            h("p", { estilo: { marginTop: "12px" } }, h("a", { href: "#/admin/servidor/seguridad?ver=incidentes" }, "Ver el registro completo →"))),
          h("section.tarjeta", h("h2", "Últimos incidentes importantes"),
            d.ultimos?.length ? h("ul.lista-limpia", d.ultimos.map((i) => h("li.incidente", h("span.punto." + (i.nivel === "alto" ? "rojo" : "ambar")),
              h("div", h("p", h("strong", i.tipo), " · ", i.detalle), h("span.meta", `${hace(i.fecha)} · ${lugar(i.lugar)}`))))) : h("p.tenue", "Ninguno."))),
        h("div.rejilla",
          h("section.tarjeta", h("h2", "Intentos de acceso fallidos (24 h)"), intentosPorHora(d.fallos_por_hora)),
          h("section.tarjeta", h("h2", "Archivos de faro"),
            !integ ? h("p.tenue", "El vigilante aún no lo ha comprobado (lo hace cada 10 minutos).")
              : integ.ok ? [h("p", insignia("correctos", "verde"), ` Coinciden con CODICE ${integ.version}.`), h("p.tenue", `Nadie los ha cambiado. Comprobado ${hace(integ.fecha)}.`)]
                : [h("p.aviso.error", "Hay archivos cambiados sin una actualización. Si no los cambiaste tú, avisa enseguida."),
                  h("ul.lista-limpia", integ.cambios.map((x) => h("li.elemento.pequeno.mono", x))), h("p.tenue", `Comprobado ${hace(integ.fecha)}.`)]),
          h("section.tarjeta", h("h2", "Antivirus y cortafuegos"), h("p", "Antivirus: ", d.antivirus?.activo ? insignia("activo", "verde") : insignia("sin datos")), d.antivirus?.firmas ? h("p.tenue", `Firmas: ${d.antivirus.firmas}`) : null,
            h("p", "Cortafuegos: ", d.cortafuegos ? insignia(d.cortafuegos, d.cortafuegos === "activo" ? "verde" : "rojo") : insignia("sin datos")))),
        h("div.dos",
          h("section.tarjeta", h("h2", "De dónde vienen los ataques (7 días)"),
            barrasH((d.paises_ataque || []).map((p) => ({ nombre: nombrePais(p.pais), valor: p.n })), { color: "var(--rojo)", vacio: "Sin ataques con país conocido." })),
          h("section.tarjeta", h("h2", "Base de ubicación"),
            d.geo?.rangos ? h("p", insignia("cargada", "verde"), ` ${num(d.geo.rangos)} rangos de IP`) : h("p", insignia("sin cargar", "ambar"), " Se carga sola tras actualizar faro."),
            d.geo?.fecha ? h("p.tenue", `Actualizada ${hace(d.geo.fecha)}. Se renueva sola cada mes.`) : null,
            d.geo?.ok === false && d.geo?.mensaje ? h("p.tenue", d.geo.mensaje) : null,
            h("p.tenue.mini", "La ubicación se calcula dentro de faro: ninguna IP sale hacia otras empresas."))),
        h("section.tarjeta", h("h2", "Alertas"), d.alertas.length ? h("ul.lista-limpia", d.alertas.slice(0, 30).map((a) => h("li.elemento.pequeno", h("span.punto." + (a.nivel === "grave" ? "rojo" : a.nivel === "aviso" ? "ambar" : "")), h("span.crece", a.mensaje), h("span.tenue", fechaHora(a.fecha))))) : vacio("Sin alertas."))));
  },

  async bloqueos(c) {
    const d = await panel("/seguridad/bloqueos");
    const admin = puede("admin");
    const objetivo = h("input", { type: "text", inputmode: "decimal", placeholder: "Ej.: 152.206.10.20", autocomplete: "off", spellcheck: "false" });
    const duracion = h("select", DURACIONES.map(([k, t]) => h("option", { value: k, selected: k === "24h" }, t)));
    const motivo = h("input", { type: "text", maxlength: 200, placeholder: "Ej.: avalancha de reportes falsos" });
    const recargar = () => VISTA.bloqueos(c);
    vaciar(c, h("div.portada",
      h("div.pila",
        h("section.tarjeta", h("h2", "Bloqueados ahora"),
          d.bloqueos.length ? h("ul.lista-limpia", d.bloqueos.map((b) => h("li.elemento",
            h("span.crece", h("span.titulo.mono", b.red || (b.origen ? b.origen + "…" : "—")),
              h("span.meta.completa", `${b.motivo} · ${lugar(b.lugar)} · ${b.permanente ? ("para siempre") : ("hasta ") + fechaHora(b.hasta)}${b.veces > 1 ? ` · ${b.veces} ${("veces")}` : ""}${b.autor && b.tipo === "manual" ? ` · ${("por")} ${b.autor}` : ""}`)),
            insignia(b.tipo === "manual" ? "manual" : "automático", b.tipo === "manual" ? "azul" : ""),
            h("button.boton.chico", { type: "button", onclick: async () => {
              if (!(await confirmar("Desbloquear", "Esa conexión podrá volver a usar CODICE enseguida.", { boton: "Desbloquear" }))) return;
              try { await panel(`/seguridad/bloqueos/${b.id}`, { metodo: "DELETE" }); toast("Desbloqueado.", "ok"); recargar(); } catch (e) { toast(e.message, "error"); }
            } }, "Desbloquear")))) : h("p.tenue", "Nadie bloqueado ahora mismo.")),
        h("section.tarjeta", h("h2", "Historial de bloqueos"),
          d.historial.length ? h("ul.lista-limpia", d.historial.map((x) => h("li.incidente", h("span.punto.ambar"),
            h("div", h("p", x.detalle), h("span.meta", `${fechaHora(x.fecha)} · ${x.ip || "—"} · ${lugar(x.lugar)}`))))) : h("p.tenue", "Todavía no hubo bloqueos."))),
      h("aside.pila",
        admin ? h("section.tarjeta", h("h2", "Bloquear una IP"),
          h("p.suave", "Para quien sabotea sin cuenta. Puedes copiar la IP desde el registro de Incidentes. Desde Reportes también puedes bloquear la conexión de un reporte sin cuenta."),
          h("div.formulario-bloqueo",
            h("div.ancho", campo("IP o rango pequeño", objetivo, { ayuda: "Una IP, o un rango de hasta 256 direcciones (/24)." })),
            campo("Duración", duracion), campo("Motivo", motivo),
            h("div.ancho", h("button.boton.peligro", { type: "button", onclick: async () => {
              if (!objetivo.value.trim()) { toast("Escribe la IP.", "error"); objetivo.focus(); return; }
              if (duracion.value === "siempre" && !(await confirmar("Bloquear para siempre", "Solo se podrá quitar a mano desde aquí. En Cuba una IP puede ser de muchas personas: úsalo solo con ataques claros.", { boton: "Bloquear", peligro: true }))) return;
              try { await panel("/seguridad/bloqueos", { metodo: "POST", datos: { objetivo: objetivo.value.trim(), duracion: duracion.value, motivo: motivo.value } }); toast("Bloqueada.", "ok"); recargar(); }
              catch (e) { toast(e.message, "error"); }
            } }, "Bloquear"))),
          h("p.aviso.atencion", { estilo: { marginTop: "12px" } }, "En Cuba muchas personas comparten la misma IP (ETECSA). Prefiere bloqueos cortos; los rangos grandes no se permiten.")) : null,
        h("section.tarjeta", h("h2", "Cómo bloquea faro solo"),
          h("ul", { estilo: { margin: 0, paddingLeft: "18px" } },
            h("li", "Robots que piden rutas trampa (/wp-admin, /.env…): 24 h."),
            h("li", "Herramientas de ataque (sqlmap, nikto…): 24 h."),
            h("li", "3 intentos de inyección de código en 10 min: 24 h."),
            h("li", "Muchas contraseñas incorrectas: unos minutos."),
            h("li", "Muchas rutas que no existen (escaneo): 1 h."),
            h("li", "Demasiadas peticiones seguidas: 10 min."),
            h("li", "Avalancha de reportes sin cuenta desde una conexión: 24 h.")),
          h("p.tenue", { estilo: { marginTop: "10px" } }, "Al equipo de moderación con sesión abierta nunca se le bloquea solo.")))));
  },

  async incidentes(c, params) {
    const tipo = params.get("tipo") || "", niv = params.get("nivel") || "", dias = params.get("dias") || "7", modo = params.get("modo") || "lista";
    const consulta = `tipo=${encodeURIComponent(tipo)}&nivel=${niv}&dias=${dias}`;
    const d = await panel(`/seguridad/incidentes?${consulta}`);
    const ir = (cambios) => { const p = new URLSearchParams({ ver: "incidentes", tipo, nivel: niv, dias, modo, ...cambios }); location.hash = `#/admin/servidor/seguridad?${p}`; };
    const selTipo = h("select", { onchange: (e) => ir({ tipo: e.target.value }) }, h("option", { value: "" }, "Todos los tipos"),
      Object.entries(d.tipos).map(([k, t]) => h("option", { value: k, selected: k === tipo }, t)));
    const selNivel = h("select", { onchange: (e) => ir({ nivel: e.target.value }) }, h("option", { value: "" }, "Todas las gravedades"),
      Object.entries(NIVEL).map(([k, [t]]) => h("option", { value: k, selected: k === niv }, t)));
    const selDias = h("select", { onchange: (e) => ir({ dias: e.target.value }) }, [["1", "Último día"], ["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["180", "180 días"]].map(([k, t]) => h("option", { value: k, selected: k === String(d.dias) }, t)));
    const cuenta = { alto: 0, medio: 0, bajo: 0 };
    (d.cuenta || []).forEach((x) => { cuenta[x.nivel] = (cuenta[x.nivel] || 0) + x.n; });
    const descargar = async () => {
      try {
        const url = await blobUrl(`/api/panel/seguridad/incidentes.txt?${consulta}`);
        const a = h("a", { href: url, download: `codice-incidentes-${d.dias}d.txt` }); document.body.append(a); a.click(); a.remove();
      } catch (e) { toast(e.message, "error"); }
    };
    const texto = () => d.incidentes.map((i) => [new Date(i.fecha).toISOString().replace("T", " ").slice(0, 19) + " UTC", (i.nivel || "").toUpperCase().padEnd(5),
      i.tipo.padEnd(16), (i.ip || (i.origen ? i.origen + "…" : "—")).padEnd(18), (i.lugar || "—").padEnd(18), (i.peticion || "—").padEnd(28), i.detalle].join("  ")).join("\n");
    vaciar(c,
      h("section.tarjeta",
        h("div.filtros.anchos", selTipo, selNivel, selDias),
        h("div.barra-herramientas", { estilo: { margin: "12px 0 0" } },
          h("div.fila", insignia(`${num(cuenta.alto)} graves`, "rojo"), insignia(`${num(cuenta.medio)} medios`, "ambar"), insignia(`${num(cuenta.bajo)} leves`)),
          h("div.fila",
            h("div.segmentos", { role: "group", "aria-label": "Vista" }, [["lista", "Lista"], ["texto", "Texto plano"]].map(([k, t]) => h("button", { type: "button", "aria-pressed": String(k === modo), onclick: () => ir({ modo: k }) }, t))),
            h("button.boton.chico", { type: "button", onclick: descargar }, "Descargar .txt")))),
      h("section.tarjeta", { estilo: { marginTop: "14px" } },
        !d.incidentes.length ? h("p.tenue", "Ningún incidente con estos filtros.")
          : modo === "texto" ? h("pre.texto-plano", texto())
            : h("ul.lista-limpia", d.incidentes.map((i) => h("li.incidente", h("span.punto." + (i.nivel === "alto" ? "rojo" : i.nivel === "medio" ? "ambar" : "")),
              h("div", h("p", h("strong", i.tipo_nombre), " · ", i.detalle),
                h("span.meta", `${fechaHora(i.fecha)} · ${i.ip || (i.origen ? "origen " + i.origen + "…" : "sin origen")} · ${lugar(i.lugar)}${i.peticion ? " · " + i.peticion : ""}`),
                i.agente ? h("span.meta.mini", { estilo: { display: "block" } }, i.agente) : null))))),
      h("p.tenue.mini", { estilo: { marginTop: "10px" } }, "Se muestran hasta 300 líneas; el .txt trae todas. La IP se borra sola a los 30 días y el registro a los 180."));
  },

  async sesiones(c) {
    const d = await panel("/seguridad/sesiones");
    const recargar = () => VISTA.sesiones(c);
    const equipo = (x) => `${EQUIPOS[x.dispositivo] || x.dispositivo || "equipo"} · ${x.navegador || "?"} en ${x.sistema || "?"}`;
    vaciar(c, h("div.portada",
      h("section.tarjeta", h("h2", "Sesiones abiertas del panel"),
        h("p.tenue", "Si ves una que no reconoces, ciérrala y cambia la contraseña de esa cuenta."),
        d.sesiones.length ? h("ul.lista-limpia", d.sesiones.map((s) => h("li.elemento",
          h("span.crece", h("span.titulo", s.usuario, " ", s.esta ? insignia("esta sesión", "verde") : null),
            h("span.meta.completa", `${lugar(s.lugar)} · ${equipo(s)} · activa ${hace(s.ultimo_uso)}`)),
          s.esta ? null : h("button.boton.chico.peligro", { type: "button", onclick: async () => {
            try { await panel(`/seguridad/sesiones/${s.id}`, { metodo: "DELETE" }); toast("Sesión cerrada.", "ok"); recargar(); } catch (e) { toast(e.message, "error"); }
          } }, "Cerrar")))) : h("p.tenue", "Ninguna."),
        d.sesiones.length > 1 ? h("button.boton.peligro", { type: "button", estilo: { marginTop: "12px" }, onclick: async () => {
          if (!(await confirmar("Cerrar las demás sesiones", puede("admin") ? "Se cerrarán todas las sesiones del panel de todo el equipo menos esta." : "Se cerrarán tus otras sesiones del panel.", { boton: "Cerrar", peligro: true }))) return;
          try { const r = await panel("/seguridad/sesiones/cerrar-otras", { metodo: "POST" }); toast(`${r.cerradas} sesiones cerradas.`, "ok"); recargar(); } catch (e) { toast(e.message, "error"); }
        } }, "Cerrar todas las demás") : null),
      h("section.tarjeta", h("h2", "Últimas entradas al panel"),
        h("p.tenue", "«Nuevo» = país o equipo que esa cuenta no había usado en 90 días."),
        d.accesos.length ? h("ul.lista-limpia", d.accesos.map((a) => h("li.elemento.pequeno",
          h("span.crece", h("span.titulo", a.usuario, " ", a.nuevo ? insignia("nuevo", "rojo") : null), h("span.meta.completa", `${lugar(a.lugar)} · ${equipo(a)}`)),
          h("span.tenue", fechaHora(a.fecha))))) : h("p.tenue", "Todavía no hay entradas registradas."),
        h("p.aviso", { estilo: { marginTop: "12px" } }, "🔒 La doble verificación (código de 6 cifras del móvil) es obligatoria para todo el equipo."))));
  },
};

// una barra por hora con su numero arriba (en el movil no hay «pasar el raton») y un resumen debajo
function intentosPorHora(filas) {
  if (!filas?.length) return h("p.tenue", "Ninguno.");
  const max = Math.max(...filas.map((f) => f.intentos));
  const total = filas.reduce((n, f) => n + f.intentos, 0);
  const pico = filas.find((f) => f.intentos === max);
  return [
    h("div.linea-tiempo.con-valores", { estilo: { height: "90px" } }, filas.map((f) => h("div.barra", {
      title: `${fechaHora(f.hora)}: ${f.intentos}`, estilo: { height: `${Math.max(6, (f.intentos / max) * 100)}%`, background: "var(--ambar)" } },
      h("b.valor", String(f.intentos))))),
    h("p.tenue.mini", { estilo: { marginTop: "10px" } }, `${total} en total. Cada barra es una hora; la más alta: ${max} a las ${fechaHora(pico.hora)}.`),
  ];
}
