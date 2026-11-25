<div align="center">

<img src="img/logo.svg" width="96" alt="CODICE">

# CODICE

**Cuba · OSINT sobre Delincuentes Informáticos y Campañas de Estafa**

Plataforma colaborativa de inteligencia de amenazas para la documentación, correlación y análisis de campañas de phishing, suplantación de identidad y fraude digital en Cuba.

<a href="https://codicecuba.org"><img src="https://img.shields.io/badge/codicecuba.org-00ff41?style=for-the-badge&labelColor=000000&logo=githubpages&logoColor=00ff41" alt="codicecuba.org"></a>
<img src="https://img.shields.io/badge/status-production-00ff41?style=for-the-badge&labelColor=000000" alt="Production">
<img src="https://img.shields.io/badge/i18n-ES%20%7C%20EN-00ff41?style=for-the-badge&labelColor=000000" alt="ES | EN">

</div>

> [!IMPORTANT]
> La única dirección oficial es **[codicecuba.org](https://codicecuba.org)**. Cualquier otra web que imite a CODICE es falsa y debe reportarse.

---

## Descripción

CODICE recopila reportes de estafas digitales enviados por la comunidad y los convierte en información útil para la prevención y la investigación. Cada caso aporta indicadores (números, enlaces, perfiles, cuentas de cobro) que la plataforma correlaciona automáticamente para detectar campañas y patrones de fraude.

## Funcionalidades

| Módulo | Descripción |
| :-- | :-- |
| **Reportes** | Formulario guiado por pasos, con pruebas adjuntas y seguimiento del estado del caso |
| **Buscador público** | Consulta de números, enlaces o perfiles reportados, disponible incluso en modo de contingencia |
| **Analizador de mensajes** | Detección de señales de fraude en mensajes sospechosos, ejecutada localmente en el navegador |
| **Motor de correlación** | Relación de incidentes mediante indicadores de compromiso (IoC) y detección de campañas |
| **Análisis de vínculos** | Grafos interactivos de relaciones entre casos, campañas e indicadores |
| **Gestión de casos** | Control de acceso basado en roles (RBAC), flujo de revisión, expedientes, cadena de custodia y veredictos |
| **Métricas** | Analítica propia sin cookies ni rastreadores de terceros |

## Stack tecnológico

<p>
  <img src="https://skillicons.dev/icons?i=js,html,css&theme=dark" height="40" alt="JavaScript, HTML, CSS">
</p>

- **JavaScript nativo (ES Modules)**: SPA sin frameworks ni dependencias externas
- **HTML5 y CSS3**: diseño adaptable, temas oscuro y claro
- **SVG**: grafos y visualizaciones interactivas desarrollados a medida
- **i18n**: interfaz bilingüe español / inglés
- **GitHub Pages**: alojamiento del frontend

## Arquitectura

El frontend es una aplicación estática y desacoplada que se comunica con una **API REST privada**. Este repositorio contiene únicamente la interfaz pública: no incluye datos personales, pruebas, credenciales ni secretos.

## Seguridad y privacidad

- **Seguridad por diseño**: todo el contenido se inserta como texto, nunca como HTML, para prevenir inyecciones.
- **Content Security Policy** y lista blanca de rutas y protocolos permitidos.
- **Autenticación multifactor (TOTP)** para el equipo de moderación.
- **Privacidad**: sin cookies de seguimiento ni servicios de analítica externos; se respeta la señal «No rastrear» (DNT).
- **Datos públicos protegidos**: la copia pública del buscador solo contiene huellas criptográficas, nunca los valores originales.

## Estructura del repositorio

```
├── index.html      Punto de entrada de la aplicación
├── css/            Estilos y temas
├── js/
│   ├── paginas/    Vistas públicas
│   ├── admin/      Panel de moderación e investigación
│   └── i18n/       Traducciones
├── img/            Recursos gráficos
└── data/           Datos públicos del buscador
```

## Reportar una estafa

Los reportes se envían desde **[codicecuba.org](https://codicecuba.org)**, con o sin cuenta. Para colaborar con el proyecto, utiliza el formulario de colaboración de la propia web.

---

<div align="center">

**CODICE** · Iluminar lo que los estafadores quieren mantener a oscuras.

</div>
