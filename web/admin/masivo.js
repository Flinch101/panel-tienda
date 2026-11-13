/* Carga masiva de productos. Se carga después de admin.js y usa sus variables (data, cfg, set, snap, SZ, CATS…).
   Flujo: subís varias fotos -> las agrupás por producto/color -> completás los datos -> confirmás.
   Recién al confirmar se pasan a WebP (máx. 1200 px) y se suben a GitHub en UN solo commit; después se agregan los productos a la tabla. */
(() => {
  const bk = $("#bk"), B = { fotos: [], prods: [], sel: new Set(), n: 0, ult: null, busy: false };
  const est = (t, bad) => { const e = $("#bk-st"); e.textContent = t; e.className = bad ? "err" : "" };
  const colK = k => COLS.find(c => c.k === k);
  const opts = (a, v) => a.map(o => `<option${o === v ? " selected" : ""}>${o}</option>`).join("");
  const nv = m => ({ color: "", st: Object.fromEntries(SZ.map(s => [s, m ? m.st[s] : ""])), fotos: [] });
  const elegidas = () => B.fotos.filter(f => B.sel.has(f.id));
  const etq = f => `P${B.prods.indexOf(f.d) + 1} · ${f.v.color || "sin color"}`;
  const pool = async (xs, n, fn) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) await fn(xs[i++]) })) };

  /* ---------- GitHub (un solo commit para todas las fotos) ---------- */
  const ghj = async (ruta, o = {}) => {
    const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${ruta}`, { method: o.method, headers: H(), body: o.body && JSON.stringify(o.body) });
    if (!r.ok) throw r.status; return r.json();
  };
  async function commitFotos(tree, n) {
    const ref = await ghj(`git/ref/heads/${cfg.branch}`), base = await ghj(`git/commits/${ref.object.sha}`);
    const t = await ghj("git/trees", { method: "POST", body: { base_tree: base.tree.sha, tree } });
    const c = await ghj("git/commits", { method: "POST", body: { message: `Fotos de ${n} producto(s)`, tree: t.sha, parents: [ref.object.sha] } });
    await ghj(`git/refs/heads/${cfg.branch}`, { method: "PATCH", body: { sha: c.sha } });
  }

  /* ---------- imágenes ---------- */
  async function aCanvas(file, max) {
    const b = await createImageBitmap(file), k = Math.min(1, max / Math.max(b.width, b.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b.width * k)); c.height = Math.max(1, Math.round(b.height * k));
    c.getContext("2d").drawImage(b, 0, 0, c.width, c.height); b.close && b.close(); return c;
  }
  const miniatura = async f => { const c = await aCanvas(f, 220); return URL.createObjectURL(await new Promise(r => c.toBlob(r, "image/webp", .7))) };
  async function aWebp(file) {
    const c = await aCanvas(file, 1200), d = c.toDataURL("image/webp", .82), ok = d.startsWith("data:image/webp");
    return { ext: ok ? "webp" : "jpg", b64: (ok ? d : c.toDataURL("image/jpeg", .82)).split(",")[1] };
  }

  /* ---------- borradores ---------- */
  function nuevoDraft(u = B.prods[B.prods.length - 1]) {
    const d = { nombre: "", subtitulo: "", modelo: "", mas: false, vars: [], categoria: "remeras", subcategoria: "", marca: "", genero: "unisex", estado: "Borrador", precio: "", descripcionCorta: "", descripcion: "", cuotasCant: "", cuotasDet: "" };
    if (u) ["categoria", "subcategoria", "marca", "genero", "estado", "precio", "descripcionCorta", "descripcion", "cuotasCant", "cuotasDet"].forEach(k => d[k] = u[k]);   // copia los datos comunes del anterior
    d.vars.push(nv(u && u.vars[0])); B.prods.push(d); return d;
  }
  const soltar = f => { if (f.v) f.v.fotos = f.v.fotos.filter(x => x !== f); f.v = f.d = null };
  function asignar(fs, d, v) { fs.forEach(f => { soltar(f); v.fotos.push(f); f.v = v; f.d = d }); B.sel.clear(); renderIzq(); renderDer() }
  function asignarIds() {                              // mismos códigos que daría nuevoId(), pero para todo el lote
    const n = {}; return B.prods.map(d => { const c = d.categoria; if (n[c] == null) n[c] = Math.max(0, ...(data[c] || []).map(p => +String(p.id).slice(3) || 0)); return PRE[c] + (++n[c]) });
  }
  function armar(d, id) {
    const p = { id, nombre: d.nombre.trim(), subtitulo: d.subtitulo.trim(), descripcionCorta: d.descripcionCorta.trim(), descripcion: d.descripcion, categoria: d.categoria, subcategoria: d.subcategoria.trim(), marca: d.marca.trim(), modelo: d.modelo.trim(), genero: d.genero, estado: d.estado, fechaPublicacion: "", precio: null, cuotas: { tiene: false, cantidad: 0, detalle: "" }, fotos: [], variantes: [] }, R = { p, v: null };
    set(R, colK("precio"), d.precio); set(R, colK("cuotasCant"), d.cuotasCant); set(R, colK("cuotasDet"), d.cuotasDet);
    p.variantes = d.vars.map(v => ({ color: v.color.trim(), stock: Object.fromEntries(SZ.filter(s => v.st[s].trim() !== "").map(s => [s, +v.st[s]])), fotos: v.fotos.map(f => f.name) }));
    return p;
  }
  function validar() {
    if (!B.prods.length) return { m: "Todavía no armaste ningún producto." };
    for (let i = 0; i < B.prods.length; i++) {
      const d = B.prods[i], P = `[data-p="${i}"]`, R = { p: {}, v: null }, pre = `Producto ${i + 1}: `;
      if (!d.nombre.trim()) return { s: P + '[data-k="nombre"]', m: pre + "falta el nombre." };
      if (!set(R, colK("precio"), d.precio) || R.p.precio == null) return { s: P + '[data-k="precio"]', m: pre + "falta el precio o no es válido." };
      if (!/^\d*$/.test(d.cuotasCant.trim())) { d.mas = true; return { s: P + '[data-k="cuotasCant"]', m: pre + "las cuotas deben ser un número." } }
      const vistos = new Set();
      for (let j = 0; j < d.vars.length; j++) {
        const v = d.vars[j], Q = P + `[data-v="${j}"]`, k = slug(v.color);
        if (!v.color.trim()) return { s: Q + '[data-k="color"]', m: pre + "falta el nombre de un color." };
        if (vistos.has(k)) return { s: Q + '[data-k="color"]', m: pre + `el color “${v.color}” está repetido.` };
        vistos.add(k);
        const s = SZ.find(s => !/^\d*$/.test(v.st[s].trim())); if (s) return { s: Q + `[data-s="${s}"]`, m: pre + `el stock de ${v.color} (${s}) debe ser un número.` };
      }
    }
    return null;
  }

  /* ---------- pantalla ---------- */
  function renderIzq() {
    const vis = B.fotos.filter(f => !$("#bk-solo").checked || !f.v);
    $("#bk-th").innerHTML = vis.map(f => `<button type="button" class="bk-f${B.sel.has(f.id) ? " on" : ""}${f.v ? " as" : ""}${f.er ? " er" : ""}" data-f="${f.id}" title="${esc(f.file.name)}"><img src="${f.th}" alt="">${f.v ? `<span class="bk-b">${esc(etq(f))}</span>` : ""}</button>`).join("")
      || `<p class="mi" style="grid-column:1/-1">${B.fotos.length ? "No quedan fotos sin asignar." : "Todavía no cargaste fotos. Tocá “Agregar fotos” o arrastralas acá."}</p>`;
    pintarSel();
  }
  function pintarSel() {
    document.querySelectorAll("#bk-th button[data-f]").forEach(b => b.classList.toggle("on", B.sel.has(+b.dataset.f)));
    $("#bk-sel").textContent = `${B.fotos.length} fotos · ${B.fotos.filter(f => !f.v).length} sin asignar · ${B.sel.size} elegidas (Shift para elegir un rango)`;
    $("#bk-crear").disabled = !B.sel.size; $("#bk-quitar").disabled = !B.sel.size;
    document.querySelectorAll("#bk .bk-asig").forEach(b => { b.disabled = !B.sel.size; b.textContent = B.sel.size ? `← Asignar ${B.sel.size}` : "← Asignar" });
  }
  const htmlV = (i, v, j) => `<div class="bk-v"><input data-p="${i}" data-v="${j}" data-k="color" placeholder="Color *" value="${esc(v.color)}">
    <div class="bk-st">${SZ.map(s => `<input data-p="${i}" data-v="${j}" data-s="${s}" value="${esc(v.st[s])}" placeholder="${s}" inputmode="numeric" title="Stock ${s} (vacío = no tiene ese talle, 0 = agotado)">`).join("")}</div>
    <div class="bk-fs">${v.fotos.map(f => `<span class="bk-m"><img src="${f.th}" alt=""><button type="button" data-x="unf" data-f="${f.id}" title="Sacar esta foto">×</button></span>`).join("") || '<span class="mut">sin fotos</span>'}</div>
    <div class="bk-vb"><button type="button" class="alt bk-asig" data-x="asig" data-p="${i}" data-v="${j}">← Asignar</button><button type="button" class="alt" data-x="delv" data-p="${i}" data-v="${j}" title="Quitar este color">✕</button></div></div>`;
  function htmlP(d, i) {
    const f = (k, t, ex = "") => `<label>${t}<input data-p="${i}" data-k="${k}" value="${esc(d[k])}" ${ex}></label>`;
    const s = (k, t, a) => `<label>${t}<select data-p="${i}" data-k="${k}">${opts(a, d[k])}</select></label>`;
    return `<article class="bk-p"><header><b>Producto ${i + 1}</b><span class="mi">${esc(d.nombre)}</span><span class="bk-hb"><button type="button" class="alt" data-x="dupp" data-p="${i}">⧉ Duplicar datos</button><button type="button" class="alt" data-x="delp" data-p="${i}">✕</button></span></header>
      <div class="bk-g">${f("nombre", "Nombre *")}${f("precio", "Precio *", 'inputmode="decimal"')}${s("categoria", "Categoría", CATS)}${f("subcategoria", "Subcategoría")}${f("marca", "Marca")}${f("modelo", "Modelo")}${s("genero", "Género", GEN)}${s("estado", "Estado", EST)}${f("subtitulo", "Subtítulo")}${f("descripcionCorta", "Desc. corta (junto al precio)")}</div>
      <details data-p="${i}"${d.mas ? " open" : ""}><summary>Descripción completa y cuotas</summary>
        <label>Descripción completa<textarea rows="3" data-p="${i}" data-k="descripcion">${esc(d.descripcion)}</textarea></label>
        <div class="bk-g">${f("cuotasCant", "Cuotas", 'inputmode="numeric"')}${f("cuotasDet", "Detalle de cuotas")}</div></details>
      ${d.vars.map((v, j) => htmlV(i, v, j)).join("")}
      <button type="button" class="alt" data-x="addv" data-p="${i}">+ Color</button></article>`;
  }
  function renderDer() {
    $("#bk-ps").innerHTML = B.prods.map(htmlP).join("") || `<p class="mi" style="margin:14px 0">Elegí fotos a la izquierda y tocá “Crear producto con las elegidas”.</p>`; pintarSel();
  }
  const foco = (sel) => { const el = $("#bk-ps").querySelector(sel); if (el) { el.scrollIntoView({ block: "center" }); el.focus() } };

  async function agregar(fs) {
    fs = fs.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(f.name))
      .filter(f => !B.fotos.some(x => x.file.name === f.name && x.file.size === f.size && x.file.lastModified === f.lastModified))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
    let mal = 0;
    for (const [i, file] of fs.entries()) {
      est(`Cargando fotos… ${i + 1} de ${fs.length}`);
      try { B.fotos.push({ id: ++B.n, file, th: await miniatura(file), v: null, d: null, sha: "", ext: "", name: "", er: false }) } catch (e) { mal++ }
      if (i % 6 === 5) renderIzq();
    }
    renderIzq(); est(mal ? `${mal} archivo(s) no se pudieron leer (¿HEIC u otro formato raro?).` : fs.length ? `${fs.length} foto(s) agregadas.` : "", !!mal);
  }

  /* ---------- eventos ---------- */
  $("#masivo").onclick = () => { endEdit(true); bk.showModal(); renderIzq(); renderDer() };
  $("#bk-x").onclick = () => bk.close();
  $("#bk-file").onchange = e => { const fs = [...e.target.files]; e.target.value = ""; agregar(fs) };
  $("#bk-izq").ondragover = e => e.preventDefault();
  $("#bk-izq").ondrop = e => { e.preventDefault(); agregar([...e.dataTransfer.files]) };
  $("#bk-solo").onchange = renderIzq;
  $("#bk-todas").onclick = () => { B.fotos.filter(f => !f.v).forEach(f => B.sel.add(f.id)); pintarSel() };
  $("#bk-th").onclick = e => {
    const b = e.target.closest("button[data-f]"); if (!b) return; const id = +b.dataset.f;
    const vis = [...document.querySelectorAll("#bk-th button[data-f]")].map(x => +x.dataset.f);
    if (e.shiftKey && B.ult != null && vis.includes(B.ult)) { const a = vis.indexOf(B.ult), z = vis.indexOf(id); vis.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(i => B.sel.add(i)) }
    else B.sel.has(id) ? B.sel.delete(id) : B.sel.add(id);
    B.ult = id; pintarSel();
  };
  $("#bk-crear").onclick = () => {
    if (!B.sel.size) return est("Elegí primero las fotos de la izquierda.", 1);
    const d = nuevoDraft(); asignar(elegidas(), d, d.vars[0]); est(""); foco(`[data-p="${B.prods.length - 1}"][data-k="nombre"]`);
  };
  $("#bk-quitar").onclick = () => {
    elegidas().forEach(f => { soltar(f); URL.revokeObjectURL(f.th); B.fotos.splice(B.fotos.indexOf(f), 1) });
    B.sel.clear(); renderIzq(); renderDer();
  };
  $("#bk-np").onclick = () => { nuevoDraft(); renderDer(); foco(`[data-p="${B.prods.length - 1}"][data-k="nombre"]`) };
  $("#bk-ps").addEventListener("toggle", e => { const t = e.target; if (t.tagName === "DETAILS") B.prods[+t.dataset.p].mas = t.open }, true);
  $("#bk-ps").addEventListener("input", e => {
    const t = e.target, i = t.dataset.p; if (i == null || t.tagName === "DETAILS") return; const d = B.prods[+i]; t.classList.remove("bad");
    if (t.dataset.s) d.vars[+t.dataset.v].st[t.dataset.s] = t.value;
    else if (t.dataset.k === "color") d.vars[+t.dataset.v].color = t.value;
    else d[t.dataset.k] = t.value;
  });
  $("#bk-ps").addEventListener("change", e => { const k = e.target.dataset.k; if (k === "color") renderIzq(); if (k === "nombre") e.target.closest("article").querySelector("header .mi").textContent = e.target.value });
  $("#bk-ps").addEventListener("click", e => {
    const b = e.target.closest("button[data-x]"); if (!b) return; const x = b.dataset.x, i = +b.dataset.p, d = B.prods[i], j = +b.dataset.v;
    if (x === "asig") { if (B.sel.size) asignar(elegidas(), d, d.vars[j]) }
    else if (x === "unf") { soltar(B.fotos.find(f => f.id === +b.dataset.f)); renderIzq(); renderDer() }
    else if (x === "addv") { d.vars.push(nv(d.vars[d.vars.length - 1])); renderDer(); foco(`[data-p="${i}"][data-v="${d.vars.length - 1}"][data-k="color"]`) }
    else if (x === "delv") { if (d.vars.length < 2) return est("Un producto necesita al menos un color.", 1); d.vars[j].fotos.slice().forEach(soltar); d.vars.splice(j, 1); renderIzq(); renderDer() }
    else if (x === "dupp") { nuevoDraft(d); renderDer(); foco(`[data-p="${B.prods.length - 1}"][data-k="nombre"]`) }
    else if (x === "delp") {
      const fs = d.vars.flatMap(v => v.fotos); if ((fs.length || d.nombre) && !confirm("¿Quitar este producto del lote? Sus fotos vuelven a quedar sin asignar.")) return;
      fs.forEach(soltar); B.prods.splice(i, 1); renderIzq(); renderDer();
    }
  });
  $("#bk-desc").onclick = () => {
    if ((B.fotos.length || B.prods.length) && !confirm("¿Descartar todas las fotos y productos de este lote? (Nada se subió todavía.)")) return;
    B.fotos.forEach(f => URL.revokeObjectURL(f.th)); B.fotos = []; B.prods = []; B.sel.clear(); est(""); renderIzq(); renderDer();
  };

  /* ---------- confirmar: recién acá se convierte y se sube todo ---------- */
  $("#bk-ok").onclick = async () => {
    if (B.busy) return;
    if (!cfg.token) return est("Primero conectate con GitHub (sección “Conexión con GitHub” de la página).", 1);
    const err = validar();
    if (err) { est(err.m, 1); renderDer(); const el = err.s && $("#bk-ps").querySelector(err.s); if (el) { el.classList.add("bad"); el.scrollIntoView({ block: "center" }); el.focus() } return }
    const fs = B.prods.flatMap(d => d.vars.flatMap(v => v.fotos)), sin = B.fotos.filter(f => !f.v).length, sf = B.prods.flatMap(d => d.vars).filter(v => !v.fotos.length).length;
    const av = [sin && `${sin} foto(s) sin asignar NO se van a subir`, sf && `${sf} color(es) van a quedar sin fotos`].filter(Boolean);
    if (!confirm(`Vas a crear ${B.prods.length} producto(s) con ${fs.length} foto(s).\n\nLas fotos se pasan a WebP y se suben a GitHub en un solo commit.` + (av.length ? `\n\nAtención: ${av.join("; ")}.` : "") + "\n\n¿Confirmar?")) return;
    B.busy = true; $("#bk-ok").disabled = true;
    const prog = $("#bk-prog"), pend = fs.filter(f => !f.sha), ids = asignarIds(); let hechas = 0, fallas = 0;
    try {
      prog.hidden = false; prog.max = Math.max(1, pend.length); prog.value = 0;
      await pool(pend, 3, async f => {
        try { const w = await aWebp(f.file); f.sha = (await ghj("git/blobs", { method: "POST", body: { content: w.b64, encoding: "base64" } })).sha; f.ext = w.ext; f.er = false }
        catch (e) { f.er = true; fallas++ }
        prog.value = ++hechas; est(`Subiendo fotos… ${hechas} de ${pend.length}`);
      });
      renderIzq();
      if (fallas) throw new Error(`${fallas} foto(s) no se pudieron subir (en rojo a la izquierda). No se creó ningún producto: tocá Confirmar para reintentar; las que ya subieron no se repiten.`);
      const tree = [];
      B.prods.forEach((d, i) => d.vars.forEach(v => v.fotos.forEach((f, k) => { f.name = `${ids[i]}-${slug(v.color)}-${k + 1}.${f.ext}`; tree.push({ path: "fotos/" + f.name, mode: "100644", type: "blob", sha: f.sha }) })));
      if (tree.length) { est("Creando el commit de fotos…"); await commitFotos(tree, B.prods.length) }
      const ps = B.prods.map((d, i) => armar(d, ids[i]));
      snap(); ps.forEach(p => { (data[p.categoria] = data[p.categoria] || []).push(p); nuevos.add(p) });
      B.fotos.forEach(f => URL.revokeObjectURL(f.th)); B.fotos = []; B.prods = []; B.sel.clear(); est(""); renderIzq(); renderDer();
      dirty(); calc(); renderAll(); irA(x => x.p === ps[0] && !x.v, 1); bk.close();
      const pub = $("#bk-pub").checked;
      msg(`Se subieron ${tree.length} foto(s) y se agregaron ${ps.length} producto(s).` + (pub ? " Publicando…" : " Falta “Publicar cambios (commit)” para que se vean en la tienda."));
      if (pub) await $("#pub").onclick();
    } catch (e) { est(typeof e === "number" ? `Error de GitHub (${e}). Revisá el token (permiso Contents: read/write), usuario, repositorio y rama.` : e.message, 1) }
    finally { B.busy = false; $("#bk-ok").disabled = false; prog.hidden = true }
  };
})();
