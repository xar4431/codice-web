// aqui es donde se habla con faro (la API) por el tunel cifrado
const CFG = window.CODICE_CONFIG || {};
export const API = (CFG.api || "").replace(/\/+$/, "");

export class ErrorApi extends Error {
  constructor(mensaje, estado, campos) { super(mensaje); this.estado = estado; this.campos = campos || {}; }
}
export class SinConexion extends ErrorApi {
  constructor() { super("No hay conexión con el servidor de CODICE ahora mismo. Inténtalo de nuevo en unos minutos.", 0); }
}

function leer(almacen, clave) { try { return almacen.getItem(clave); } catch { return null; } }
function guardar(almacen, clave, v) { try { v ? almacen.setItem(clave, v) : almacen.removeItem(clave); } catch { /* sin almacenamiento, sigue */ } }

export const sesion = {
  get usuario() { return leer(localStorage, "codice.token"); },
  set usuario(v) { guardar(localStorage, "codice.token", v); },
  get panel() { return leer(sessionStorage, "codice.panel"); },
  set panel(v) { guardar(sessionStorage, "codice.panel", v); },
};

async function procesar(r) {
  let datos = null;
  const tipo = r.headers.get("Content-Type") || "";
  if (tipo.includes("application/json")) datos = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && datos?.error?.includes("panel")) window.dispatchEvent(new CustomEvent("codice:panel-caducado"));
    throw new ErrorApi(datos?.error || `Error ${r.status}`, r.status, datos?.campos);
  }
  return datos ?? r;
}

export async function pedir(ruta, { metodo = "GET", datos, panel = false, crudo = false, senal } = {}) {
  const cab = {};
  const tok = panel ? sesion.panel : sesion.usuario;
  if (tok) cab.Authorization = `Bearer ${tok}`;
  let cuerpo;
  if (datos instanceof FormData) cuerpo = datos;
  else if (datos !== undefined) { cab["Content-Type"] = "application/json"; cuerpo = JSON.stringify(datos); }
  let r;
  try {
    r = await fetch(API + ruta, { method: metodo, headers: cab, body: cuerpo, credentials: "omit", mode: "cors", cache: "no-store", signal: senal });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new SinConexion();
  }
  if (crudo) { if (!r.ok) await procesar(r); return r; }
  return procesar(r);
}

export const panel = (ruta, opciones = {}) => pedir("/api/panel" + ruta, { ...opciones, panel: true });

// envio con barra de progreso (pa' cuando suben pruebas)
export function subir(ruta, formData, alProgreso, { panel: esPanel = false } = {}) {
  return new Promise((resolver, rechazar) => {
    const x = new XMLHttpRequest();
    x.open("POST", API + ruta);
    const tok = esPanel ? sesion.panel : sesion.usuario;
    if (tok) x.setRequestHeader("Authorization", `Bearer ${tok}`);
    x.upload.onprogress = (e) => { if (e.lengthComputable) alProgreso?.(e.loaded / e.total); };
    x.onload = () => {
      let d = null;
      try { d = JSON.parse(x.responseText); } catch { /* la respuesta no vino en JSON */ }
      if (x.status >= 200 && x.status < 300) resolver(d);
      else rechazar(new ErrorApi(d?.error || `Error ${x.status}`, x.status, d?.campos));
    };
    x.onerror = () => rechazar(new SinConexion());
    x.send(formData);
  });
}

// pa' bajar los archivos protegidos (expedientes, originales) con el token del panel
export async function descargar(ruta, nombre) {
  const r = await pedir(ruta, { panel: true, crudo: true });
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre || "descarga"; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function blobUrl(ruta) {
  const r = await pedir(ruta, { panel: true, crudo: true });
  return URL.createObjectURL(await r.blob());
}

export const urlApi = (ruta) => (ruta?.startsWith("/api/") ? API + ruta : ruta);

let catalogos = null;
export async function obtenerCatalogos() {
  if (catalogos) return catalogos;
  try { catalogos = await (await fetch("data/catalogos.json", { cache: "force-cache" })).json(); }
  catch { catalogos = await pedir("/api/catalogos"); }
  return catalogos;
}
