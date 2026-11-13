/* Tema claro/oscuro + favicon. Se carga en el <head> de TODAS las páginas (incluidas admin y personalizar).
   - Tema: si la persona nunca tocó el botón, sigue al navegador (prefers-color-scheme) y cambia en vivo.
     Si tocó el botón, se guarda su elección en este navegador.
   - Favicon: sigue SIEMPRE al tema del navegador (la barra de pestañas), no al botón de la página.
   - Botón: se dibuja en cualquier elemento con el atributo data-theme-slot. */
(function () {
  var KEY = "tema", root = document.documentElement, mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  var src = document.currentScript && document.currentScript.src;
  var logo = function (f) { try { return new URL("../" + f, src).href } catch (e) { return null } };
  var guardado = function () { try { var v = localStorage.getItem(KEY); return v === "dark" || v === "light" ? v : null } catch (e) { return null } };
  var actual = function () { return guardado() || (mq.matches ? "dark" : "light") };

  function aplicar() {
    var t = actual(); root.setAttribute("data-theme", t); root.style.colorScheme = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m) }
    m.content = t === "dark" ? "#121212" : "#ffffff";
    document.querySelectorAll("[data-theme-sw]").forEach(function (b) { b.setAttribute("aria-checked", t === "dark"); b.title = t === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro" });
  }
  function favicon() {
    var u = logo(mq.matches ? "logo-blanco.png" : "logo.png"); if (!u) return;
    var l = document.querySelector('link[rel~="icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; document.head.appendChild(l) }
    l.removeAttribute("media"); if (l.getAttribute("href") !== u) { var n = l.cloneNode(); n.href = u; l.replaceWith(n) }
  }
  aplicar(); favicon();
  var cambio = function () { aplicar(); favicon() };
  mq.addEventListener ? mq.addEventListener("change", cambio) : mq.addListener && mq.addListener(cambio);

  var css = document.createElement("style");
  css.textContent = ".tsw{position:relative;display:inline-block;flex:none;width:46px;height:26px;padding:0;border:1px solid var(--tsw-bd,#bbb);border-radius:13px;background:var(--tsw-bg,#e6e6e6);cursor:pointer;transition:background .2s,border-color .2s;vertical-align:middle}" +
    ".tsw i{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--tsw-kn,#fff);color:var(--tsw-ic,#000);display:grid;place-items:center;box-shadow:0 1px 3px #0004;transition:transform .2s}" +
    ".tsw svg{width:12px;height:12px;display:block}.tsw .lu{display:none}" +
    '.tsw[aria-checked="true"] i{transform:translateX(20px)}.tsw[aria-checked="true"] .so{display:none}.tsw[aria-checked="true"] .lu{display:block}' +
    ".tsw:focus-visible{outline:2px solid #1a73e8;outline-offset:2px}@media(prefers-reduced-motion:reduce){.tsw,.tsw i{transition:none}}";
  document.head.appendChild(css);

  function montar() {
    document.querySelectorAll("[data-theme-slot]").forEach(function (s) {
      if (s.querySelector("[data-theme-sw]")) return;
      s.innerHTML = '<button type="button" class="tsw" role="switch" data-theme-sw aria-label="Modo oscuro"><i><svg class="so" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg><svg class="lu" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></i></button>';
      s.querySelector("button").onclick = function () { var n = actual() === "dark" ? "light" : "dark"; try { localStorage.setItem(KEY, n) } catch (e) { } aplicar() };
    });
    aplicar();
  }
  window.Tema = { montar: montar };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", montar) : montar();
  window.addEventListener("storage", function (e) { if (e.key === KEY) aplicar() });
})();
