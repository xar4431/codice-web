// CODICE · idioma de la web (español por defecto, inglés opcional).
// Se carga en <head>. Si la persona eligió inglés, traduce toda la pantalla (web pública y panel) con el
// diccionario js/i18n/en.json, y sigue traduciendo lo que aparece después (avisos, ventanas, tablas…).
// Lo que escribe la gente (descripciones de casos, comentarios, tickets) queda en su idioma original.
(function () {
  var CLAVE = "codice.idioma";
  var raiz = document.documentElement;
  var idioma = "es";
  try { if (localStorage.getItem(CLAVE) === "en") idioma = "en"; } catch (e) { /* sin almacenamiento */ }
  window.CODICE_IDIOMA = idioma;
  window.CODICE_LOCALE = idioma === "en" ? "en-US" : "es";
  raiz.setAttribute("lang", idioma);

  function cambiar(nuevo) {
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* solo dura esta visita */ }
    location.reload();
  }

  function pintarBoton() {
    var b = document.getElementById("boton-idioma");
    if (!b) return;
    var destino = idioma === "en" ? "es" : "en";
    var largo = b.querySelector(".texto-idioma-largo");
    var corto = b.querySelector(".texto-idioma-corto");
    if (largo) largo.textContent = destino === "en" ? "English" : "Español";
    if (corto) corto.textContent = destino === "en" ? "EN" : "ES";
    var ayuda = destino === "en" ? "View CODICE in English" : "Ver CODICE en español";
    b.setAttribute("title", ayuda);
    b.setAttribute("aria-label", ayuda);
    b.setAttribute("lang", destino);
    b.dataset.fijo = "1";
    b.addEventListener("click", function () { cambiar(destino); });
  }

  window.CODICE_IDIOMA_API = { actual: function () { return idioma; }, cambiar: cambiar };
  window.CODICE_T = function (s) { return s; };

  if (idioma !== "en") {
    document.addEventListener("DOMContentLoaded", pintarBoton);
    return;
  }

  // ---------- Modo inglés ----------
  raiz.classList.add("traduciendo");
  var listo = false;
  var exacto = null;   // Map: texto español normalizado -> inglés
  var patrones = [];   // [{pista, re, sal}]
  var ATRIBUTOS = ["placeholder", "title", "aria-label", "alt"];
  var NO_TOCAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };

  function norm(t) { return t.replace(/\s+/g, " ").trim(); }

  function traducir(texto, prof) {
    var n = norm(texto);
    if (!n || !/[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡]/.test(n)) return null;
    var e = exacto.get(n);
    if (e !== undefined) return e;
    if ((prof || 0) > 2) return null;
    for (var i = 0; i < patrones.length; i++) {
      var p = patrones[i];
      if (p.pista && n.indexOf(p.pista) === -1) continue;
      var m = p.re.exec(n);
      if (!m) continue;
      return p.sal.replace(/\$(\d+)/g, function (_, k) {
        var trozo = m[Number(k)] || "";
        var t = traducir(trozo, (prof || 0) + 1);
        return t === null ? trozo : t;
      });
    }
    return null;
  }

  function nodoTexto(nodo) {
    var v = nodo.nodeValue;
    if (!v || v.length > 600) return;
    var t = traducir(v, 0);
    if (t === null || t === norm(v)) return;
    var ini = v.match(/^\s*/)[0], fin = v.match(/\s*$/)[0];
    nodo.nodeValue = ini + t + fin;
  }

  function atributos(el) {
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = ATRIBUTOS[i], v = el.getAttribute(a);
      if (v) { var t = traducir(v, 0); if (t !== null && t !== v) el.setAttribute(a, t); }
    }
    if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) {
      var tv = traducir(el.value, 0); if (tv !== null) el.value = tv;
    }
  }

  function arbol(raizNodo) {
    if (!raizNodo) return;
    if (raizNodo.nodeType === 3) { if (!dentroDeNoTocar(raizNodo.parentNode)) nodoTexto(raizNodo); return; }
    if (raizNodo.nodeType === 1 && raizNodo.tagName === "TEXTAREA" && !saltar(raizNodo)) { atributos(raizNodo); return; }
    if (raizNodo.nodeType !== 1 || NO_TOCAR[raizNodo.tagName] || saltar(raizNodo)) return;
    atributos(raizNodo);
    var w = document.createTreeWalker(raizNodo, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (n.tagName === "TEXTAREA" && !saltar(n)) { atributos(n); return NodeFilter.FILTER_REJECT; }
          if (NO_TOCAR[n.tagName] || saltar(n)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 1) atributos(n); else nodoTexto(n); }
  }

  function saltar(el) { return el.hasAttribute && (el.hasAttribute("data-no-traducir") || el.dataset && el.dataset.fijo === "1"); }
  function dentroDeNoTocar(el) {
    while (el && el.nodeType === 1) { if (NO_TOCAR[el.tagName] || saltar(el)) return true; el = el.parentNode; }
    return false;
  }

  function titulo() {
    var t = traducir(document.title, 0);
    if (t !== null && t !== document.title) document.title = t;
  }

  function empezar(dic) {
    exacto = new Map();
    var t = dic.t || {};
    for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) exacto.set(k, t[k]);
    (dic.p || []).forEach(function (p) {
      try { patrones.push({ pista: p[2] || "", re: new RegExp(p[0]), sal: p[1] }); } catch (e) { /* patrón roto: se ignora */ }
    });
    listo = true;
    window.CODICE_T = function (s) {
      if (typeof s !== "string") return s;
      var t = traducir(s, 0);
      if (t === null) return s;
      return s.match(/^\s*/)[0] + t + s.match(/\s*$/)[0];
    };
    arbol(document.body);
    titulo();
    new MutationObserver(function (cambios) {
      for (var i = 0; i < cambios.length; i++) {
        var c = cambios[i];
        if (c.type === "childList") { for (var j = 0; j < c.addedNodes.length; j++) arbol(c.addedNodes[j]); }
        else if (c.type === "characterData") { if (!dentroDeNoTocar(c.target.parentNode)) nodoTexto(c.target); }
        else if (c.type === "attributes" && c.target.nodeType === 1 && !saltar(c.target)) atributos(c.target);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
    var tt = document.querySelector("title");
    if (tt) new MutationObserver(titulo).observe(tt, { childList: true, characterData: true, subtree: true });
    raiz.classList.remove("traduciendo");
  }

  // Ventanas nativas del navegador (confirmar, pedir contraseña, avisos)
  ["confirm", "alert", "prompt"].forEach(function (f) {
    var orig = window[f];
    if (!orig) return;
    window[f] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      if (listo && typeof msg === "string") {
        var t = traducir(msg, 0);
        if (t !== null) args[0] = t;
      }
      return orig.apply(window, args);
    };
  });

  var version = (document.currentScript && (document.currentScript.src.split("?v=")[1] || "")) || "";
  var diccionario = fetch("js/i18n/en.json?v=" + version, { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("sin diccionario"); return r.json(); })
    .catch(function () { return null; });

  // Si el diccionario tarda, se muestra la página igualmente (en español) para no dejarla en blanco.
  setTimeout(function () { raiz.classList.remove("traduciendo"); }, 2500);

  document.addEventListener("DOMContentLoaded", function () {
    pintarBoton();
    diccionario.then(function (dic) {
      if (dic) empezar(dic); else raiz.classList.remove("traduciendo");
    });
  });
})();
