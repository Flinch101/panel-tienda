(async () => {
    const $ = s => document.querySelector(s), q = new URLSearchParams(location.search), id = q.get("id"), ps = await T.load(), p = ps.find(x => x.id === id);
    if (!p) { $("#pd").innerHTML = `<p>No encontramos este producto. <a href="../productos/">Ver todos los productos</a></p>`; $("#rh").hidden = true; return }
    document.title = p.nombre;
    const attr = T.attr, esc = s => String(s || "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\r/g, "");
    const vs = T.vars(p), cs = vs.map(v => v.color), unico = cs.length === 1 && cs[0] === "Único";
    const stockDe = c => T.sz(p, c).length > 0;
    let col = cs.includes(q.get("color")) ? q.get("color") : cs.find(stockDe) || cs[0], tal = "";
    const variante = () => vs.find(v => v.color === col);

    /* ---------- fotos: TODAS las del producto (de todos los colores), el color elegido primero, después los que tienen stock, después los agotados y al final las generales ---------- */
    const items = (() => {
        const out = [], vistas = new Set(), add = (f, c) => { const k = String(f).split("/").pop().toLowerCase(); if (!vistas.has(k)) { vistas.add(k); out.push({ f, c }) } };
        [col, ...cs.filter(c => c !== col && stockDe(c)), ...cs.filter(c => c !== col && !stockDe(c))].forEach(c => (vs.find(v => v.color === c).fotos || []).forEach(f => add(f, c)));
        (p.fotos || []).forEach(f => add(f, null));
        return out.length ? out : [{ f: null, c: null }];
    })();
    const real = items[0].f !== null, multi = items.length > 1;
    const tag = (it, extra) => `<img src="${T.src(it.f)}" data-f="${attr(it.f && !/^http/.test(it.f) ? it.f : "")}" onerror="T.fe(this)" draggable="false" ${extra}>`;
    const galHtml = () => `<div class="gal${multi ? "" : " solo"}">${multi ? `<div class="gt"><div class="gi" id="gi" role="tablist">${items.map((it, i) => `<button type="button" class="gb${i ? "" : " on"}" data-i="${i}" role="tab" aria-label="Ver foto ${i + 1}${it.c && !unico ? " (" + attr(it.c) + ")" : ""}" aria-selected="${!i}" title="${unico ? "" : attr(it.c || "")}">${tag(it, 'alt="" width="150" height="200" loading="lazy" decoding="async"')}</button>`).join("")}</div></div>` : ""}
<div class="gs"><div class="gv${real ? " zm" : ""}" id="gv" tabindex="0" aria-label="Fotos de ${attr(p.nombre)}">${tag(items[0], `id="gm" alt="${attr(p.nombre)}" width="600" height="800" fetchpriority="high" decoding="async"`)}
${multi ? `<button type="button" class="gn prev" aria-label="Foto anterior">‹</button><button type="button" class="gn next" aria-label="Foto siguiente">›</button><span class="gc" id="gc">1 / ${items.length}</span>` : ""}${real ? `<span class="gh"><span class="hm">Pasá el mouse para hacer zoom</span><span class="ht">Mantené el dedo para hacer zoom</span></span>` : ""}${unico ? "" : `<span class="gk" id="gk"></span>`}</div></div></div>`;
    let galKey = null, i = 0, ir = () => { };
    const etiqueta = () => { const e = $("#gk"); if (e) e.textContent = items[i].c || col };
    function galInit(alCambiar) {
        const v = $("#gv"), im = $("#gm"), gi = $("#gi"), n = items.length; let tk = 0;
        const org = (x, y) => { const r = v.getBoundingClientRect(); im.style.transformOrigin = `${Math.min(100, Math.max(0, (x - r.left) / r.width * 100))}% ${Math.min(100, Math.max(0, (y - r.top) / r.height * 100))}%` };
        ir = k => {
            k = (k + n) % n; if (k === i) return; i = k; const my = ++tk; v.classList.remove("z");
            im.style.opacity = 0;
            setTimeout(() => { if (my !== tk) return; T.setImg(im, items[i].f); im.style.transformOrigin = "50% 50%"; im.style.opacity = 1 }, 140);
            gi.querySelectorAll(".gb").forEach((b, j) => { b.classList.toggle("on", j === i); b.setAttribute("aria-selected", j === i) });
            const b = gi.children[i], vert = gi.scrollHeight > gi.clientHeight + 2 && getComputedStyle(gi).flexDirection === "column";
            if (vert) gi.scrollTo({ top: b.offsetTop - (gi.clientHeight - b.offsetHeight) / 2, behavior: "smooth" }); else gi.scrollTo({ left: b.offsetLeft - (gi.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
            $("#gc").textContent = `${i + 1} / ${n}`; alCambiar(items[i]); etiqueta();
        };
        document.removeEventListener("keydown", galKey); galKey = null;
        if (multi) {
            items.forEach(it => { const a = new Image(); a.src = T.src(it.f) });            // precarga: el cambio es instantáneo
            gi.onclick = e => { const b = e.target.closest(".gb"); if (b) ir(+b.dataset.i) };
            v.querySelector(".prev").onclick = () => ir(i - 1); v.querySelector(".next").onclick = () => ir(i + 1);
            galKey = e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === "ArrowLeft") ir(i - 1); if (e.key === "ArrowRight") ir(i + 1) };
            document.addEventListener("keydown", galKey);
        }
        if (!real) return;
        /* mouse: el zoom sigue al puntero, siempre dentro del marco */
        v.addEventListener("pointerenter", e => { if (e.pointerType === "touch") return; org(e.clientX, e.clientY); v.classList.add("z") });
        v.addEventListener("pointermove", e => { if (e.pointerType !== "touch" && v.classList.contains("z")) org(e.clientX, e.clientY) });
        v.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") v.classList.remove("z") });
        /* dedo: mantener apretado = zoom que sigue al dedo; deslizar rápido a los costados = cambiar de foto; deslizar hacia arriba/abajo = scroll normal */
        let tm = 0, ts = null, act = false;
        const off = () => { clearTimeout(tm); if (act) { act = false; v.classList.remove("z") } };
        v.addEventListener("touchstart", e => { if (e.touches.length > 1) { off(); ts = null; return } const t = e.touches[0]; ts = { x: t.clientX, y: t.clientY }; act = false; clearTimeout(tm); tm = setTimeout(() => { act = true; org(ts.x, ts.y); v.classList.add("z") }, 220) }, { passive: true });
        v.addEventListener("touchmove", e => { const t = e.touches[0]; if (act) { e.preventDefault(); org(t.clientX, t.clientY) } else if (ts && Math.hypot(t.clientX - ts.x, t.clientY - ts.y) > 10) clearTimeout(tm) }, { passive: false });
        v.addEventListener("touchend", e => {
            const was = act; clearTimeout(tm); if (act) { act = false; v.classList.remove("z") }
            if (!was && ts && multi) { const t = e.changedTouches[0], dx = t.clientX - ts.x, dy = t.clientY - ts.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(i + (dx < 0 ? 1 : -1)) }
            ts = null;
        });
        v.addEventListener("touchcancel", () => { off(); ts = null });
        v.addEventListener("contextmenu", e => { if (act || matchMedia("(hover:none)").matches) e.preventDefault() });
    }

    /* ---------- ficha ---------- */
    $("#pd").innerHTML = `${galHtml()}
<div class="inf"><h1>${p.nombre}</h1><p>${p.subtitulo || ""}</p><p class="pr">${T.money(p.precio)}</p><p>${p.descripcionCorta || ""}</p>${p.cuotas && p.cuotas.tiene ? `<p><b>${p.cuotas.detalle || p.cuotas.cantidad + " cuotas"}</b></p>` : ""}
${unico ? "" : `<div class="opt"><div class="ol">Color: <b id="colnom"></b></div><div class="pl" id="cp"></div></div>`}
<div class="opt"><div class="ol">Talle: <b id="tn"></b></div><div class="pl" id="tp"></div></div>
<label>Cantidad<span class="q"><button id="m" aria-label="Menos">−</button><input id="n" type="number" value="1" min="1"><button id="pl" aria-label="Más">+</button></span></label><p id="st"></p>
<button class="b" id="ad">Agregar al carrito</button><button class="b alt" id="wp">Pedir por WhatsApp</button>
<h2>Descripción</h2><div class="desc" style="white-space:pre-wrap">${esc(p.descripcion)}</div><p class="meta">${[p.marca, p.modelo, p.subcategoria, p.genero].filter(Boolean).join(" · ")}</p></div>`;

    const n = $("#n"), mx = () => tal ? T.stk(p, col, tal) : 0;
    /* todos los colores se ven siempre; el que no tiene stock queda "apagado" pero se puede tocar para conocerlo */
    const pintarColores = () => { if (unico) return; $("#colnom").textContent = col; $("#cp").innerHTML = cs.map(c => `<button type="button" class="pill${c === col ? " on" : ""}${stockDe(c) ? "" : " ns"}" data-c="${attr(c)}" aria-pressed="${c === col}" title="${stockDe(c) ? "" : "Sin stock (solo para ver)"}">${esc(c)}</button>`).join("") };
    /* todos los talles (S a XXL y los extra que tenga el color) se ven siempre; los que no hay quedan apagados y sin clic */
    const pintarTalles = () => {
        const v = variante(), hay = t => v.stock[t] != null && v.stock[t] !== 0, todos = T.ord([...T.TL, ...Object.keys(v.stock)]), libres = todos.filter(hay);
        if (!libres.includes(tal)) tal = libres[0] || "";
        $("#tn").textContent = tal || "—"; $("#tp").innerHTML = todos.map(t => `<button type="button" class="pill${t === tal ? " on" : ""}" data-t="${t}" ${hay(t) ? "" : `disabled title="${v.stock[t] === 0 ? "Agotado" : "No disponible en este color"}"`}>${t}</button>`).join("");
    };
    const up = () => {
        $("#ad").disabled = $("#wp").disabled = !tal;
        if (!tal) { $("#st").textContent = stockDe(col) ? "" : "Sin stock por el momento: este color es solo para que lo conozcas."; return }
        n.max = mx(); n.value = Math.min(Math.max(+n.value || 1, 1), mx()); $("#st").textContent = mx() < 99 ? `Stock disponible: ${mx()}` : "";
    };
    const ponerColor = c => { col = c; pintarColores(); pintarTalles(); up(); etiqueta(); try { history.replaceState(null, "", `?id=${encodeURIComponent(p.id)}&color=${encodeURIComponent(col)}`) } catch (e) { } };
    const elegirColor = c => {                                 // desde los botones de color: salta a la primera foto de ese color
        if (c === col) return; ponerColor(c);
        const k = items.findIndex(it => it.c === c); if (k >= 0) ir(k);
    };
    galInit(it => { if (it.c && it.c !== col) ponerColor(it.c) });   // desde las miniaturas: si la foto es de otro color, se elige ese color
    pintarColores(); pintarTalles(); up(); etiqueta();
    document.querySelector(".inf").addEventListener("click", e => {
        const b = e.target.closest(".pill"); if (!b || b.disabled) return;
        if (b.dataset.c != null) elegirColor(b.dataset.c); else if (b.dataset.t) { tal = b.dataset.t; pintarTalles(); up() }
    });
    n.onchange = up; $("#m").onclick = () => { n.value = +n.value - 1; up() }; $("#pl").onclick = () => { n.value = +n.value + 1; up() };
    const it = () => ({ n: p.nombre, t: tal, c: col, q: +n.value, p: p.precio });
    $("#ad").onclick = () => tal && T.add(p, tal, col, +n.value);
    $("#wp").onclick = () => tal && window.open(T.wa(T.line(it())), "_blank");
    const rel = ps.filter(x => x.id !== p.id).sort((a, b) => (b.categoria === p.categoria) - (a.categoria === p.categoria) || (b.subcategoria === p.subcategoria) - (a.subcategoria === p.subcategoria));
    const rel4 = T.primerosConStock(rel).slice(0, 4);
    $("#rel").innerHTML = rel4.map(x => T.card(x)).join(""); $("#rh").hidden = !rel4.length;
})();
