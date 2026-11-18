import { h, vaciar, insignia } from "../ui.js";

const S = (titulo, ...cuerpo) => h("section.tarjeta", h("h2", titulo), ...cuerpo);

export function mostrar(main) {
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Guía de CODICE"), h("p", "Cómo usar la web, cómo reportar y qué significan los colores."))),
    h("div.pila", { estilo: { maxWidth: "820px" } },
      S("Señales de estafa más comunes", h("ul",
        h("li", "Te piden pagar ", h("strong", "por adelantado"), " a una tarjeta personal o por Transfermóvil."),
        h("li", "Te piden un ", h("strong", "código de verificación"), " que te llegó por SMS (así roban tu WhatsApp o tu cuenta)."),
        h("li", "Dicen ser ETECSA, un banco o un familiar con «número nuevo» y ", h("strong", "meten prisa"), "."),
        h("li", "Ofertas demasiado buenas: recarga doble, premios, ganancias seguras."),
        h("li", "Enlaces raros que imitan webs oficiales (", h("span.indicador", "etecsa-recargas[.]com"), ")."))),
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
        h("li", "Guarda el ", h("strong", "código privado"), ": con él sigues el estado, respondes y añades pruebas."))),
      S("Cómo tapar datos en una captura", h("ul",
        h("li", h("strong", "Android: "), "abre la captura en Galería → Editar → Dibujar o Marcador → pinta encima de tu nombre y número → Guardar."),
        h("li", h("strong", "iPhone: "), "abre la foto → Editar → Marcado (lápiz) → rotulador negro con trazo grueso → Listo."),
        h("li", "Tapa: tu nombre, tu número, tu foto, tu tarjeta y datos de otras personas. Deja visible lo del estafador."))),
      S("Qué significan los colores",
        h("p", insignia("Riesgo alto", "riesgo-alto"), " varios reportes publicados o campaña confirmada. ", insignia("Riesgo medio", "riesgo-medio"), " aparece en al menos un reporte publicado."),
        h("p", insignia("Relación fuerte", "nivel-fuerte"), " comparten un dato muy específico (misma tarjeta, número o enlace). ",
          insignia("Relación intermedia", "nivel-intermedia"), " varias coincidencias razonables. ", insignia("Relación débil", "nivel-debil"), " coincidencias de contexto (zona, fechas, tipo)."),
        h("p", insignia("Estafa confirmada (activa)", "ver-confirmada"), " ", insignia("En investigación", "ver-investigacion"), " ", insignia("Resuelta", "ver-resuelta"), " ", insignia("Descartada", "ver-descartada")),
        h("p.suave", "CODICE conecta datos (indicadores), no acusa a personas: un número o una tarjeta puede ser de alguien a quien se la robaron o prestaron.")),
      S("Dirección oficial", h("p", "La única dirección oficial es ", h("strong", "codicecuba.org"), ". Si ves una copia de esta web en otra dirección, es falsa: repórtala."),
        h("p", "CODICE no tiene WhatsApp, Telegram ni correo de contacto. Todo se hace dentro de la web."))));
}
