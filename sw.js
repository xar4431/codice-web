// Service worker de CODICE: SOLO muestra los avisos push del equipo de moderación.
// No guarda nada en caché ni toca la web pública: la web se sigue cargando siempre fresca.
const VIBRACION = {
  tarea: [120, 80, 120],
  servidor: [320, 140, 320],
  ataque: [90, 50, 90, 50, 90, 260, 90, 50, 90, 50, 90],
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { t: "Aviso", b: e.data ? e.data.text() : "" }; }
  const tipo = VIBRACION[d.tipo] ? d.tipo : "tarea";
  e.waitUntil(self.registration.showNotification(`CODICE · ${d.t || "Aviso"}`, {
    body: d.b || "",
    icon: "img/icon-192.png",
    badge: "img/icon-192.png",
    tag: `codice-${tipo}`,
    renotify: true,
    requireInteraction: Boolean(d.urgente),
    vibrate: VIBRACION[tipo],
    timestamp: Date.now(),
    data: { u: typeof d.u === "string" && d.u.startsWith("#/admin") ? d.u : "#/admin" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data?.u || "#/admin", self.registration.scope).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.startsWith(self.registration.scope)) {
        await v.focus();
        try { await v.navigate(destino); } catch { /* la pestaña ya estaba abierta: basta con traerla al frente */ }
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
