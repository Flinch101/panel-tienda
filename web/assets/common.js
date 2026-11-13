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
  const IC = {"lupa": "<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7.5\"/><path d=\"M21 21l-4.6-4.6\"/></svg>", "carro": "<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"20.5\" r=\"1.4\"/><circle cx=\"18\" cy=\"20.5\" r=\"1.4\"/><path d=\"M1.5 2.5H5l2.6 12.6a1.8 1.8 0 0 0 1.8 1.4h8.5a1.8 1.8 0 0 0 1.8-1.4L21.5 7H6\"/></svg>", "wa": "<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z\"/></svg>"};
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
  /* Fotos: se prueban varias fuentes en orden (C.fotos puede ser un texto o una lista). Si una falla (por ejemplo jsDelivr cuando el repo pasa los 50 MB),
     se pasa a la siguiente y se recuerda cuál anda por unas horas. Al final, la carpeta fotos/ del propio sitio y por último el logo. */
  const BASES = (Array.isArray(C.fotos) ? C.fotos : [C.fotos]).filter(Boolean).concat([R + "fotos/"]);
  const pref = () => { try { const o = JSON.parse(localStorage.getItem("fb")); if (o && Date.now() - o.t < 216e5 && o.i < BASES.length) return o.i } catch (e) { } return 0 };
  let bi = pref(); const fallas = {};
  const foto = (f, i = bi) => !f ? R + "logo.png" : /^http/.test(f) ? f : BASES[i] + f;
  const dato = f => f && !/^http/.test(f) ? String(f).replace(/"/g, "&quot;") : "";
  function fe(el) {                                   // onerror de las fotos: probar la fuente siguiente a la que falló
    const f = el.dataset.f; if (!f) { el.onerror = null; el.src = R + "logo.png"; return }
    let cur = BASES.findIndex(b => el.src.indexOf(new URL(b, document.baseURI).href) === 0); if (cur < 0) cur = bi;
    fallas[cur] = (fallas[cur] || 0) + 1;
    if (fallas[cur] >= 2 && cur + 1 > bi) { bi = cur + 1; try { localStorage.setItem("fb", JSON.stringify({ i: Math.min(bi, BASES.length - 1), t: Date.now() })) } catch (e) { } }
    if (cur + 1 >= BASES.length) { el.onerror = null; el.src = R + "logo.png"; return }
    el.src = BASES[cur + 1] + f;
  }
  const setImg = (im, f) => { im.dataset.f = dato(f); im.onerror = function () { fe(this) }; im.src = foto(f) };
  let cart = [], all = [];
  try { cart = JSON.parse(localStorage.getItem("carrito")) || [] } catch (e) { }
  const save = () => { try { localStorage.setItem("carrito", JSON.stringify(cart)) } catch (e) { } draw() };
  const nav = [["Inicio", ""], ["Productos", "productos/"], ["Contacto", "contacto/"], ["Quiénes somos", "quienes-somos/"], ["Preguntas frecuentes", "preguntas-frecuentes/"], ["Guía de talles", "guia-de-talles/"]];
  $("#h").innerHTML = `<div class="top"><form action="${R}productos/"><input name="q" placeholder="Buscar productos" aria-label="Buscar"><button aria-label="Buscar">${IC.lupa}</button></form><a href="${R || "./"}"><img src="${R}logo.png" alt="Logo"></a><div class="tr"><button id="cb" aria-label="Abrir carrito">${IC.carro}<span id="cn">0</span></button><span data-theme-slot></span></div></div><nav>${nav.map(n => `<a href="${R + n[1] || "./"}">${n[0]}</a>`).join("")}</nav>`;
  $("#f").innerHTML = `<div class="fg"><div><h4>NAVEGACIÓN</h4>${nav.map(n => `<a href="${R + n[1] || "./"}">${n[0]}</a>`).join("")}</div>
<div><h4>MEDIOS DE PAGO</h4><p>Visa, Mastercard, American Express, Naranja, Cabal, tarjetas de débito, transferencia y efectivo.</p></div>
<div><h4>CONTACTO</h4><a href="${wa("Hola, quiero hacer una consulta")}">WhatsApp</a><a href="mailto:${C.mail}">${C.mail}</a><a href="${C.maps}">Ubicación</a></div>
<div><h4>REDES</h4><a href="${C.ig}">Instagram</a><a href="${C.fb}">Facebook</a><a href="${C.tt}">TikTok</a></div></div>`;
  document.body.insertAdjacentHTML("beforeend", `<aside id="cart"><button id="cx" aria-label="Cerrar">✕</button><h2>Tu carrito</h2><ul id="ci"></ul><p>Total: <b id="ct"></b></p><a id="cw" target="_blank">Enviar pedido por WhatsApp</a></aside><a class="fab" target="_blank" aria-label="WhatsApp" href="${wa("Hola, quiero hacer una consulta")}">${IC.wa}</a>`);
  function draw() {
    $("#cn").textContent = cart.reduce((a, i) => a + i.q, 0);
    $("#ci").innerHTML = cart.map((i, k) => `<li><span>${i.n}<br><small>Talle ${i.t} · ${i.c}</small><br><button data-q="${k}:-1" aria-label="Menos">−</button> ${i.q} <button data-q="${k}:1" aria-label="Más">+</button></span><b>${money(i.p * i.q)}</b><button data-r="${k}" aria-label="Quitar">✕</button></li>`).join("") || "<li>El carrito está vacío.</li>";
    $("#ct").textContent = money(cart.reduce((a, i) => a + i.p * i.q, 0));
    $("#cw").href = wa(cart.length ? order(cart) : "Hola, quiero hacer una consulta");
  }
  /* ---------- tarjetas: colores en texto + botones; el talle se pide recién al tocar un botón ---------- */
  const attr = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const todosTalles = (p, c) => { const v = vars(p).find(v => v.color === c); return ord([...TL, ...Object.keys(v ? v.stock : {})]) };
  function setCol(card, p, col) {
    card.dataset.col = col;
    card.querySelectorAll(".cc").forEach(b => b.classList.toggle("on", b.dataset.c === col));
    const im = $("img", card); if (im) setImg(im, fotosDe(p, col)[0]);
    $("a", card).href = `${pu(p)}&color=${encodeURIComponent(col)}`;
    const ok = sz(p, col).length > 0; card.querySelectorAll("button[data-a]").forEach(b => b.disabled = !ok);
  }
  function pedirTalle(p, col, hecho) {
    let d = $("#sp"); if (!d) { document.body.insertAdjacentHTML("beforeend", '<dialog id="sp"></dialog>'); d = $("#sp"); d.addEventListener("click", e => { if (e.target === d || e.target.closest(".x")) d.close() }) }
    d.innerHTML = `<h3>${attr(p.nombre)}</h3><p>Elegí tu talle${col !== "Único" ? " · " + attr(col) : ""}</p><div class="pl">${todosTalles(p, col).map(t => `<button type="button" class="pill" data-t="${t}"${stk(p, col, t) > 0 ? "" : ' disabled title="No disponible"'}>${t}</button>`).join("")}</div><button type="button" class="x">Cancelar</button>`;
    d.onclick = e => { const b = e.target.closest(".pill"); if (b && !b.disabled) { d.close(); hecho(b.dataset.t) } else if (e.target === d || e.target.closest(".x")) d.close() };
    d.showModal();
  }
  document.addEventListener("click", e => {
    const x = e.target;
    if (x.closest("#cb")) $("#cart").classList.add("on");
    if (x.closest("#cx")) $("#cart").classList.remove("on");
    if (x.dataset.r) { cart.splice(x.dataset.r, 1); save() }
    if (x.dataset.q) { const [k, d] = x.dataset.q.split(":"); cart[k].q += +d; if (cart[k].q < 1) cart.splice(k, 1); save() }
    const cc = x.closest(".cc");
    if (cc) { const c = cc.closest(".card"), p = all.find(p => p.id === c.dataset.id); if (p) setCol(c, p, cc.dataset.c); return }
    const a = x.dataset.a;
    if (a && x.closest(".card")) {
      const c = x.closest(".card"), p = all.find(p => p.id === c.dataset.id); if (!p) return;
      const col = c.dataset.col, ts = sz(p, col); if (!ts.length) return;
      const ir = t => a === "wa" ? window.open(wa(line({ n: p.nombre, t, c: col, q: 1, p: p.precio })), "_blank") : add(p, t, col, 1);
      ts.length === 1 && todosTalles(p, col).filter(t => stk(p, col, t) > 0).length === 1 ? ir(ts[0]) : pedirTalle(p, col, ir);
    }
  });
  async function load() {
    for (const u of [C.json, R + C.local]) { try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) { all = Object.values(await r.json()).flat().filter(p => p.estado === "Publicado"); return all } } catch (e) { } }
    return all
  }
  const pu = p => `${R}producto/?id=${p.id}`;
  const img = (f, a) => `<img src="${foto(f)}" data-f="${dato(f)}" alt="${a}" width="600" height="800" loading="lazy" decoding="async" onerror="T.fe(this)">`;
  /* portada: color con stock y con fotos propias; si no hay, con stock; si no, el primero */
  const conFotos = (p, c) => { const v = vars(p).find(v => v.color === c); return !!(v && v.fotos.length) };
  const portada = p => { const cs = cols(p), st = c => sz(p, c).length > 0; return cs.find(c => st(c) && conFotos(p, c)) || cs.find(st) || cs.find(c => conFotos(p, c)) || cs[0] };
  const hayStock = p => cols(p).some(c => sz(p, c).length > 0);
  const primerosConStock = ps => [...ps].sort((a, b) => hayStock(b) - hayStock(a));   // orden estable: lo agotado va al final
  const card = (p, pref) => {
    const cs = cols(p), c0 = typeof pref === "string" && cs.includes(pref) ? pref : portada(p), off = sz(p, c0).length ? "" : " disabled";
    const colores = cs.length > 1 ? `<div class="cl" role="group" aria-label="Colores">${cs.map(c => `<button type="button" class="cc${c === c0 ? " on" : ""}${sz(p, c).length ? "" : " ns"}" data-c="${attr(c)}">${attr(c)}</button>`).join("")}</div>` : "";
    return `<article class="card" data-id="${p.id}" data-col="${attr(c0)}"><a href="${pu(p)}${cs.length > 1 ? "&color=" + encodeURIComponent(c0) : ""}">${img(fotosDe(p, c0)[0], attr(p.nombre))}<h3>${p.nombre}</h3></a><p class="sub">${p.descripcionCorta || ""}</p><b>${money(p.precio)}</b>${p.cuotas && p.cuotas.tiene ? `<small>${p.cuotas.detalle || ""}</small>` : ""}${colores}<button data-a="add"${off}>Agregar al carrito</button><button class="alt" data-a="wa"${off}>Pedir por WhatsApp</button></article>`;
  };
  window.T = { load, card, sz, ord, cols, vars, stk, fotosDe, img, add, line, money, wa, TL, fe, setImg, src: foto, primerosConStock, hayStock, attr };
  [C.json, ...[].concat(C.fotos)].forEach(u => { try { document.head.insertAdjacentHTML("beforeend", `<link rel="preconnect" href="${new URL(u).origin}">`) } catch (e) { } });
  draw();
})();
