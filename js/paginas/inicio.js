import { pedir, SinConexion, urlApi } from "../api.js";
import { analizar } from "../analizar.js";
import { buscarEnCopia, campanasEnCopia } from "../copia.js";
import { h, vaciar, icono, insignia, fecha, quedan, RIESGOS, cargando } from "../ui.js";

export async function mostrar(main) {
  const resultado = h("div", { "aria-live": "polite" });
  const entrada = h("input", { type: "search", name: "q", placeholder: "+53 5••• ••••, enlace, @perfil o tarjeta", autocomplete: "off", enterkeyhint: "search", "aria-label": "Dato a comprobar" });
  const form = h("form.buscador", { role: "search", onsubmit: (e) => { e.preventDefault(); buscar(entrada.value, resultado); } },
    entrada, h("button.boton.primario", { type: "submit" }, icono("buscar"), "Comprobar"));
  const texto = h("textarea", { placeholder: "Pega aquí el mensaje que recibiste (SMS, WhatsApp, Telegram…)", "aria-label": "Mensaje recibido", maxlength: 8000 });
  const resAnalisis = h("div", { "aria-live": "polite" });
  const avisos = h("section", { hidden: true, "aria-labelledby": "t-avisos" });
  const alertas = h("div", cargando("Cargando alertas…"));
  const lateral = h("div.pila");
  const cifrasBanner = h("div.banner-cifras", { "aria-live": "polite" });
  vaciar(main,
    banner(entrada, cifrasBanner),
    avisos,
    h("div.portada",
      h("section.pila.heroe",
        h("div", h("h1", "¿Es estafa?"), h("p.lema", "Pega el número, enlace, perfil o tarjeta que te escribió. Te decimos si ya está reportado y en qué campaña.")),
        form, resultado,
        h("div.aviso-seguro", icono("escudo"), h("span", "CODICE nunca te pedirá dinero, contraseñas ni códigos de verificación. Si alguien lo hace en nuestro nombre, es estafa.")),
        h("section.tarjeta",
          h("h2", "Analizar un mensaje"),
          h("p.suave", "Te señalamos las trampas típicas. El texto no sale de tu teléfono."),
          texto, h("div.fila", { estilo: { marginTop: "10px" } }, h("button.boton", { type: "button", onclick: () => pintarAnalisis(texto.value, resAnalisis, entrada, resultado) }, "Analizar")),
          resAnalisis)),
      h("aside.pila", h("section.tarjeta", h("h2", "Alertas activas"), alertas), lateral)));
  entrada.focus();
  const q = new URLSearchParams(location.hash.split("?")[1] || "").get("q");
  if (q) { entrada.value = q; buscar(q, resultado); }
  try {
    const d = await pedir("/api/inicio");
    pintarAvisos(avisos, d.avisos);
    pintarCifrasBanner(cifrasBanner, d.totales);
    pintarAlertas(alertas, d.alertas);
    vaciar(lateral,
      h("div.cifras", cifra(d.totales.casos, "casos publicados"), cifra(d.totales.campanas, "campañas"), cifra(d.totales.indicadores, "indicadores")),
      d.recientes.length ? h("section.tarjeta", h("h2", "Casos recientes"), h("ul.lista-limpia", d.recientes.map((c) =>
        h("li", h("a.elemento", { href: `#/caso/${c.codigo}` }, h("span.crece", h("span.titulo", c.titulo), h("span.meta", `${c.provincia} · ${fecha(c.fecha)}`)), icono("flecha")))))) : null,
      h("section.tarjeta", h("h2", "¿Te estafaron o lo intentaron?"), h("p.suave", "Tu reporte ayuda a que otros no caigan. Puedes hacerlo sin cuenta y de forma anónima."),
        h("a.boton.primario.ancho", { href: "#/reportar" }, "Reportar una estafa")));
  } catch (e) {
    if (!(e instanceof SinConexion)) throw e;
    try {
      const camp = await campanasEnCopia();
      pintarAlertas(alertas, camp.filter((c) => c.veredicto === "confirmada").slice(0, 6));
    } catch { vaciar(alertas, h("p.tenue", "No disponible ahora.")); }
    const { aviso } = await import("../mantenimiento.js" + ((window.CODICE_CONFIG || {}).edicion ? "?e=" + window.CODICE_CONFIG.edicion : ""));
    vaciar(lateral, aviso("El buscador sigue funcionando con la última copia publicada. Reportar y ver casos volverá en cuanto termine."));
  }
}

// banner de la portada: faro animado, la palabra que cambia y los numeros que suben al cargar
function banner(entrada, cifras) {
  const palabras = ["número", "enlace", "perfil", "tarjeta"];
  return h("section.banner", { "aria-label": "Presentación de CODICE" },
    h("div.banner-faro", { "aria-hidden": "true" }, h("img", { src: "img/banner-faro.svg", alt: "", width: 1000, height: 340, decoding: "async" })),
    h("div.banner-texto",
      h("p.banner-antetitulo", "Contra las estafas digitales en Cuba"),
      h("p.banner-titulo", "Comprueba el ",
        h("span.oculto-visual", "número, enlace, perfil o tarjeta"),
        h("span.banner-rotor", { "aria-hidden": "true" }, h("span.banner-palabras", [...palabras, palabras[0]].map((p) => h("span", p)))),
        h("br"), "antes de pagar"),
      h("p.banner-lema", "Mira si ya fue reportado como estafa. Si te pasó a ti, repórtalo de forma anónima y evita que otros caigan."),
      h("div.banner-botones",
        h("button.boton.primario", { type: "button", onclick: () => { entrada.scrollIntoView({ behavior: "smooth", block: "center" }); entrada.focus({ preventScroll: true }); } }, icono("buscar"), "Comprobar ahora"),
        h("a.boton.banner-secundario", { href: "#/reportar" }, "Reportar estafa")),
      cifras));
}

function pintarCifrasBanner(caja, t) {
  const datos = [[t.casos, "casos publicados"], [t.campanas, "campañas"], [t.indicadores, "indicadores"]];
  vaciar(caja, datos.map(([n, texto]) => { const b = h("b", "0"); contar(b, n || 0); return h("span", b, " ", texto); }));
}

function contar(el, fin) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || fin < 5) { el.textContent = String(fin); return; }
  const inicio = performance.now(), dura = 1400;
  const paso = (ahora) => {
    const x = Math.min(1, (ahora - inicio) / dura), suave = 1 - Math.pow(1 - x, 3);
    el.textContent = Math.round(fin * suave).toLocaleString("es");
    if (x < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function cifra(n, t) { return h("div.cifra", h("b", String(n ?? 0)), h("span", t)); }

function pintarAlertas(caja, lista) {
  if (!lista.length) { vaciar(caja, h("p.tenue", "No hay alertas activas ahora mismo.")); return; }
  vaciar(caja, h("ul.lista-limpia", lista.map((a) => h("li", h("a.elemento", { href: `#/campana/${a.slug}` },
    h("span.punto." + (a.veredicto === "confirmada" ? "rojo" : "ambar")),
    h("span.crece", h("span.titulo", a.nombre), h("span.meta", `${a.veredicto_nombre}${a.casos ? ` · ${a.casos} casos` : ""}`)), icono("flecha"))))));
}

export function tarjetaAviso(a) {
  const media = a.media ? h("div.media") : null;
  if (media) {
    if (a.media_mime === "video/mp4") {
      const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const v = h("video", { src: urlApi(a.media), poster: a.poster ? urlApi(a.poster) : null, muted: true, loop: true, playsinline: true, autoplay: !reducir, preload: "metadata", "aria-label": a.titulo || "Animación del aviso" });
      v.muted = true;
      media.append(v);
      if (reducir) {
        const b = h("button.reproducir", { type: "button", "aria-label": "Reproducir animación", onclick: () => { v.play(); b.remove(); } }, "▶");
        media.append(b);
      }
    } else if (a.media_mime === "image/gif" && a.poster && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const img = h("img", { src: urlApi(a.poster), alt: a.titulo || "Imagen del aviso", loading: "lazy" });
      media.append(img, h("button.reproducir", { type: "button", "aria-label": "Reproducir", onclick: (e) => { img.src = urlApi(a.media); e.currentTarget.remove(); } }, "▶"));
    } else media.append(h("img", { src: urlApi(a.media), alt: a.titulo || "Imagen del aviso", loading: "lazy" }));
  }
  return h("article.aviso-noticia." + a.tipo, media,
    h("div.cuerpo",
      h("div.fila", { estilo: { justifyContent: "space-between" } }, h("span.etiqueta", a.tipo === "alerta" ? "Alerta de campaña" : "Actualización"),
        a.expira ? h("span.tenue.mini", quedan(a.expira)) : null),
      a.titulo ? h("h3", { estilo: { marginTop: "6px" } }, a.titulo) : null,
      a.subtitulo ? h("p.suave", a.subtitulo) : null,
      a.fecha ? h("p.tenue", fecha(a.fecha)) : null,
      a.texto ? h("p", a.texto) : null,
      h("div.fila",
        a.campana ? h("a.boton.chico", { href: `#/campana/${a.campana.slug}` }, "Ver campaña") : null,
        a.enlace ? h("a.boton.chico.primario", { href: a.enlace, rel: "noopener noreferrer nofollow", target: "_blank", onclick: (e) => {
          if (!confirm(`Vas a salir de CODICE hacia:\n${a.enlace}\n\n¿Continuar?`)) e.preventDefault();
        } }, a.enlace_texto || "Abrir enlace") : null)));
}

function pintarAvisos(seccion, avisos) {
  if (!avisos?.length) { seccion.hidden = true; return; }
  seccion.hidden = false;
  vaciar(seccion, h("h2", { id: "t-avisos" }, "Avisos de CODICE"), h("div.avisos", avisos.map(tarjetaAviso)));
}

async function buscar(q, caja) {
  if (!q.trim()) return;
  vaciar(caja, cargando("Comprobando…"));
  let datos, deCopia = false;
  try { datos = await pedir("/api/buscar?q=" + encodeURIComponent(q)); }
  catch (e) {
    if (e instanceof SinConexion) {
      try { datos = await buscarEnCopia(q); deCopia = true; }
      catch { vaciar(caja, h("div.aviso.error", e.message)); return; }
    } else { vaciar(caja, h("div.aviso.error", { role: "alert" }, e.message)); return; }
  }
  if (datos.oficial) {
    vaciar(caja, h("div.resultado.riesgo-" + (datos.oficial.tipo === "oficial" ? "sin_datos" : "alto"),
      h("h3", icono(datos.oficial.tipo === "oficial" ? "ok" : "alerta"), datos.oficial.mensaje)));
    return;
  }
  const res = datos.resultados || [];
  const conReportes = res.filter((r) => r.reportes > 0);
  if (!conReportes.length) {
    vaciar(caja, h("div.resultado.riesgo-sin_datos",
      h("h3", icono("ok"), "No hay reportes publicados con este dato"),
      h("p", "Eso no garantiza que sea seguro: puede ser una estafa nueva. Si te piden pagar por adelantado, un código o tu contraseña, desconfía."),
      h("div.fila", h("a.boton.chico", { href: "#/reportar" }, "Reportarlo"), h("a.boton.chico.fantasma", { href: "#/guia" }, "Señales de estafa")),
      deCopia ? h("p.tenue", `Consulta hecha con la copia publicada el ${fecha(datos.generado)} (el servidor no responde).`) : null));
    return;
  }
  vaciar(caja, conReportes.map((r) => h("div.resultado.riesgo-" + r.riesgo,
    h("h3", icono("alerta"), r.riesgo === "alto" ? "¡Cuidado! Está reportado como estafa" : "Este dato aparece en reportes de estafa"),
    h("p", h("span.indicador", r.valor), " ", insignia(RIESGOS[r.riesgo], "riesgo-" + r.riesgo)),
    h("p", `${r.reportes} ${r.reportes === 1 ? "reporte publicado" : "reportes publicados"}`, r.primera ? ` · desde ${fecha(r.primera)}` : "", r.ultima && r.ultima !== r.primera ? ` · último ${fecha(r.ultima)}` : ""),
    r.campanas?.length ? h("p", "Campaña: ", r.campanas.map((k, i) => [i ? ", " : "", h("a", { href: `#/campana/${k.slug}` }, k.nombre), " ", insignia(k.veredicto_nombre, "ver-" + k.veredicto)])) : null,
    r.casos?.length ? h("p.tenue", "Casos: ", r.casos.map((c, i) => [i ? " · " : "", h("a", { href: `#/caso/${c}` }, c)])) : null,
    h("div.fila", h("a.boton.chico.primario", { href: "#/reportar" }, "Me pasó a mí también"), h("a.boton.chico.fantasma", { href: "#/guia" }, "Qué hacer ahora")),
    deCopia ? h("p.tenue", `Consulta hecha con la copia publicada el ${fecha(datos.generado)}.`) : null)));
}

function pintarAnalisis(texto, caja, entrada, resultado) {
  if (!texto.trim()) { vaciar(caja); return; }
  const a = analizar(texto);
  const titulo = { alto: "Tiene muchas señales de estafa", medio: "Tiene señales sospechosas", bajo: "No vemos señales típicas" }[a.nivel];
  vaciar(caja, h("div.resultado.riesgo-" + (a.nivel === "bajo" ? "sin_datos" : a.nivel === "alto" ? "alto" : "medio"),
    h("h3", icono(a.nivel === "bajo" ? "ok" : "alerta"), titulo),
    a.senales.map((s) => h("div.senal" + (s.peso >= 3 ? ".alta" : ""), h("span", s.texto))),
    a.nivel === "bajo" ? h("p.suave", "Aun así, no pagues por adelantado ni compartas códigos.") : h("p", h("strong", "Consejo: "), "no pagues, no compartas códigos y no abras el enlace. Si ya pagaste, repórtalo."),
    a.indicadores.length ? h("div", h("p.suave", "Comprueba estos datos del mensaje:"), h("div.fila", a.indicadores.map((i) =>
      h("button.boton.chico", { type: "button", onclick: () => { entrada.value = i; buscar(i, resultado); entrada.scrollIntoView({ behavior: "smooth", block: "center" }); } }, i)))) : null));
}
