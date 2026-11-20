import { h, vaciar, insignia } from "../ui.js";

const S = (titulo, ...cuerpo) => h("section.tarjeta", h("h2", titulo), ...cuerpo);
// Imagen de la guía: capturas reales de CODICE o ejemplos recreados de estafas reales (con datos ficticios).
// Si hay versión vertical («movil»), el móvil la usa para que el texto se lea grande.
const F = (archivo, ancho, alto, alt, pie, movil) => {
  const img = h("img", { src: `img/guia/${archivo}.webp`, width: ancho, height: alto, alt, loading: "lazy", decoding: "async" });
  const foto = movil ? h("picture", h("source", { media: "(max-width: 600px)", srcset: `img/guia/${archivo}-movil.webp`, width: movil[0], height: movil[1] }), img) : img;
  return h("figure.guia-figura", foto, pie ? h("figcaption", pie) : null);
};

export function mostrar(main) {
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Guía de CODICE"), h("p", "Cómo usar la web, cómo reportar y qué significan los colores."))),
    h("div.pila", { estilo: { maxWidth: "820px" } },
      S("Antes de pagar, compruébalo",
        h("p", "En ", h("a", { href: "#/" }, "¿Es estafa?"), " escribe el número, enlace, perfil o tarjeta que te pide el dinero y pulsa ", h("strong", "Comprobar"), ". Si ya está reportado, lo verás en rojo con los casos publicados."),
        h("div.guia-figuras.una", F("buscar", 640, 1063, "Captura de CODICE: al comprobar un número reportado aparece «¡Cuidado! Está reportado como estafa», riesgo alto y los casos.", "Así se ve un número reportado (captura real de CODICE con un número de prueba)."))),
      S("Señales de estafa más comunes", h("ul",
        h("li", "Te piden pagar ", h("strong", "por adelantado"), " a una tarjeta personal o por Transfermóvil."),
        h("li", "Te piden un ", h("strong", "código de verificación"), " que te llegó por SMS (así roban tu WhatsApp o tu cuenta)."),
        h("li", "Dicen ser ETECSA, un banco o un familiar con «número nuevo» y ", h("strong", "meten prisa"), "."),
        h("li", "Ofertas demasiado buenas: recarga doble, premios, ganancias seguras."),
        h("li", "Enlaces raros que imitan webs oficiales (", h("span.indicador", "etecsa-recargas[.]com"), ").")),
        h("div.guia-figuras",
          h("div.guia-figuras.una", F("codigo", 600, 734, "Ejemplo de chat: llega un SMS con el código de WhatsApp y un desconocido pide que se lo reenvíes porque «llegó por equivocación».",
            "Robo de WhatsApp: te piden el código que te llegó por SMS. Nunca lo compartas.")),
          F("paquete", 1100, 720, "Ejemplo: una falsa agencia de envíos dicta el código 00005999 para escribirlo en el monto de Transfermóvil; en realidad son 5 999 CUP transferidos.",
            "Falsos paquetes del exterior (estafa vista en 2026): el «código» que te dictan es dinero.", [600, 1137]))),
      S("Qué hacer si ya pagaste", h("ol",
        h("li", "No envíes más dinero ni códigos aunque te amenacen o prometan devolverlo."),
        h("li", "Guarda capturas de la conversación, del pago y del perfil."),
        h("li", "Si diste un código de WhatsApp, recupera tu cuenta y activa la verificación en dos pasos."),
        h("li", "Avisa a tu banco y denuncia ante las autoridades."), h("li", h("a", { href: "#/reportar" }, "Repórtalo en CODICE"), " para alertar a otros."))),
      S("Cómo reportar", h("ol",
        h("li", "Pulsa ", h("strong", "Reportar"), ". No hace falta cuenta."),
        h("li", "Indica cuándo, dónde y por qué canal te contactaron."),
        h("li", "Añade los datos del estafador: su número, enlace, perfil o tarjeta. Nunca los tuyos."),
        h("li", "Sube capturas o fotos. Puedes tapar tus datos antes; moderación también los tapa."),
        h("li", "Guarda el ", h("strong", "código privado"), ": con él sigues el estado, respondes y añades pruebas.")),
        h("div.guia-figuras.pasos-img",
          F("rep1", 600, 665, "Captura de CODICE: paso 1 del formulario, con fecha, precisión de la fecha y provincia.", "1 · Cuándo y dónde pasó."),
          F("rep2", 600, 843, "Captura de CODICE: paso 2, el número del estafador escrito; CODICE avisa de que coincide con reportes publicados.", "2 · El dato del estafador. Si ya está reportado, te avisa."),
          F("rep3", 600, 999, "Captura de CODICE: reporte enviado, con el código del caso y el código privado de seguimiento.", "Al final · Guarda tu código privado."))),
      S("Cómo tapar datos en una captura", h("ul",
        h("li", h("strong", "Android: "), "abre la captura en Galería → Editar → Dibujar o Marcador → pinta encima de tu nombre y número → Guardar."),
        h("li", h("strong", "iPhone: "), "abre la foto → Editar → Marcado (lápiz) → rotulador negro con trazo grueso → Listo."),
        h("li", "Tapa: tu nombre, tu número, tu foto, tu tarjeta y datos de otras personas. Deja visible lo del estafador.")),
        h("div.guia-figuras.una-ancha", F("tapar", 1100, 499, "Ejemplo de comprobante antes y después: tapados el nombre, la tarjeta y el teléfono propios; visibles la tarjeta de destino y el importe.",
          "Antes y después: tapa lo tuyo, deja visible la tarjeta del estafador y el importe.", [600, 934]))),
      S("Qué significan los colores",
        h("p", insignia("Riesgo alto", "riesgo-alto"), " varios reportes publicados o campaña confirmada. ", insignia("Riesgo medio", "riesgo-medio"), " aparece en al menos un reporte publicado."),
        h("p", insignia("Relación fuerte", "nivel-fuerte"), " comparten un dato muy específico (misma tarjeta, número o enlace). ",
          insignia("Relación intermedia", "nivel-intermedia"), " varias coincidencias razonables. ", insignia("Relación débil", "nivel-debil"), " coincidencias de contexto (zona, fechas, tipo)."),
        h("p", insignia("Estafa confirmada (activa)", "ver-confirmada"), " ", insignia("En investigación", "ver-investigacion"), " ", insignia("Resuelta", "ver-resuelta"), " ", insignia("Descartada", "ver-descartada")),
        h("p.suave", "CODICE conecta datos (indicadores), no acusa a personas: un número o una tarjeta puede ser de alguien a quien se la robaron o prestaron.")),
      h("p.tenue.pequeno", "Las imágenes marcadas «Ejemplo» recrean estafas reales documentadas con datos inventados, para no exponer a nadie. Las demás son capturas reales de CODICE."),
      S("Dirección oficial", h("p", "La única dirección oficial es ", h("strong", "codicecuba.org"), ". Si ves una copia de esta web en otra dirección, es falsa: repórtala."),
        h("p", "CODICE no tiene WhatsApp, Telegram ni correo de contacto. Todo se hace dentro de la web."))));
}
