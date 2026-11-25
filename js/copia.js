// buscador con la copia que esta publicada en GitHub: funciona aunque faro este apagado
// ojo: la copia NO tiene los valores en claro, solo las huellas (SHA-256) de los valores ya normalizados
let copia = null;

async function cargar() {
  if (copia) return copia;
  const r = await fetch("data/indicadores.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("Sin copia");
  copia = await r.json();
  return copia;
}

async function huella(tipo, valor) {
  const datos = new TextEncoder().encode(`${tipo}:${valor}`);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function candidatos(q) {
  const t = q.trim().toLowerCase().replace(/hxxp/g, "http").replace(/\[\.\]/g, ".");
  const res = [];
  const dig = t.replace(/\D/g, "");
  if (/^9\d{15}$/.test(dig) || (dig.length >= 16 && dig.length <= 19)) res.push(["referencia_pago", dig]);
  if (dig.length === 8 && /^[56]/.test(dig)) res.push(["telefono", "+53" + dig]);
  else if (dig.length === 10 && dig.startsWith("53")) res.push(["telefono", "+" + dig]);
  else if (dig.length >= 7 && dig.length <= 15 && !res.length) res.push(["telefono", "+" + dig.replace(/^00/, "")]);
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(t)) res.push(["correo", t]);
  const m = t.match(/^(https?:\/\/)?(www\.)?([a-z0-9-]+(\.[a-z0-9-]+)+)(\/.*)?$/);
  if (m) {
    res.push(["dominio", m[3]]);
    if (m[5]) res.push(["url", m[3] + m[5].split(/[?#]/)[0].replace(/\/$/, "")]);
  }
  return res;
}

export async function buscarEnCopia(q) {
  const c = await cargar();
  const resultados = [];
  for (const [tipo, valor] of candidatos(q)) {
    const x = c.indicadores[await huella(tipo, valor)];
    if (x) resultados.push({ tipo: x.t, valor: x.m, reportes: x.n, riesgo: x.r, campanas: x.c, primera: x.d, ultima: x.h, casos: [] });
  }
  return { resultados, generado: c.generado, campanas: c.campanas };
}

export async function campanasEnCopia() { return (await cargar()).campanas; }
