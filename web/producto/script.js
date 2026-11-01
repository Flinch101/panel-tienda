(async () => {
    const $ = s => document.querySelector(s), q = new URLSearchParams(location.search), id = q.get("id"), ps = await T.load(), p = ps.find(x => x.id === id);
    if (!p) { $("#pd").innerHTML = `<p>No encontramos este producto. <a href="../productos/">Ver todos los productos</a></p>`; $("#rh").hidden = true; return }
    document.title = p.nombre;
    const R = document.body.dataset.root || "", attr = s => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const esc = s => String(s || "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\r/g, "");
    const fb = `this.onerror=null;this.src='${R}logo.png'`;
    const vs = T.vars(p), cs = vs.map(v => v.color), unico = cs.length === 1 && cs[0] === "Único";
    let col = cs.includes(q.get("color")) ? q.get("color") : cs.find(c => T.sz(p, c).length) || cs[0], tal = "";
    const variante = () => vs.find(v => v.color === col);
    const fotosCol = () => { const f = T.fotosDe(p, col); if (!f.length) f.push(null); return f };

    /* ---------- galería (fotos del color elegido) ---------- */
    const urlsDe = fs => fs.map(f => (T.img(f, "").match(/src="([^"]*)"/) || [])[1]);
    const galHtml = fs => {
        const urls = urlsDe(fs), multi = fs.length > 1, real = fs[0] !== null;
        return `<div class="gal${multi ? "" : " solo"}">${multi ? `<div class="gt"><div class="gi" id="gi" role="tablist">${urls.map((u, i) => `<button type="button" class="gb${i ? "" : " on"}" data-i="${i}" role="tab" aria-label="Ver foto ${i + 1}" aria-selected="${!i}"><img src="${u}" alt="" width="150" height="200" loading="lazy" decoding="async" draggable="false" onerror="${fb}"></button>`).join("")}</div></div>` : ""}
<div class="gs"><div class="gv${real ? " zm" : ""}" id="gv" tabindex="0" aria-label="Fotos de ${attr(p.nombre)}"><img id="gm" src="${urls[0]}" alt="${attr(p.nombre)}${unico ? "" : " - " + attr(col)}" width="600" height="800" fetchpriority="high" decoding="async" draggable="false" onerror="${fb}">
${multi ? `<button type="button" class="gn prev" aria-label="Foto anterior">‹</button><button type="button" class="gn next" aria-label="Foto siguiente">›</button><span class="gc" id="gc">1 / ${urls.length}</span>` : ""}${real ? `<span class="gh"><span class="hm">Pasá el mouse para hacer zoom</span><span class="ht">Mantené el dedo para hacer zoom</span></span>` : ""}${unico ? "" : `<span class="gk">${esc(col)}</span>`}</div></div></div>`;
    };
    let galKey = null;
    function galInit(fs) {
        const urls = urlsDe(fs), multi = fs.length > 1, real = fs[0] !== null;
        const v = $("#gv"), im = $("#gm"), gi = $("#gi"), n = urls.length; let i = 0, tk = 0;
        const org = (x, y) => { const r = v.getBoundingClientRect(); im.style.transformOrigin = `${Math.min(100, Math.max(0, (x - r.left) / r.width * 100))}% ${Math.min(100, Math.max(0, (y - r.top) / r.height * 100))}%` };
        const ir = k => {
            k = (k + n) % n; if (k === i) return; i = k; const my = ++tk; v.classList.remove("z");
            im.style.opacity = 0;
            setTimeout(() => { if (my !== tk) return; im.onerror = () => { im.onerror = null; im.src = R + "logo.png" }; im.src = urls[i]; im.style.transformOrigin = "50% 50%"; im.style.opacity = 1 }, 140);
            gi.querySelectorAll(".gb").forEach((b, j) => { b.classList.toggle("on", j === i); b.setAttribute("aria-selected", j === i) });
            const b = gi.children[i], vert = gi.scrollHeight > gi.clientHeight + 2 && getComputedStyle(gi).flexDirection === "column";
            if (vert) gi.scrollTo({ top: b.offsetTop - (gi.clientHeight - b.offsetHeight) / 2, behavior: "smooth" }); else gi.scrollTo({ left: b.offsetLeft - (gi.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
            $("#gc").textContent = `${i + 1} / ${n}`;
        };
        document.removeEventListener("keydown", galKey); galKey = null;
        if (multi) {
            urls.forEach(u => { const a = new Image(); a.src = u });            // precarga: el cambio es instantáneo
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
    $("#pd").innerHTML = `${galHtml(fotosCol())}
<div class="inf"><h1>${p.nombre}</h1><p>${p.subtitulo || ""}</p><p class="pr">${T.money(p.precio)}</p><p>${p.descripcionCorta || ""}</p>${p.cuotas && p.cuotas.tiene ? `<p><b>${p.cuotas.detalle || p.cuotas.cantidad + " cuotas"}</b></p>` : ""}
${unico ? "" : `<div class="opt"><div class="ol">Color: <b id="cn"></b></div><div class="pl" id="cp"></div></div>`}
<div class="opt"><div class="ol">Talle: <b id="tn"></b></div><div class="pl" id="tp"></div></div>
<label>Cantidad<span class="q"><button id="m" aria-label="Menos">−</button><input id="n" type="number" value="1" min="1"><button id="pl" aria-label="Más">+</button></span></label><p id="st"></p>
<button class="b" id="ad">Agregar al carrito</button><button class="b alt" id="wp">Pedir por WhatsApp</button>
<h2>Descripción</h2><div class="desc" style="white-space:pre-wrap">${esc(p.descripcion)}</div><p class="meta">${[p.marca, p.modelo, p.subcategoria, p.genero].filter(Boolean).join(" · ")}</p></div>`;
    galInit(fotosCol());

    const n = $("#n"), mx = () => tal ? T.stk(p, col, tal) : 0;
    const pintarColores = () => { if (unico) return; $("#cn").textContent = col; $("#cp").innerHTML = cs.map(c => `<button type="button" class="pill${c === col ? " on" : ""}${T.sz(p, c).length ? "" : " ns"}" data-c="${attr(c)}" aria-pressed="${c === col}" title="${T.sz(p, c).length ? "" : "Sin stock"}">${esc(c)}</button>`).join("") };
    const pintarTalles = () => {
        const v = variante(), todos = T.ord(Object.keys(v.stock)), libres = todos.filter(t => v.stock[t] !== 0);
        if (!libres.includes(tal)) tal = libres[0] || "";
        $("#tn").textContent = tal; $("#tp").innerHTML = todos.map(t => `<button type="button" class="pill${t === tal ? " on" : ""}" data-t="${t}" ${v.stock[t] === 0 ? 'disabled title="Agotado"' : ""}>${t}</button>`).join("") || `<span class="mut">Sin talles cargados</span>`;
    };
    const up = () => {
        $("#ad").disabled = $("#wp").disabled = !tal;
        if (!tal) { $("#st").textContent = "Sin stock por el momento."; return }
        n.max = mx(); n.value = Math.min(Math.max(+n.value || 1, 1), mx()); $("#st").textContent = mx() < 99 ? `Stock disponible: ${mx()}` : "";
    };
    const elegirColor = c => {
        if (c === col) return; col = c; pintarColores(); pintarTalles(); up();
        $(".gal").outerHTML = galHtml(fotosCol()); galInit(fotosCol());
        try { history.replaceState(null, "", `?id=${encodeURIComponent(p.id)}&color=${encodeURIComponent(col)}`) } catch (e) { }
    };
    pintarColores(); pintarTalles(); up();
    document.querySelector(".inf").addEventListener("click", e => {
        const b = e.target.closest(".pill"); if (!b || b.disabled) return;
        if (b.dataset.c != null) elegirColor(b.dataset.c); else if (b.dataset.t) { tal = b.dataset.t; pintarTalles(); up() }
    });
    n.onchange = up; $("#m").onclick = () => { n.value = +n.value - 1; up() }; $("#pl").onclick = () => { n.value = +n.value + 1; up() };
    const it = () => ({ n: p.nombre, t: tal, c: col, q: +n.value, p: p.precio });
    $("#ad").onclick = () => tal && T.add(p, tal, col, +n.value);
    $("#wp").onclick = () => tal && window.open(T.wa(T.line(it())), "_blank");
    const rel = ps.filter(x => x.id !== p.id).sort((a, b) => (b.categoria === p.categoria) - (a.categoria === p.categoria) || (b.subcategoria === p.subcategoria) - (a.subcategoria === p.subcategoria)).slice(0, 4);
    $("#rel").innerHTML = rel.map(x => T.card(x)).join(""); $("#rh").hidden = !rel.length;
})();
