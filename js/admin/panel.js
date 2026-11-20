// Panel de admin y moderación: acceso con doble verificación y navegación interna.
import { panel, pedir, sesion, ErrorApi } from "../api.js";
import { h, vaciar, campo, toast, cargando, icono, copiar } from "../ui.js";
import { iniciar as iniciarAvisos, detener as detenerAvisos, pintarContadores, botonAjustes } from "./notificador.js";

// Las pantallas se piden con la edición de la web para que el navegador no use copias viejas.
const E = "?e=" + ((window.CODICE_CONFIG || {}).edicion || "");
const SECCIONES = {
  "": ["Tareas", () => import("./hoy.js" + E)],
  cola: ["Reportes", () => import("./cola.js" + E), "revisar"],
  importar: ["Importar casos", () => import("./importar.js" + E), "admin"],
  campanas: ["Campañas", () => import("./campanas.js" + E)],
  investigacion: ["Investigación", () => import("./investigacion.js" + E)],
  tickets: ["Tickets", () => import("./tickets.js" + E), "tickets"],
  solicitudes: ["Colaboración", () => import("./solicitudes.js" + E), "tickets"],
  usuarios: ["Usuarios", () => import("./usuarios.js" + E), "sancionar"],
  avisos: ["Avisos", () => import("./avisos.js" + E)],
  papelera: ["Papelera", () => import("./papelera.js" + E), "retirar"],
  historial: ["Historial", () => import("./historial.js" + E)],
  metricas: ["Métricas", () => import("./metricas.js" + E), "servidor"],
  servidor: ["Servidor", () => import("./servidor.js" + E), "servidor"],
  ajustes: ["Ajustes", () => import("./ajustes.js" + E), "admin"],
};
const GRUPOS = [["Trabajo diario", ["", "cola", "importar", "campanas", "investigacion"]], ["Comunidad", ["tickets", "solicitudes", "usuarios", "avisos"]],
  ["Control", ["papelera", "historial", "metricas", "servidor", "ajustes"]]];

export let yo = null;
let inactividad;

export async function mostrar(main, partes, params) {
  if (!sesion.panel) return entrar(main);
  try { yo = await panel("/yo"); }
  catch (e) { if (e instanceof ErrorApi && e.estado === 401) { sesion.panel = null; return entrar(main); } throw e; }
  vigilarInactividad();
  iniciarAvisos();
  const seccion = SECCIONES[partes[0] || ""] ? partes[0] || "" : "";
  const [, cargar, permiso] = SECCIONES[seccion];
  if (!puede(permiso)) { toast("No tienes permiso para esa sección.", "error"); location.hash = "#/admin"; return; }
  const contenido = h("div", cargando());
  // En el móvil el menú se desliza de lado: al cambiar de sección se queda donde estaba.
  const antes = main.querySelector(".panel-lateral")?.scrollLeft || 0;
  const menu = lateral(seccion);
  vaciar(main, h("div.panel", menu, h("div", barra(), contenido)));
  menu.scrollLeft = antes;
  pintarContadores();
  const activo = menu.querySelector('[aria-current="page"]');
  if (activo && menu.scrollWidth > menu.clientWidth) {
    const izq = activo.offsetLeft - menu.offsetLeft, der = izq + activo.offsetWidth;
    if (izq < menu.scrollLeft) menu.scrollLeft = izq - 12;
    else if (der > menu.scrollLeft + menu.clientWidth) menu.scrollLeft = der - menu.clientWidth + 12;
  }
  const modulo = await cargar();
  await modulo.mostrar(contenido, partes.slice(1), params);
}

export function puede(permiso) {
  if (!permiso) return true;
  if (permiso === "admin") return yo?.rol === "admin";
  return !!yo?.permisos?.[permiso];
}

function lateral(actual) {
  return h("nav.panel-lateral", { "aria-label": "Panel" },
    h("div.fila", { estilo: { padding: "4px 12px 8px" } }, h("strong", yo.usuario), h("span.insignia" + (yo.rol === "admin" ? ".rojo" : ".azul"), yo.en_prueba ? "moderador · prueba" : yo.rol)),
    GRUPOS.map(([titulo, claves]) => [h("div.grupo", titulo), claves.filter((k) => puede(SECCIONES[k][2])).map((k) =>
      h("a", { href: `#/admin/${k}`, "aria-current": k === actual ? "page" : null }, SECCIONES[k][0],
        k === "servidor" && yo.alertas ? h("span.contador.rojo", String(yo.alertas)) : null))]),
    h("div.grupo", "Sesión"),
    h("a", { href: "#/", onclick: () => {} }, "Ver la web pública"),
    h("a", { href: "#/admin", onclick: (e) => { e.preventDefault(); salir(); } }, "Cerrar sesión"),
    h("p.tenue.mini", { estilo: { padding: "8px 12px" } }, `CODICE ${yo.version}`));
}

function barra() {
  const q = h("input", { type: "search", placeholder: "Buscar número, tarjeta, código de caso, texto o usuario…", "aria-label": "Buscador global" });
  const res = h("div.resultados-globales", { hidden: true });
  let t;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      if (q.value.trim().length < 2) { res.hidden = true; return; }
      const r = (await panel("/buscar?q=" + encodeURIComponent(q.value))).resultados;
      vaciar(res, r.length ? h("ul.lista-limpia", r.map((x) => h("li", h("a.elemento", { href: enlace(x), onclick: () => { res.hidden = true; } },
        h("span.insignia", { estilo: { minWidth: "84px", justifyContent: "center" } }, x.clase), h("span.crece", h("span.titulo", x.titulo), h("span.meta", x.detalle)))))) : h("p.vacio", "Sin resultados."));
      res.hidden = false;
    }, 300);
  });
  q.addEventListener("keydown", (e) => { if (e.key === "Escape") res.hidden = true; });
  document.addEventListener("click", (e) => { if (!res.contains(e.target) && e.target !== q) res.hidden = true; });
  return h("div.panel-barra", h("div.buscar-global", q, res), botonAjustes());
}

function enlace(x) {
  return { reporte: `#/admin/cola/${x.id}`, campana: `#/admin/campanas/${x.id}`, ticket: `#/admin/tickets/${x.id}`, usuario: `#/admin/usuarios/${x.id}`,
    indicador: `#/admin/investigacion?indicador=${encodeURIComponent(`${x.tipo}:${x.valor}`)}` }[x.clase] || "#/admin";
}

async function salir() {
  detenerAvisos();
  try { await panel("/salir", { metodo: "POST" }); } catch { /* */ }
  sesion.panel = null; yo = null; location.hash = "#/";
}

function vigilarInactividad() {
  const reiniciar = () => {
    clearTimeout(inactividad);
    inactividad = setTimeout(() => { if (sesion.panel && location.hash.startsWith("#/admin")) { sesion.panel = null; toast("Sesión cerrada por inactividad.", "info", 8000); location.reload(); } }, (yo.inactividad_min || 30) * 60000);
  };
  if (!window.__codiceVigilando) {
    ["click", "keydown", "pointermove", "touchstart"].forEach((ev) => document.addEventListener(ev, reiniciar, { passive: true }));
    window.__codiceVigilando = true;
  }
  reiniciar();
}

function entrar(main) {
  const caja = h("div.tarjeta", { estilo: { maxWidth: "460px", margin: "24px auto" } });
  const u = h("input", { type: "text", name: "usuario", autocomplete: "username", autocapitalize: "none" });
  const c = h("input", { type: "password", name: "clave", autocomplete: "current-password" });
  vaciar(caja, h("div.fila", h("img", { src: "img/logo.svg", alt: "", width: 40, height: 40 }), h("h1", { estilo: { margin: 0 } }, "Panel de CODICE")),
    h("p.suave", "Solo para el equipo de moderación. Necesitas tu usuario, tu contraseña y la app de doble verificación del móvil."),
    h("form", { onsubmit: async (e) => {
      e.preventDefault();
      try { segundoPaso(main, caja, await pedir("/api/panel/entrar", { metodo: "POST", datos: { usuario: u.value.trim().toLowerCase(), clave: c.value } })); }
      catch (err) { toast(err.message, "error"); }
    } }, campo("Usuario", u), campo("Contraseña", c), h("button.boton.primario.ancho", { type: "submit" }, "Continuar")));
  vaciar(main, caja);
  u.focus();
}

function segundoPaso(main, caja, r) {
  const cod = h("input", { type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: 6, pattern: "[0-9]*", name: "codigo", estilo: { fontSize: "1.6rem", letterSpacing: ".3em", textAlign: "center" } });
  const enviar = async (e) => {
    e.preventDefault();
    try {
      const x = await pedir("/api/panel/2fa", { metodo: "POST", datos: { token: r.token, codigo: cod.value } });
      sesion.panel = x.token; toast("Bienvenido al panel.", "ok"); mostrar(main, [], new URLSearchParams());
    } catch (err) { toast(err.message, "error"); cod.select(); if (err.estado === 401 || err.estado === 429) entrar(main); }
  };
  if (r.paso === "configurar") {
    vaciar(caja, h("h1", "Configura la doble verificación"),
      h("ol.pila", { estilo: { paddingLeft: "20px" } },
        h("li", "Instala en tu móvil una app gratuita de códigos: ", h("strong", "Aegis"), " (Android), ", h("strong", "Google Authenticator"), " o ", h("strong", "FreeOTP"), "."),
        h("li", "En la app pulsa «+» → «Escanear código QR» y apunta a este código:", h("div.centro", { estilo: { margin: "12px 0" } }, h("img", { src: r.qr, alt: "Código QR para la app de doble verificación", width: 220, height: 220, estilo: { background: "#fff", padding: "8px", borderRadius: "12px" } }))),
        h("li", "¿No puedes escanear? Elige «Introducir clave» y escribe esta clave:", h("div.codigo-privado", { estilo: { marginTop: "8px" } }, r.secreto.match(/.{1,4}/g).join(" ")),
          h("button.boton.chico", { type: "button", onclick: () => copiar(r.secreto) }, "Copiar clave")),
        h("li", "Escribe aquí los 6 números que muestra la app:")),
      h("form", { onsubmit: enviar }, campo("Código de 6 números", cod), h("button.boton.primario.ancho", { type: "submit" }, "Activar y entrar")),
      h("p.tenue", "Tienes 10 minutos. Si cambias de móvil, el admin puede reiniciar tu doble verificación."));
  } else {
    vaciar(caja, h("h1", "Código de verificación"), h("p.suave", "Abre la app de doble verificación de tu móvil y escribe el código de CODICE."),
      h("form", { onsubmit: enviar }, campo("Código de 6 números", cod), h("button.boton.primario.ancho", { type: "submit" }, "Entrar")));
  }
  cod.focus();
}

// Utilidad compartida por las secciones: acción con «Deshacer».
export function conDeshacer(texto, idDeshacer, alDeshacer) {
  const ids = Array.isArray(idDeshacer) ? idDeshacer : [idDeshacer];
  toast(texto, "ok", 10000, { texto: "Deshacer", fn: async () => {
    try { for (const id of ids) await panel(`/deshacer/${id}`, { metodo: "POST" }); toast("Acción deshecha.", "ok"); alDeshacer?.(); }
    catch (e) { toast(e.message, "error"); }
  } });
}

export function pedirCodigo2fa(titulo = "Confirma con tu código") {
  return new Promise((resolver) => {
    const cod = h("input", { type: "text", inputmode: "numeric", maxlength: 6, autocomplete: "one-time-code" });
    import("../ui.js").then(({ dialogo }) => dialogo(titulo, h("div", h("p.suave", "Esta acción borra datos o toca el servidor. Escribe el código actual de tu app de doble verificación."), campo("Código", cod)),
      { acciones: [{ texto: "Cancelar", valor: null, clase: "fantasma" }, { texto: "Confirmar", valor: "ok", clase: "peligro" }] }).then((v) => resolver(v ? cod.value : null)));
  });
}

export { icono };
