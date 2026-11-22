// CODICE · service worker mínimo para la app instalable.
// A propósito NO guarda en caché la web ni las respuestas de faro: así nunca se ven datos viejos
// y cada publicación de la web llega al momento. Solo muestra una página propia si no hay conexión.
const CACHE = "codice-sin-conexion-v1";
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0F17"><title>CODICE · Sin conexión</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0F17;color:#E6EAF2;
font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:24px}
img{width:72px;height:72px;margin-bottom:12px}h1{font-size:1.3rem;margin:0 0 8px}p{margin:0 0 18px;color:#9AA4B5;max-width:30em}
button{min-height:44px;padding:0 20px;border-radius:12px;border:0;background:#38BDF8;color:#04121C;font:inherit;font-weight:600;cursor:pointer}</style>
</head><body><main><img src="img/icon-192.png" alt=""><h1>No hay conexión</h1>
<p>CODICE necesita internet para comprobar números y reportes. Revisa tus datos o el wifi e inténtalo de nuevo.</p>
<button type="button" onclick="location.reload()">Reintentar</button></main></body></html>`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("img/icon-192.png")).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // faro y lo demás: sin tocar
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => new Response(PAGINA, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }
  if (new URL(req.url).pathname.endsWith("/img/icon-192.png")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
