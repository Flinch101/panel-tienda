(async () => {
    const ps = await T.load(), $ = s => document.querySelector(s), f = $("#f2"), q = new URLSearchParams(location.search);
    const CATS = ["conjuntos", "remeras", "shorts", "buzos", "pantalones"], SZ = ["S", "M", "L", "XL", "XXL"];
    const cols = [...new Set(ps.flatMap(p => T.cols(p)))].sort();
    const chk = (n, a, on) => a.map(v => `<label><input type="checkbox" name="${n}" value="${v}" ${v === on ? "checked" : ""}> ${v}</label>`).join("");
    $("#fc").innerHTML = chk("cat", CATS, q.get("cat")); $("#ft").innerHTML = chk("t", SZ); $("#fk").innerHTML = chk("col", cols);
    function r() {
        const v = n => [...f.querySelectorAll(`[name=${n}]:checked`)].map(i => i.value);
        const c = v("cat"), t = v("t"), k = v("col"), mn = +f.pmin.value || 0, mx = +f.pmax.value || 1e9, s = (q.get("q") || "").toLowerCase();
        const ok = p => T.vars(p).filter(v => (!k.length || k.includes(v.color)) && (!t.length || Object.keys(v.stock).some(x => t.includes(x) && v.stock[x] !== 0)));
        const l = ps.filter(p => (!c.length || c.includes(p.categoria)) && ok(p).length && p.precio >= mn && p.precio <= mx && (!s || [p.nombre, p.subtitulo, p.marca, p.modelo, p.subcategoria].join(" ").toLowerCase().includes(s)));
        /* primero lo que tiene stock (en la foto también: se elige un color con stock y, si se puede, con fotos propias); lo agotado va al final */
        const hay = (p, v) => T.sz(p, v.color).length > 0;
        const enStock = p => ok(p).some(v => hay(p, v));
        const mejor = p => { const o = ok(p); return (o.find(v => hay(p, v) && v.fotos.length) || o.find(v => hay(p, v)) || o.find(v => v.fotos.length) || o[0]).color };
        $("#g").innerHTML = [...l].sort((a, b) => enStock(b) - enStock(a)).map(p => T.card(p, mejor(p))).join("") || "<p>No hay productos con esos filtros.</p>";
    }
    f.oninput = r; r();
})();
