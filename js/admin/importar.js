// importar casos de fuentes publicas (solo yo, el admin). Entran como pendientes en «Reportes» y los reviso a mano
import { panel, ErrorApi } from "../api.js";
import { h, vaciar, toast, campo, insignia, fecha, vacio } from "../ui.js";

const EJEMPLO = {
  casos: [{
    fecha_incidente: "2026-08-29",
    fecha_precision: "semana",
    provincia: "Mayabeque",
    municipio: "San José de las Lajas",
    canal: "clasificados",
    tipo: "robo_cuenta",
    entidad_suplantada: "Vendedor de gas a domicilio",
    titulo: "Venta falsa de gas para robar cuentas de WhatsApp",
    descripcion: "Caso tomado de una denuncia pública. Cuenta aquí qué pasó, sin nombres de víctimas.",
    fuente: "https://ejemplo.org/noticia-del-caso",
    indicadores: [{ tipo: "telefono", valor: "52088407" }, { tipo: "otro", valor: "Claudia Martin" }],
  }],
};

function dominio(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u || "—"; } }

function descargarPlantilla() {
  const blob = new Blob([JSON.stringify(EJEMPLO, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { download: "plantilla-importar-codice.json" });
  a.setAttribute("href", url);
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function mostrar(caja) {
  const archivo = h("input", { type: "file", accept: ".json,application/json" });
  const vista = h("div.pila");
  let datos = null;

  const pintarErrores = (lista) => h("section.tarjeta.resultado.riesgo-alto", h("h2", "No se importó nada"),
    h("p.suave", "Corrige estos casos en el archivo y vuelve a subirlo:"),
    h("ul", lista.map((e) => h("li", h("strong", `Caso ${e.caso}: `), Object.entries(e.errores).map(([k, v]) => `${k} → ${v}`).join(" · ")))));

  const importar = async (boton) => {
    boton.disabled = true;
    try {
      const r = await panel("/importar", { metodo: "POST", datos });
      toast(`${r.creados.length} casos importados como pendientes.`, "ok");
      vaciar(vista, h("section.tarjeta", h("h2", "Importación terminada"),
        r.creados.length ? h("div.pila", h("p", `Entraron ${r.creados.length} casos en «Reportes → Pendientes»:`),
          h("ul.lista-limpia", r.creados.map((x) => h("li.elemento", h("a", { href: `#/admin/cola/${x.id}` }, x.codigo), h("span.tenue", ` · caso ${x.caso} del archivo`))))) : null,
        r.saltados.length ? h("div.pila", h("p", `${r.saltados.length} casos no se repitieron porque su fuente ya estaba importada:`),
          h("ul.lista-limpia", r.saltados.map((x) => h("li.elemento", h("span", `Caso ${x.caso} → ya existe como `), h("a", { href: `#/admin/cola` }, x.codigo))))) : null,
        h("div", h("a.boton.primario", { href: "#/admin/cola" }, "Ir a revisarlos"))));
      archivo.value = ""; datos = null;
    } catch (e) {
      if (e instanceof ErrorApi && Array.isArray(e.campos?.casos)) { vista.prepend(pintarErrores(e.campos.casos)); toast(e.message, "error", 8000); }
      else toast(e.message, "error");
      boton.disabled = false;
    }
  };

  archivo.addEventListener("change", async () => {
    vaciar(vista);
    datos = null;
    const f = archivo.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast("El archivo es demasiado grande (máximo 2 MB).", "error"); return; }
    try { datos = JSON.parse(await f.text()); }
    catch { toast("El archivo no es un JSON válido.", "error"); return; }
    if (!datos || !Array.isArray(datos.casos) || !datos.casos.length) { datos = null; toast("El archivo no tiene una lista «casos».", "error"); return; }
    const boton = h("button.boton.primario", { type: "button" }, `Importar ${datos.casos.length} casos`);
    boton.addEventListener("click", () => importar(boton));
    vaciar(vista, h("section.tarjeta", h("h2", `Vista previa · ${datos.casos.length} casos`),
      h("div", { estilo: { overflowX: "auto" } }, h("table.tabla",
        h("thead", h("tr", h("th", "#"), h("th", "Fecha"), h("th", "Lugar"), h("th", "Tipo"), h("th", "Datos"), h("th", "Fuente"))),
        h("tbody", datos.casos.map((c, i) => h("tr",
          h("td", String(i + 1)), h("td", fecha(c?.fecha_incidente)),
          h("td", [c?.municipio, c?.provincia].filter(Boolean).join(", ") || "Sin especificar"),
          h("td", c?.tipo || "—"), h("td", String((c?.indicadores || []).length)),
          h("td", dominio(c?.fuente))))))),
      h("p.tenue", "Nada se publica solo: entran como pendientes y los revisas en «Reportes»."),
      h("div.fila", boton)));
  });

  vaciar(caja, h("div.cabecera-pagina", h("div", h("h1", "Importar casos"), h("p", "Casos tomados de fuentes públicas (noticias, alertas, grupos). Solo el admin."))),
    h("div.portada",
      h("div.pila",
        h("section.tarjeta", h("h2", "1 · Elige el archivo"),
          campo("Archivo .json con los casos", archivo, { ayuda: "Si algún caso tiene errores no se importa ninguno, y te decimos qué corregir." })),
        vista),
      h("aside.pila", h("section.tarjeta", h("h2", "Cómo funciona"),
        h("ul",
          h("li", "Cada caso necesita fecha, tipo, canal, descripción y el ", h("strong", "enlace de la fuente"), "."),
          h("li", "Provincia y municipio son opcionales: si la fuente no los dice, déjalos vacíos y saldrá «Sin especificar»."),
          h("li", "Los nombres de perfil con espacios (p. ej. «Claudia Martin») van con el tipo ", h("code", "otro"), "."),
          h("li", "Si subes dos veces el mismo caso (misma fuente), no se duplica.")),
        h("button.boton", { type: "button", onclick: descargarPlantilla }, "Descargar plantilla de ejemplo")),
        insignia("Fuente pública", "azul"), h("p.tenue.mini", "Así se marcan en la cola los casos importados."))));
  if (!vista.childNodes.length) vista.append(vacio("Todavía no has elegido archivo."));
}
