import { panel } from "../api.js";
import { h, vaciar, insignia, fecha, fechaHora, toast, vacio, dialogo, campo, confirmar } from "../ui.js";
import { yo, puede } from "./panel.js";

const SANCIONES = { aviso: "Aviso", silencio: "Silenciar (no puede reportar)", suspension: "Suspender (no puede entrar)", baneo: "Baneo permanente" };

export async function mostrar(caja, [id], params) {
  if (id) return detalle(caja, Number(id));
  const q = h("input", { type: "search", placeholder: "Buscar usuario…", value: params.get("q") || "" });
  const rol = h("select", h("option", { value: "" }, "Todos"), h("option", { value: "usuario" }, "Usuarios"), h("option", { value: "moderador" }, "Moderadores"), h("option", { value: "admin" }, "Admin"));
  rol.value = params.get("rol") || "";
  const ir = () => { location.hash = `#/admin/usuarios?q=${encodeURIComponent(q.value)}&rol=${rol.value}`; };
  q.addEventListener("change", ir); rol.addEventListener("change", ir);
  const d = await panel(`/usuarios?q=${encodeURIComponent(q.value)}&rol=${rol.value}`);
  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Usuarios"), h("p", "Roles, permisos, confianza y sanciones."))),
    h("div.fila", { estilo: { marginBottom: "12px" } }, h("div", { estilo: { flex: "2 1 180px", minWidth: 0 } }, q), h("div", { estilo: { flex: "1 1 140px", minWidth: 0, maxWidth: "220px" } }, rol)),
    h("div.tarjeta.desplazable", d.usuarios.length ? h("table.tabla", h("thead", h("tr", h("th", "Usuario"), h("th", "Rol"), h("th", "Reportes"), h("th", "Confianza"), h("th", "Sanción"), h("th", "Último acceso"))),
      h("tbody", d.usuarios.map((u) => h("tr", h("td", h("a", { href: `#/admin/usuarios/${u.id}` }, u.usuario)),
        h("td", insignia(u.rol + (u.en_prueba ? " · prueba" : ""), u.rol === "admin" ? "rojo" : u.rol === "moderador" ? "azul" : "")),
        h("td", `${u.reportes} (${u.aprobados} publ., ${u.falsos} falsos)`), h("td", String(u.confianza)), h("td", u.sancion ? insignia(u.sancion, "rojo") : "—"), h("td.tenue", fechaHora(u.ultimo_acceso)))))) : vacio("Sin resultados.")));
}

async function detalle(caja, id) {
  const r = await panel(`/usuarios/${id}`);
  const u = r.usuario;
  const recargar = () => detalle(caja, id);
  const esAdmin = yo.rol === "admin";
  const permisos = Object.entries(r.nombres_permisos).map(([k, t]) => {
    const c = h("input", { type: "checkbox", value: k, checked: !!u.permisos[k] });
    return [k, c, h("label.casilla", c, h("span", t))];
  });
  const prueba = h("input", { type: "checkbox", checked: u.en_prueba });
  vaciar(caja, h("a.volver", { href: "#/admin/usuarios" }, "← Usuarios"),
    h("div.cabecera-pagina", h("div", h("h1", u.usuario), h("p", `${u.rol}${u.en_prueba ? " en periodo de prueba" : ""} · desde ${fecha(u.creado)} · confianza ${u.confianza} · 2FA ${u.totp_activo ? "activa" : "no"}`))),
    h("div.portada",
      h("div.pila",
        u.rol !== "admin" && puede("sancionar") ? h("section.tarjeta", h("h2", "Sancionar"), h("p.suave", "El usuario verá una pantalla con el motivo general y podrá pedir una revisión una sola vez."),
          h("div.fila", Object.entries(SANCIONES).filter(([k]) => k !== "baneo" || esAdmin).map(([k, t]) => h("button.boton.chico" + (k === "baneo" ? ".peligro" : ""), { type: "button", onclick: () => sancionar(id, k, recargar) }, t))),
          h("div.fila", { estilo: { marginTop: "10px" } }, h("button.boton.chico.fantasma", { type: "button", onclick: async () => {
            if (!(await confirmar("Rechazar pendientes", "Se rechazarán todos sus reportes pendientes como falsos.", { boton: "Rechazar todos", peligro: true }))) return;
            const x = await panel(`/usuarios/${id}/rechazar-pendientes`, { metodo: "POST" }); toast(`${x.rechazados} reportes rechazados.`, "ok"); recargar();
          } }, "Rechazar todos sus reportes pendientes"))) : null,
        h("section.tarjeta", h("h2", "Sanciones"), u.sanciones.length ? h("ul.lista-limpia", u.sanciones.map((s) => h("li.elemento",
          h("span.crece", h("span.titulo", `${SANCIONES[s.tipo]}${s.automatica ? " (automática)" : ""}`), h("span.meta", `${s.motivo} · ${fechaHora(s.creada)}${s.hasta ? " → " + fecha(s.hasta) : ""} · por ${s.autor || "el sistema"}${s.revision_pedida ? " · pidió revisión" : ""}`)),
          s.levantada ? insignia("levantada") : h("button.boton.chico", { type: "button", onclick: async () => { await panel(`/sanciones/${s.id}/levantar`, { metodo: "POST" }); toast("Sanción levantada.", "ok"); recargar(); } }, "Levantar")))) : h("p.tenue", "Sin sanciones.")),
        h("section.tarjeta", h("h2", "Reportes"), u.reportes.length ? h("ul.lista-limpia", u.reportes.map((x) => h("li", h("a.elemento", { href: `#/admin/cola/${x.id}` }, h("span.crece", x.codigo), x.broma ? insignia("falso", "rojo") : null, insignia(x.estado, "estado-" + x.estado), h("span.tenue", fecha(x.creado)))))) : h("p.tenue", "Sin reportes.")),
        u.historial.length ? h("section.tarjeta", h("h2", "Acciones de esta cuenta"), h("ul.lista-limpia", u.historial.map((x) => h("li.elemento.pequeno", h("span.crece", `${x.accion} ${x.objeto || ""}`), h("span.tenue", fechaHora(x.fecha)))))) : null),
      h("aside.pila",
        esAdmin && u.rol !== "admin" ? h("section.tarjeta", h("h2", "Rol y permisos"),
          u.rol === "moderador" ? [h("label.casilla", prueba, h("span", "Periodo de prueba (sin datos privados completos ni descargas)")), h("hr.separador"),
            h("div.fila", { estilo: { marginBottom: "8px" } }, h("span.tenue.mini", "Perfil rápido:"),
              h("button.boton.chico.fantasma", { type: "button", onclick: () => permisos.forEach(([k, c]) => { c.checked = !!r.por_defecto[k]; }) }, "Moderador"),
              h("button.boton.chico.fantasma", { type: "button", onclick: () => { permisos.forEach(([k, c]) => { c.checked = !!r.perfil_investigador[k]; }); prueba.checked = false; } }, "Investigador")),
            h("p.tenue.mini", "Investigador: trabaja expedientes, datos y el mapa; no modera reportes ni toca usuarios. Pulsa «Guardar permisos» para aplicarlo."),
            permisos.map((p) => p[2]),
            h("div.fila", { estilo: { marginTop: "10px" } }, h("button.boton.primario", { type: "button", onclick: async () => {
              await panel(`/usuarios/${id}/rol`, { metodo: "POST", datos: { rol: "moderador", en_prueba: prueba.checked, permisos: Object.fromEntries(permisos.map(([k, c]) => [k, c.checked])) } });
              toast("Permisos guardados.", "ok"); recargar();
            } }, "Guardar permisos"), h("button.boton.peligro", { type: "button", onclick: async () => {
              if (!(await confirmar("Quitar rol de moderador", "Se cerrarán todas sus sesiones al instante.", { boton: "Quitar rol", peligro: true }))) return;
              await panel(`/usuarios/${id}/rol`, { metodo: "POST", datos: { rol: "usuario" } }); toast("Ya no es moderador.", "ok"); recargar();
            } }, "Quitar rol"))]
            : h("div.pila", h("button.boton", { type: "button", onclick: async () => { await panel(`/usuarios/${id}/rol`, { metodo: "POST", datos: { rol: "moderador", en_prueba: true, permisos: {} } }); toast("Ahora es moderador en periodo de prueba.", "ok"); recargar(); } }, "Hacer moderador (periodo de prueba)"),
              h("button.boton.fantasma", { type: "button", onclick: async () => {
                if (!(await confirmar("Hacer investigador", "Podrá ver datos privados de los casos para investigarlos. No podrá moderar reportes ni tocar usuarios. Necesitará la doble verificación para entrar.", { boton: "Hacer investigador" }))) return;
                await panel(`/usuarios/${id}/rol`, { metodo: "POST", datos: { rol: "moderador", en_prueba: false, permisos: r.perfil_investigador } }); toast("Ahora es investigador.", "ok"); recargar();
              } }, "Hacer investigador"))) : null,
        esAdmin ? h("section.tarjeta", h("h2", "Acceso"),
          h("div.pila", h("button.boton.chico", { type: "button", onclick: async () => {
            const x = await panel(`/usuarios/${id}/codigo-temporal`, { metodo: "POST" });
            dialogo("Código temporal de recuperación", h("div", h("p", "Dáselo a la persona por su ticket. Vale 48 horas y una sola vez:"), h("div.codigo-privado", x.codigo)));
          } }, "Crear código temporal (48 h)"),
          h("button.boton.chico", { type: "button", onclick: async () => { const x = await panel(`/usuarios/${id}/cerrar-sesiones`, { metodo: "POST" }); toast(`${x.cerradas} sesiones cerradas.`, "ok"); } }, "Cerrar todas sus sesiones"),
          u.rol !== "usuario" ? h("button.boton.chico", { type: "button", onclick: async () => { await panel(`/usuarios/${id}/reiniciar-2fa`, { metodo: "POST" }); toast("La próxima vez configurará la doble verificación de nuevo.", "ok"); recargar(); } }, "Reiniciar su doble verificación") : null)) : null)));
}

async function sancionar(id, tipo, recargar) {
  const motivo = h("textarea", { placeholder: "Motivo general que verá el usuario" });
  const dias = h("select", [1, 3, 7, 30, 90].map((d) => h("option", { value: d }, `${d} ${d === 1 ? "día" : "días"}`)));
  dias.value = "7";
  const rechazar = h("input", { type: "checkbox" });
  const ok = await dialogo(SANCIONES[tipo], h("div.pila", campo("Motivo", motivo), ["silencio", "suspension"].includes(tipo) ? campo("Duración", dias) : null,
    tipo !== "aviso" ? h("label.casilla", rechazar, h("span", "Rechazar también todos sus reportes pendientes")) : null),
    { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Aplicar", valor: true, clase: tipo === "baneo" ? "peligro" : "primario" }] });
  if (!ok) return;
  try { await panel(`/usuarios/${id}/sancion`, { metodo: "POST", datos: { tipo, motivo: motivo.value, dias: Number(dias.value), rechazar_pendientes: rechazar.checked } }); toast("Sanción aplicada.", "ok"); recargar(); }
  catch (e) { toast(e.message, "error"); }
}
