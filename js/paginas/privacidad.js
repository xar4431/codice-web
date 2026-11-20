import { h, vaciar } from "../ui.js";

export function mostrar(main) {
  const S = (t, ...c) => h("section.tarjeta", h("h2", t), ...c);
  vaciar(main, h("div.columna", h("div.cabecera-pagina", h("div", h("h1", "Privacidad y anonimato"), h("p", "Qué guardamos, qué publicamos y qué nunca hacemos."))),
    h("div.pila",
      S("Anonimato", h("p", "Quien reporta aparece siempre como «Anónimo». Las cuentas solo piden usuario y contraseña: nunca correo ni teléfono. Quien administra CODICE tampoco aparece en la web.")),
      S("Qué se publica", h("p", "Solo una versión revisada por moderación: un resumen sin datos personales, las pruebas que moderación autoriza (con tus datos tapados, sin metadatos como el GPS y con marca de agua) y los datos del estafador tapados en parte.")),
      S("Qué queda privado", h("p", "Tu descripción original, tus archivos originales y los datos completos se guardan cifrados en el servidor de CODICE y solo los ve el equipo de moderación. Cada vez que alguien los abre queda registrado.")),
      S("Datos técnicos", h("p", "Para frenar abusos, el servidor convierte tu dirección IP en un seudónimo que cambia cada día y se borra a los 30 días. No usamos cookies de seguimiento, ni Google, ni publicidad."),
        h("p", "Si envías un reporte sin cuenta, tu IP se guarda cifrada 7 días solo para poder frenar sabotajes (avalanchas de reportes falsos); después se borra."),
        h("p", "La IP completa solo se guarda en el registro de seguridad (ataques al servidor, bloqueos por abuso e intentos fallidos de entrar a una cuenta) y se borra sola a los 30 días.")),
      S("Estadísticas de visitas", h("p", "Contamos las visitas para saber qué ayuda más: la página vista, si es móvil o PC, el navegador y el país o la provincia aproximados. Para esto no usamos cookies, ni Google, y no guardamos tu IP: la ubicación se calcula al momento dentro de nuestro servidor y la IP se descarta."),
        h("p", "Si tu navegador tiene activado «No rastrear» (Do Not Track o GPC), no contamos tu visita."),
        h("p.tenue", "Ubicación aproximada: ", h("a", { href: "https://db-ip.com", target: "_blank", rel: "noopener" }, "IP Geolocation by DB-IP"), " (licencia CC BY 4.0).")),
      S("Tus derechos", h("p", "Puedes pedir corregir o retirar tu reporte desde ", h("a", { href: "#/ayuda" }, "Ayuda y quejas"), ", y borrar tu cuenta en cualquier momento desde «Mi cuenta» (tus reportes quedan como anónimos).")))));
}
