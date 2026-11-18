import { obtenerCatalogos, pedir, sesion, subir, SinConexion } from "../api.js";
import { h, vaciar, campo, seleccion, icono, toast, erroresEnFormulario, bytes, copiar } from "../ui.js";

const MAX_ARCHIVOS = 8, MAX_MB = 12, MAX_VIDEO_MB = 60, MAX_TOTAL_MB = 120;
const ACEPTA = "image/jpeg,image/png,image/webp,image/heic,application/pdf,video/mp4,video/quicktime,video/webm,video/3gpp,audio/ogg,audio/mp4,audio/mpeg,.heic,.m4a,.opus";

export async function mostrar(main, _p, params) {
  const cat = await obtenerCatalogos();
  const conCuenta = !!sesion.usuario;
  const casoPadre = params.get("caso");
  let paso = 0;
  const archivos = [];
  const indicadores = [];
  const form = h("form", { novalidate: true });
  const d0 = new Date();
  const hoy = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;

  // Paso 1 · Qué pasó
  const fechaInp = h("input", { type: "date", name: "fecha_incidente", max: hoy, value: hoy });
  const precision = seleccion("fecha_precision", cat.precisiones, "dia", { vacioTexto: null });
  const prov = seleccion("provincia", Object.fromEntries(cat.provincias.map((p) => [p.codigo, p.nombre])));
  const mun = h("select", { name: "municipio" }, h("option", { value: "" }, "Elige primero la provincia"));
  prov.addEventListener("change", () => {
    vaciar(mun, h("option", { value: "" }, "Elige el municipio"), cat.municipios.filter((m) => m.provincia === prov.value).map((m) => h("option", { value: m.codigo }, m.nombre)));
  });
  const canal = h("div.opciones", { role: "radiogroup", "aria-label": "Canal" }, Object.entries(cat.canales).map(([k, v]) =>
    h("label.opcion", h("input", { type: "radio", name: "canal", value: k }), h("span", v))));
  const tipo = seleccion("tipo", cat.tipos);
  const entidad = h("input", { type: "text", name: "entidad_suplantada", maxlength: 120, placeholder: "Ej.: ETECSA, Transfermóvil, un banco…" });
  const paso1 = h("fieldset.pila", { estilo: { border: 0, padding: 0, margin: 0 } }, h("legend.oculto-visual", "Qué pasó"),
    h("div.rejilla", campo("¿Cuándo ocurrió? (aproximado)", fechaInp), campo("Precisión de la fecha", precision)),
    h("div.rejilla", campo("Provincia", prov), campo("Municipio", mun, { ayuda: "Donde ocurrió o te afectó." })),
    h("div.campo", h("label", "¿Por dónde te contactaron?"), canal, h("div.error", { datos: { campo: "canal" } })),
    campo("Tipo de estafa", tipo), campo("¿A quién decían representar? (opcional)", entidad));

  // Paso 2 · Datos del estafador
  const listaInd = h("div.pila");
  const nuevoInd = () => {
    const fila = { tipo: "telefono", valor: "" };
    indicadores.push(fila);
    const t = seleccion("ind-tipo", cat.indicadores, "telefono", { vacioTexto: null });
    const v = h("input", { type: "text", placeholder: "Número, enlace, @perfil, tarjeta…", maxlength: 500, "aria-label": "Valor del indicador" });
    const aviso = h("div.ayuda");
    let espera;
    const comprobar = () => {
      clearTimeout(espera);
      espera = setTimeout(async () => {
        if (v.value.trim().length < 5) { aviso.textContent = ""; return; }
        try {
          const r = await pedir(`/api/coincidencias?tipo=${t.value}&valor=${encodeURIComponent(v.value)}`);
          aviso.textContent = r.reportes ? `⚠ Coincide con ${r.reportes} ${r.reportes === 1 ? "reporte publicado" : "reportes publicados"}.` : "";
        } catch { aviso.textContent = ""; }
      }, 500);
    };
    t.addEventListener("change", () => { fila.tipo = t.value; comprobar(); });
    v.addEventListener("input", () => { fila.valor = v.value; comprobar(); });
    const caja = h("div.tarjeta", { estilo: { padding: "12px" } }, h("div.rejilla", { estilo: { gridTemplateColumns: "minmax(140px, 1fr) minmax(180px, 2fr)" } }, t, v), aviso,
      h("button.boton.fantasma.chico", { type: "button", onclick: () => { indicadores.splice(indicadores.indexOf(fila), 1); caja.remove(); } }, "Quitar"));
    listaInd.append(caja);
    v.focus();
  };
  const paso2 = h("div.pila", h("p.suave", "Añade los datos que usó el estafador: su número, el enlace, su perfil o la tarjeta a la que pediste pagar. ",
    h("strong", "No pongas tus propios datos.")), listaInd,
    h("button.boton", { type: "button", onclick: nuevoInd }, "+ Añadir otro dato"), h("div.error", { datos: { campo: "indicadores" } }));

  // Paso 3 · Descripción y pruebas
  const desc = h("textarea", { name: "descripcion", maxlength: 5000, placeholder: "Cuenta qué te dijeron, qué te pidieron y qué pasó después. No incluyas tu nombre, tu número ni datos de otras personas." });
  const contador = h("div.ayuda", "0 / 5000");
  desc.addEventListener("input", () => { contador.textContent = `${desc.value.length} / 5000`; });
  const inpArch = h("input", { type: "file", multiple: true, accept: ACEPTA, hidden: true });
  const listaArch = h("div.archivos");
  const errArch = h("div.error", { datos: { campo: "archivos" } });
  const anadirArchivos = (lista) => {
    for (const f of lista) {
      const video = f.type.startsWith("video/");
      if (archivos.length >= MAX_ARCHIVOS) { errArch.textContent = `Máximo ${MAX_ARCHIVOS} archivos.`; break; }
      if (f.size > (video ? MAX_VIDEO_MB : MAX_MB) * 1048576) { errArch.textContent = `«${f.name}» supera ${video ? MAX_VIDEO_MB : MAX_MB} MB.`; continue; }
      if (archivos.reduce((s, x) => s + x.size, 0) + f.size > MAX_TOTAL_MB * 1048576) { errArch.textContent = `El total supera ${MAX_TOTAL_MB} MB.`; break; }
      archivos.push(f);
      const vista = f.type.startsWith("image/") && f.type !== "image/heic" ? h("img", { src: URL.createObjectURL(f), alt: "" }) : h("span", icono("subir"));
      const item = h("div.archivo", vista, h("span.crece", f.name), h("span.tenue", bytes(f.size)),
        h("button.boton.fantasma.chico", { type: "button", "aria-label": `Quitar ${f.name}`, onclick: () => { archivos.splice(archivos.indexOf(f), 1); item.remove(); } }, icono("x")));
      listaArch.append(item);
    }
  };
  inpArch.addEventListener("change", () => { errArch.textContent = ""; anadirArchivos(inpArch.files); inpArch.value = ""; });
  const zona = h("div.zona-subida", { tabindex: 0, role: "button", onclick: () => inpArch.click(), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inpArch.click(); } } },
    icono("subir", 28), h("p", h("strong", "Toca para añadir capturas, fotos, PDF, videos o notas de voz")),
    h("p.tenue", `Hasta ${MAX_ARCHIVOS} archivos · ${MAX_MB} MB por imagen/PDF/audio · ${MAX_VIDEO_MB} MB por video`));
  zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("encima"); anadirArchivos(e.dataTransfer.files); });
  const paso3 = h("div.pila", campo("Describe lo que pasó", desc), contador,
    h("div.campo", h("label", "Pruebas"), zona, inpArch, listaArch, errArch,
      h("p.ayuda", "Consejo: antes de subir una captura, tapa tu nombre y tu número con el editor de fotos del móvil. Moderación también revisa y tapa datos antes de publicar. ",
        h("a", { href: "#/guia", target: "_blank" }, "Ver cómo"))));

  // Paso 4 · Enviar
  const consentimiento = h("input", { type: "checkbox", name: "consentimiento" });
  const vincular = h("input", { type: "checkbox", checked: true });
  const captchaImg = h("img", { alt: "Código de seguridad: escribe los caracteres de la imagen", width: 220, height: 72 });
  const captchaInp = h("input", { type: "text", name: "captcha", autocomplete: "off", autocapitalize: "characters", maxlength: 8, inputmode: "text", estilo: { maxWidth: "160px" } });
  let captchaId = null;
  const nuevoCaptcha = async () => { try { const c = await pedir("/api/captcha"); captchaId = c.id; captchaImg.src = c.imagen; captchaInp.value = ""; } catch { /* sin conexión */ } };
  const trampa = h("div.trampa", { "aria-hidden": "true" }, h("label", "No rellenar", h("input", { type: "text", name: "sitio_web", tabindex: "-1", autocomplete: "off" })));
  const progreso = h("div.progreso", { hidden: true }, h("div"));
  const paso4 = h("div.pila",
    h("div.aviso", h("strong", "Tu reporte es anónimo: "), "en la web aparecerás siempre como «Anónimo». Nada se publica hasta que moderación lo revisa y tapa los datos personales."),
    conCuenta ? h("label.casilla", vincular, h("span", "Guardar este reporte en «Mi cuenta» (si lo desmarcas, solo podrás seguirlo con el código privado).")) : null,
    h("label.casilla", consentimiento, h("span", "Acepto que una versión revisada y anónima de mi reporte, con los datos personales tapados, se publique para alertar a otras personas.")),
    h("div.error", { datos: { campo: "consentimiento" } }),
    conCuenta ? null : h("div.campo", h("label", { for: "captcha-r" }, "Escribe los caracteres de la imagen"),
      h("div.captcha", captchaImg, captchaInp, h("button.boton.fantasma.chico", { type: "button", onclick: nuevoCaptcha }, "Otra imagen")),
      h("div.error", { datos: { campo: "captcha" } })),
    trampa, progreso);
  captchaInp.id = "captcha-r";

  const pasos = [["Qué pasó", paso1], ["Datos del estafador", paso2], ["Descripción y pruebas", paso3], ["Enviar", paso4]];
  const barra = h("ol.pasos", { "aria-hidden": "true" }, pasos.map(() => h("li")));
  const textoPaso = h("p.pasos-texto");
  const contenido = h("div");
  const atras = h("button.boton.fantasma", { type: "button", onclick: () => ir(paso - 1) }, "Atrás");
  const siguiente = h("button.boton.primario", { type: "submit" }, "Siguiente");
  const errorGeneral = h("div.aviso.error", { hidden: true, role: "alert" });
  form.append(barra, textoPaso, contenido, errorGeneral, h("div.fila.fin", { estilo: { marginTop: "18px" } }, atras, siguiente));

  const ir = (n) => {
    paso = Math.max(0, Math.min(pasos.length - 1, n));
    barra.querySelectorAll("li").forEach((li, i) => li.classList.toggle("hecho", i <= paso));
    textoPaso.textContent = `Paso ${paso + 1} de ${pasos.length} · ${pasos[paso][0]}`;
    vaciar(contenido, pasos[paso][1]);
    atras.hidden = paso === 0;
    siguiente.textContent = paso === pasos.length - 1 ? "Enviar reporte" : "Siguiente";
    if (paso === 1 && !indicadores.length) nuevoInd();
    if (paso === 3 && !conCuenta && !captchaId) nuevoCaptcha();
    errorGeneral.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validarPaso = () => {
    const err = {};
    if (paso === 0) {
      if (!fechaInp.value) err.fecha_incidente = "Indica una fecha aproximada.";
      if (!prov.value) err.provincia = "Elige una provincia.";
      if (!mun.value) err.municipio = "Elige un municipio.";
      if (!paso1.querySelector("input[name=canal]:checked")) err.canal = "Elige el canal.";
      if (!tipo.value) err.tipo = "Elige el tipo de estafa.";
    }
    if (paso === 2 && desc.value.trim().length < 20) err.descripcion = "Describe lo ocurrido con al menos 20 caracteres.";
    if (paso === 3 && !consentimiento.checked) err.consentimiento = "Debes aceptar para poder enviar.";
    erroresEnFormulario(form, err);
    return !Object.keys(err).length;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarPaso()) return;
    if (paso < pasos.length - 1) { ir(paso + 1); return; }
    const datos = {
      fecha_incidente: fechaInp.value, fecha_precision: precision.value, provincia: prov.value, municipio: mun.value,
      canal: paso1.querySelector("input[name=canal]:checked")?.value, tipo: tipo.value, entidad_suplantada: entidad.value,
      descripcion: desc.value, consentimiento: consentimiento.checked, vincular_cuenta: vincular.checked,
      indicadores: indicadores.filter((i) => i.valor.trim()), sitio_web: trampa.querySelector("input").value,
      captcha_id: captchaId, captcha: captchaInp.value, caso_padre: casoPadre,
    };
    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));
    archivos.forEach((f) => fd.append("archivos", f, f.name));
    siguiente.disabled = true; siguiente.setAttribute("aria-busy", "true"); siguiente.textContent = "Enviando…";
    progreso.hidden = false;
    try {
      const r = await subir("/api/reportes", fd, (p) => { progreso.firstChild.style.width = `${Math.round(p * 100)}%`; });
      terminado(main, r, conCuenta && vincular.checked);
    } catch (err) {
      progreso.hidden = true;
      errorGeneral.textContent = err instanceof SinConexion ? "No se pudo conectar con el servidor. Tu reporte NO se envió: inténtalo de nuevo en unos minutos." : err.message;
      errorGeneral.hidden = false;
      const campos = err.campos || {};
      if (campos.captcha) nuevoCaptcha();
      const vuelta = Object.keys(campos).some((k) => ["fecha_incidente", "provincia", "municipio", "canal", "tipo"].includes(k)) ? 0
        : Object.keys(campos).some((k) => k.startsWith("indicadores")) ? 1 : Object.keys(campos).some((k) => ["descripcion", "archivos"].includes(k)) ? 2 : 3;
      if (vuelta !== paso) { ir(vuelta); errorGeneral.hidden = false; errorGeneral.textContent = err.message; }
      erroresEnFormulario(form, campos);
    } finally { siguiente.disabled = false; siguiente.removeAttribute("aria-busy"); siguiente.textContent = paso === pasos.length - 1 ? "Enviar reporte" : "Siguiente"; }
  });

  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", casoPadre ? "Me pasó también" : "Reportar una estafa"),
    h("p", casoPadre ? `Tu reporte se sumará al caso ${casoPadre} cuando moderación lo revise.` : "Unos minutos que pueden evitar que otra persona caiga."))),
    document.body.dataset.proteccion && !conCuenta ? h("div.aviso.atencion", "Ahora mismo hay muchos reportes falsos y solo se puede reportar con cuenta. ", h("a", { href: "#/cuenta" }, "Crea una en un minuto"), " (solo pide usuario y contraseña).") : null,
    h("div.tarjeta", { estilo: { maxWidth: "760px" } }, form));
  ir(0);
}

function terminado(main, r, enCuenta) {
  vaciar(main, h("div.tarjeta", { estilo: { maxWidth: "640px", margin: "0 auto" } },
    h("h1", "¡Gracias! Reporte enviado"),
    h("p", "Moderación lo revisará pronto. Mientras tanto no se publica nada."),
    h("p", "Código del caso: ", h("strong.mono", r.codigo)),
    h("h2", { estilo: { marginTop: "18px" } }, "Tu código privado de seguimiento"),
    h("div.codigo-privado", r.seguimiento),
    h("p.aviso.atencion", { estilo: { marginTop: "10px" } }, enCuenta ? "También lo verás en «Mi cuenta». Guarda este código por si pierdes el acceso." :
      "Guárdalo ahora (haz una captura o cópialo). Es la única forma de ver el estado de tu reporte, responder a moderación o añadir pruebas. No se puede recuperar."),
    h("div.fila", h("button.boton", { type: "button", onclick: () => copiar(r.seguimiento) }, "Copiar código"),
      h("a.boton.primario", { href: "#/seguimiento" }, "Ir a seguimiento"), h("a.boton.fantasma", { href: "#/" }, "Volver al inicio"))));
  toast("Reporte enviado correctamente.", "ok");
}
