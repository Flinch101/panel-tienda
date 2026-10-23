(async () => {
    const ps = await T.load(), $ = s => document.querySelector(s), f = $("#f2"), q = new URLSearchParams(location.search);
    const CATS = ["conjuntos", "remeras", "shorts", "buzos", "pantalones"], SZ = ["S", "M", "L", "XL", "XXL"];
    const cols = [...new Set(ps.flatMap(p => p.colores))].sort();
    const chk = (n, a, on) => a.map(v => `<label><input type="checkbox" name="${n}" value="${v}" ${v === on ? "checked" : ""}> ${v}</label>`).join("");
    $("#fc").innerHTML = chk("cat", CATS, q.get("cat")); $("#ft").innerHTML = chk("t", SZ); $("#fk").innerHTML = chk("col", cols);
    function r() {
        const v = n => [...f.querySelectorAll(`[name=${n}]:checked`)].map(i => i.value);
        const c = v("cat"), t = v("t"), k = v("col"), mn = +f.pmin.value || 0, mx = +f.pmax.value || 1e9, s = (q.get("q") || "").toLowerCase();
        const l = ps.filter(p => (!c.length || c.includes(p.categoria)) && (!t.length || T.sz(p).some(x => t.includes(x))) && (!k.length || p.colores.some(x => k.includes(x))) && p.precio >= mn && p.precio <= mx && (!s || [p.nombre, p.subtitulo, p.marca, p.modelo, p.subcategoria].join(" ").toLowerCase().includes(s)));
        $("#g").innerHTML = l.map(T.card).join("") || "<p>No hay productos con esos filtros.</p>";
    }
    f.oninput = r; r();
})();
