import { h, vaciar } from "../ui.js";

export function mostrar(main) {
  const S = (t, ...c) => h("section.tarjeta", h("h2", t), ...c);
  vaciar(main, h("div.columna",
    h("div.cabecera-pagina", h("div",
      h("h1", "Nosotros"),
      h("p", "Quiénes somos y qué hacemos."))),
    h("div.pila",
      S("Quiénes somos",
        h("p", "CODICE es una iniciativa comunitaria e independiente contra las estafas digitales en Cuba. Detrás hay un equipo comprometido, con experiencia en pentesting (pruebas de seguridad), análisis OSINT (investigación con fuentes abiertas) e investigación digital.")),
      S("Qué hacemos",
        h("p", "Reunimos reportes de la comunidad y denuncias de fuentes públicas, los verificamos y los convertimos en información útil para prevenir y para investigar."),
        h("p", "Nuestro motor relaciona los indicadores de cada caso (números, enlaces, perfiles y cuentas de cobro) para detectar campañas y patrones de fraude, y publicamos alertas revisadas para que cualquiera pueda comprobar antes de pagar.")),
      S("Cómo trabajamos",
        h("p", "Cada caso pasa por revisión. Separamos lo verificado de lo probable, cuidamos la cadena de custodia de las pruebas y emitimos un veredicto por caso."),
        h("p", "No acusamos a personas: conectamos datos. Un número o una tarjeta pueden pertenecer a alguien a quien se los robaron, por eso trabajamos sobre indicadores, no sobre nombres.")),
      S("En qué creemos",
        h("p", "Independencia, rigor y privacidad. CODICE nunca te pedirá dinero, contraseñas ni códigos de verificación. No usamos rastreadores ni publicidad, y protegemos siempre a quien reporta: aparece como anónimo.")),
      h("section.tarjeta",
        h("h2", "Colabora"),
        h("p", "¿Trabajas en seguridad, OSINT o investigación y quieres aportar? Nos interesa tu ayuda."),
        h("div.fila-botones",
          h("a.boton.primario", { href: "#/colaborar" }, "Quiero colaborar"),
          h("a.boton", { href: "#/reportar" }, "Reportar una estafa"))))));
}
