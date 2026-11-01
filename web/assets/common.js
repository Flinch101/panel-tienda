(function () {
  const R = document.body.dataset.root || "", C = CONFIG, $ = (s, e = document) => e.querySelector(s);
  const money = n => "$" + Number(n).toLocaleString("es-AR");
  const wa = t => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(t)}`;
  const line = i => `HOLA QUIERO ESTE PRODUCTO ${i.n}, TALLE ${i.t}, COLOR ${i.c}` + (i.p ? `\nCantidad: ${i.q}\nPrecio: ${money(i.p * i.q)}` : "");
  const order = a => "¡Hola! Quiero hacer este pedido:\n\n" + a.map((i, k) => `${k + 1}) ${i.n}\n    Talle: ${i.t} | Color: ${i.c}\n    ${i.q} x ${money(i.p)} = ${money(i.p * i.q)}`).join("\n\n") + `\n\nTOTAL: ${money(a.reduce((s, i) => s + i.p * i.q, 0))}\n\n--- Datos para coordinar el envío (completá acá) ---\nNombre: \nLocalidad y dirección: \nEnvío o retiro en el local: \nForma de pago: \nComentarios: `;
  /* Variantes: cada color tiene sus propios talles/stock y sus propias fotos.
     Formato nuevo:  p.variantes = [{ color, stock: { S: 3, M: 0 }, fotos: [...] }]   (talle presente = existe; 0 = agotado)
     Formato viejo (sin "variantes"): p.colores + p.talles + p.stock iguales para todos los colores. Se sigue leyendo igual. */
  const TL = ["S", "M", "L", "XL", "XXL"];
  const vars = p => {
    if (p._v) return p._v;
    if (Array.isArray(p.variantes) && p.variantes.length) return p._v = p.variantes.map(x => ({ color: x.color || "Único", stock: x.stock || {}, fotos: x.fotos || [] }));
    const st = {}; (p.talles || []).forEach(t => st[t] = p.stock && p.stock[t] != null ? p.stock[t] : 99);
    return p._v = (p.colores && p.colores.length ? p.colores : ["Único"]).map(c => ({ color: c, stock: st, fotos: [] }));
  };
  const cols = p => vars(p).map(v => v.color);
  const ord = a => [...new Set(a)].sort((x, y) => (TL.indexOf(x) + 1 || 99) - (TL.indexOf(y) + 1 || 99));
  const sz = (p, c) => ord(vars(p).filter(v => c == null || v.color === c).flatMap(v => Object.keys(v.stock).filter(t => v.stock[t] !== 0)));
  const stk = (p, c, t) => { const v = vars(p).find(v => v.color === c); return v && v.stock[t] != null ? v.stock[t] : 0 };
  const fotosDe = (p, c) => { const v = vars(p).find(v => v.color === c); return [...new Map([...(v ? v.fotos : []), ...(p.fotos || [])].map(f => [String(f).split("/").pop().toLowerCase(), f])).values()] };
  function add(p, t, c, q) { const f = cart.find(i => i.id === p.id && i.t === t && i.c === c); f ? f.q += q : cart.push({ id: p.id, n: p.nombre, t, c, p: p.precio, q }); save(); $("#cart").classList.add("on") }
  const foto = f => !f ? R + "logo.png" : /^http/.test(f) ? f : C.fotos + f;
  let cart = [], all = [];
  try { cart = JSON.parse(localStorage.getItem("carrito")) || [] } catch (e) { }
  const save = () => { try { localStorage.setItem("carrito", JSON.stringify(cart)) } catch (e) { } draw() };
  const nav = [["Inicio", ""], ["Productos", "productos/"], ["Contacto", "contacto/"], ["Quiénes somos", "quienes-somos/"], ["Preguntas frecuentes", "preguntas-frecuentes/"], ["Guía de talles", "guia-de-talles/"]];
  $("#h").innerHTML = `<div class="top"><form action="${R}productos/"><input name="q" placeholder="Buscar productos" aria-label="Buscar"><button aria-label="Buscar">🔍</button></form><a href="${R || "./"}"><img src="${R}logo.png" alt="Logo"></a><button id="cb">🛒 <span id="cn">0</span></button></div><nav>${nav.map(n => `<a href="${R + n[1] || "./"}">${n[0]}</a>`).join("")}</nav>`;
  $("#f").innerHTML = `<div class="fg"><div><h4>NAVEGACIÓN</h4>${nav.map(n => `<a href="${R + n[1] || "./"}">${n[0]}</a>`).join("")}</div>
<div><h4>MEDIOS DE PAGO</h4><p>Visa, Mastercard, American Express, Naranja, Cabal, tarjetas de débito, transferencia y efectivo.</p></div>
<div><h4>CONTACTO</h4><a href="${wa("Hola, quiero hacer una consulta")}">WhatsApp</a><a href="mailto:${C.mail}">${C.mail}</a><a href="${C.maps}">Ubicación</a></div>
<div><h4>REDES</h4><a href="${C.ig}">Instagram</a><a href="${C.fb}">Facebook</a><a href="${C.tt}">TikTok</a></div></div>`;
  document.body.insertAdjacentHTML("beforeend", `<aside id="cart"><button id="cx" aria-label="Cerrar">✕</button><h2>Tu carrito</h2><ul id="ci"></ul><p>Total: <b id="ct"></b></p><a id="cw" target="_blank">Enviar pedido por WhatsApp</a></aside><a class="fab" target="_blank" aria-label="WhatsApp" href="${wa("Hola, quiero hacer una consulta")}">💬</a>`);
  function draw() {
    $("#cn").textContent = cart.reduce((a, i) => a + i.q, 0);
    $("#ci").innerHTML = cart.map((i, k) => `<li><span>${i.n}<br><small>Talle ${i.t} · ${i.c}</small><br><button data-q="${k}:-1" aria-label="Menos">−</button> ${i.q} <button data-q="${k}:1" aria-label="Más">+</button></span><b>${money(i.p * i.q)}</b><button data-r="${k}" aria-label="Quitar">✕</button></li>`).join("") || "<li>El carrito está vacío.</li>";
    $("#ct").textContent = money(cart.reduce((a, i) => a + i.p * i.q, 0));
    $("#cw").href = wa(cart.length ? order(cart) : "Hola, quiero hacer una consulta");
  }
  document.addEventListener("change", e => {
    const x = e.target, c = x.classList && x.classList.contains("c") && x.closest(".card"); if (!c) return;
    const p = all.find(p => p.id === c.dataset.id); if (!p) return;
    const ts = sz(p, x.value); $(".t", c).innerHTML = opt(ts); c.querySelectorAll("button[data-a]").forEach(b => b.disabled = !ts.length);
    const im = $("img", c); if (im) im.src = foto(fotosDe(p, x.value)[0]);
    const a = $("a", c); a.href = `${pu(p)}&color=${encodeURIComponent(x.value)}`;
  });
  document.addEventListener("click", e => {
    const x = e.target;
    if (x.closest("#cb")) $("#cart").classList.add("on");
    if (x.closest("#cx")) $("#cart").classList.remove("on");
    if (x.dataset.r) { cart.splice(x.dataset.r, 1); save() }
    if (x.dataset.q) { const [k, d] = x.dataset.q.split(":"); cart[k].q += +d; if (cart[k].q < 1) cart.splice(k, 1); save() }
    const a = x.dataset.a;
    if (a) {
      const c = x.closest(".card"), p = all.find(p => p.id === c.dataset.id), t = $(".t", c).value, co = $(".c", c).value;
      if (!t) return;
      if (a === "wa") window.open(wa(line({ n: p.nombre, t, c: co, q: 1, p: p.precio })), "_blank");
      else add(p, t, co, 1)
    }
  });
  async function load() {
    for (const u of [C.json, R + C.local]) { try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) { all = Object.values(await r.json()).flat().filter(p => p.estado === "Publicado"); return all } } catch (e) { } }
    return all
  }
  const opt = (a, sel) => a.map(v => `<option${v === sel ? " selected" : ""}>${v}</option>`).join("");
  const pu = p => `${R}producto/?id=${p.id}`;
  const img = (f, a) => `<img src="${foto(f)}" alt="${a}" width="600" height="800" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${R}logo.png'">`;
  const card = (p, pref) => { const cs = cols(p), c0 = typeof pref === "string" && cs.includes(pref) ? pref : cs.find(c => sz(p, c).length) || cs[0], ts = sz(p, c0), off = ts.length ? "" : " disabled"; return `<article class="card" data-id="${p.id}"><a href="${pu(p)}${cs.length > 1 ? "&color=" + encodeURIComponent(c0) : ""}">${img(fotosDe(p, c0)[0], p.nombre)}<h3>${p.nombre}</h3></a><p class="sub">${p.descripcionCorta || ""}</p><b>${money(p.precio)}</b>${p.cuotas && p.cuotas.tiene ? `<small>${p.cuotas.detalle || ""}</small>` : ""}<div class="sel"><select class="t" aria-label="Talle">${opt(ts)}</select><select class="c" aria-label="Color">${opt(cs, c0)}</select></div><button data-a="add"${off}>Agregar al carrito</button><button class="alt" data-a="wa"${off}>Pedir por WhatsApp</button></article>` };
  window.T = { load, card, sz, ord, cols, vars, stk, fotosDe, img, add, line, money, wa };
  [C.json, C.fotos].forEach(u => { try { document.head.insertAdjacentHTML("beforeend", `<link rel="preconnect" href="${new URL(u).origin}">`) } catch (e) { } });
  draw();
})();
