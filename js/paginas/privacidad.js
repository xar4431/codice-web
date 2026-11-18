import { h, vaciar } from "../ui.js";

export function mostrar(main) {
  const S = (t, ...c) => h("section.tarjeta", h("h2", t), ...c);
  vaciar(main, h("div.cabecera-pagina", h("div", h("h1", "Privacidad y anonimato"), h("p", "Qué guardamos, qué publicamos y qué nunca hacemos."))),
    h("div.pila", { estilo: { maxWidth: "820px" } },
      S("Anonimato", h("p", "Quien reporta aparece siempre como «Anónimo». Las cuentas solo piden usuario y contraseña: nunca correo ni teléfono. Quien administra CODICE tampoco aparece en la web.")),
      S("Qué se publica", h("p", "Solo una versión revisada por moderación: un resumen sin datos personales, las pruebas que moderación autoriza (con tus datos tapados, sin metadatos como el GPS y con marca de agua) y los datos del estafador tapados en parte.")),
      S("Qué queda privado", h("p", "Tu descripción original, tus archivos originales y los datos completos se guardan cifrados en el servidor de CODICE y solo los ve el equipo de moderación. Cada vez que alguien los abre queda registrado.")),
      S("Datos técnicos", h("p", "Para frenar abusos, el servidor convierte tu dirección IP en un seudónimo que cambia cada día y se borra a los 30 días. No usamos cookies de seguimiento, ni Google, ni publicidad.")),
      S("Tus derechos", h("p", "Puedes pedir corregir o retirar tu reporte desde ", h("a", { href: "#/ayuda" }, "Ayuda y quejas"), ", y borrar tu cuenta en cualquier momento desde «Mi cuenta» (tus reportes quedan como anónimos)."))));
}
