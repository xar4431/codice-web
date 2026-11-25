// «Analizar un mensaje»: reglas mias, nada de IA de pago. Todo pasa en el telefono de la persona, no sale de ahi
const REGLAS = [
  { id: "adelanto", peso: 3, texto: "Pide pagar o transferir por adelantado", re: /(paga|pague|transfi[eé]r|deposit|env[ií]a(me)? (el|la|los)? ?(dinero|pago|saldo)|adelanto|reserva(r)? con|separar(la|lo)? con|abono|transferm[oó]vil|enzona|zelle)/i },
  { id: "prisa", peso: 2, texto: "Mete prisa o amenaza con perder la oportunidad", re: /(urgente|hoy mismo|solo hoy|[uú]ltim[oa]s? (horas?|unidades|cupos)|r[aá]pido|ahora mismo|antes de las|se acaba|plazo|inmediat)/i },
  { id: "codigo", peso: 4, texto: "Pide un código de verificación, PIN o contraseña", re: /(c[oó]digo (de )?(verificaci[oó]n|whatsapp|seguridad|confirmaci[oó]n)|\bpin\b|contrase[nñ]a|clave (de|del) (banco|tarjeta|transferm)|te (lleg[oó]|va a llegar) un (sms|c[oó]digo))/i },
  { id: "premio", peso: 2, texto: "Promete premios, regalos o ganancias fáciles", re: /(ganaste|has ganado|premio|sorteo|regalo|gratis|recarga doble|bono|duplica|ganancias? (diarias|seguras)|inversi[oó]n segura|100 ?% seguro)/i },
  { id: "suplanta", peso: 3, texto: "Dice ser ETECSA, un banco, Transfermóvil o una entidad oficial", re: /(etecsa|cubacel|nauta|bandec|bpa|banco metropolitano|metropolitano|transferm[oó]vil|enzona|banco central|minint|aduana|western union)/i },
  { id: "acortado", peso: 2, texto: "Usa enlaces acortados u ocultos", re: /(bit\.ly|tinyurl|cutt\.ly|is\.gd|goo\.gl|t\.co\/|shorturl|rb\.gy|ow\.ly|hxxp|\[\.\])/i },
  { id: "enlace_raro", peso: 2, texto: "Trae un enlace que imita una web oficial", re: /(etecsa|bandec|bpa|metropolitano|transfermovil|enzona)[a-z0-9-]*\.(?!cu\b)[a-z]{2,}|[a-z0-9-]+-(etecsa|recarga|banco|cuba)[a-z0-9-]*\.[a-z]{2,}/i },
  { id: "tarjeta", peso: 2, texto: "Incluye un número de tarjeta para cobrar", re: /\b(9\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/ },
  { id: "secreto", peso: 2, texto: "Pide que no se lo cuentes a nadie o que borres el mensaje", re: /(no (se lo )?(digas|cuentes)|confidencial|borra (este|el) mensaje|entre nosotros|discreci[oó]n)/i },
  { id: "familiar", peso: 2, texto: "Dice ser un familiar con un número nuevo que necesita dinero", re: /(cambi[eé] de n[uú]mero|este es mi (nuevo )?n[uú]mero|soy (tu|yo) (hij[oa]|mam[aá]|pap[aá]|herman[oa]|t[ií][oa])|perd[ií] el tel[eé]fono)/i },
  { id: "divisas", peso: 2, texto: "Ofrece cambio de divisas o cripto muy por encima del mercado", re: /(usdt|bitcoin|cripto|mlc|cambio (de )?(usd|euros?|mlc)|tasa (muy )?(buena|alta))/i },
];

export function analizar(texto) {
  const t = (texto || "").slice(0, 8000);
  const senales = REGLAS.filter((r) => r.re.test(t)).map((r) => ({ id: r.id, texto: r.texto, peso: r.peso }));
  const total = senales.reduce((s, x) => s + x.peso, 0);
  const nivel = total >= 6 ? "alto" : total >= 3 ? "medio" : "bajo";
  const indicadores = [];
  for (const m of t.matchAll(/(\+?53[\s-]?)?\b[56]\d[\s-]?\d{3}[\s-]?\d{3}\b/g)) indicadores.push(m[0].trim());
  for (const m of t.matchAll(/(https?:\/\/|hxxps?:\/\/|www\.)[^\s]+|[a-z0-9-]+(\.|\[\.\])[a-z]{2,}(\/[^\s]*)?/gi)) indicadores.push(m[0]);
  for (const m of t.matchAll(/\b9\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g)) indicadores.push(m[0]);
  return { senales, nivel, total, indicadores: [...new Set(indicadores)].slice(0, 6) };
}
