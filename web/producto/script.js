(async () => {
    const $ = s => document.querySelector(s), id = new URLSearchParams(location.search).get("id"), ps = await T.load(), p = ps.find(x => x.id === id);
    if (!p) { $("#pd").innerHTML = `<p>No encontramos este producto. <a href="../productos/">Ver todos los productos</a></p>`; $("#rh").hidden = true; return }
    document.title = p.nombre;
    const fs = [...new Map((p.fotos || []).map(f => [String(f).split("/").pop().toLowerCase(), f])).values()]; if (!fs.length) fs.push(null); const big = i => T.img(fs[i], p.nombre).replace('loading="lazy"', 'fetchpriority="high"');
    const esc = s => String(s || "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\r/g, ""); const op = a => a.map(v => `<option>${v}</option>`).join("");
    $("#pd").innerHTML = `<div class="gal"><div id="big">${big(0)}</div>${fs.length > 1 ? `<div class="th">${fs.map((f, i) => `<button data-i="${i}" aria-label="Foto ${i + 1}">${T.img(f, "")}</button>`).join("")}</div>` : ""}</div>
<div class="inf"><h1>${p.nombre}</h1><p>${p.subtitulo || ""}</p><p class="pr">${T.money(p.precio)}</p><p>${p.descripcionCorta || ""}</p>${p.cuotas && p.cuotas.tiene ? `<p><b>${p.cuotas.detalle || p.cuotas.cantidad + " cuotas"}</b></p>` : ""}
<label>Talle<select id="t">${op(T.sz(p))}</select></label><label>Color<select id="c">${op(T.cols(p))}</select></label>
<label>Cantidad<span class="q"><button id="m" aria-label="Menos">−</button><input id="n" type="number" value="1" min="1"><button id="pl" aria-label="Más">+</button></span></label><p id="st"></p>
<button class="b" id="ad">Agregar al carrito</button><button class="b alt" id="wp">Pedir por WhatsApp</button>
<h2>Descripción</h2><div class="desc" style="white-space:pre-wrap">${esc(p.descripcion)}</div><p class="meta">${[p.marca, p.modelo, p.subcategoria, p.genero].filter(Boolean).join(" · ")}</p></div>`;
    if ($(".th")) $(".th").onclick = e => { const b = e.target.closest("button"); if (b) $("#big").innerHTML = big(+b.dataset.i) };
    const t = $("#t"), n = $("#n"), mx = () => p.stock && p.stock[t.value] != null ? p.stock[t.value] : 99;
    const up = () => { if (!t.value) { $("#st").textContent = "Sin stock por el momento."; return } n.max = mx(); n.value = Math.min(Math.max(+n.value || 1, 1), mx()); $("#st").textContent = mx() < 99 ? `Stock disponible: ${mx()}` : "" };
    t.onchange = n.onchange = up; $("#m").onclick = () => { n.value = +n.value - 1; up() }; $("#pl").onclick = () => { n.value = +n.value + 1; up() }; up();
    const it = () => ({ n: p.nombre, t: t.value, c: $("#c").value, q: +n.value, p: p.precio });
    $("#ad").onclick = () => t.value && T.add(p, t.value, $("#c").value, +n.value);
    $("#wp").onclick = () => t.value && window.open(T.wa(T.line(it())), "_blank");
    const rel = ps.filter(x => x.id !== p.id).sort((a, b) => (b.categoria === p.categoria) - (a.categoria === p.categoria) || (b.subcategoria === p.subcategoria) - (a.subcategoria === p.subcategoria)).slice(0, 4);
    $("#rel").innerHTML = rel.map(T.card).join(""); $("#rh").hidden = !rel.length;
})();
