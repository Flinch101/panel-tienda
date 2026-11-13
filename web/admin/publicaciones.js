/* Ver todas las publicaciones. Se carga después de admin.js y masivo.js.
   Muestra todos los productos ya cargados como tarjetas (igual que la carga masiva), con sus datos, colores, stock y fotos editables.
   Todo lo que se cambia acá pasa por las mismas funciones que la tabla (snap, set, dirty), así que se puede deshacer y se publica con el mismo botón. */
(() => {
  const pb = $("#pb"), LOTE = 30, uids = new WeakMap(), porUid = new Map();
  let n = 0, lim = LOTE, lista = [];
  const colK = k => COLS.find(c => c.k === k);
  const uid = p => { if (!uids.has(p)) { uids.set(p, ++n); porUid.set(n, p) } return uids.get(p) };
  const opts = (a, v) => a.map(o => `<option${o === v ? " selected" : ""}>${o}</option>`).join("");
  const aviso = (t, bad) => { const e = $("#pb-msg"); e.textContent = t || ""; e.className = "pb-msg" + (bad ? " err" : "") };
  const val = (p, k) => get({ p, v: null }, colK(k));

  function filtrar() {
    const q = norm($("#pb-s").value), fc = $("#pb-cat").value, fe = $("#pb-est").value;
    const orden = [...all().filter(p => !nuevos.has(p)), ...all().filter(p => nuevos.has(p))];
    lista = orden.filter(p => (!fc || p.categoria === fc) && (!fe || p.estado === fe) && (!q || norm([p.id, p.nombre, p.marca, p.modelo, p.subcategoria, p.subtitulo, ...p.variantes.map(v => v.color)].join(" ")).includes(q)));
  }
  const foto = (f, i, u, j) => `<span class="bk-m"><img src="${esc(fsrc(f))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" title="${esc(f)}"><button type="button" data-x="unf" data-u="${u}" data-v="${j}" data-i="${i}" title="Sacar esta foto del color">×</button></span>`;
  const fila = (u, v, j) => `<div class="bk-v"><input data-u="${u}" data-v="${j}" data-k="color" placeholder="Color *" value="${esc(v.color)}">
    <div class="bk-st">${SZ.map(s => `<input data-u="${u}" data-v="${j}" data-k="${s}" value="${esc(v.stock[s] != null ? v.stock[s] : "")}" placeholder="${s}" inputmode="numeric" title="Stock ${s} (vacío = no tiene ese talle, 0 = agotado)">`).join("")}</div>
    <div class="bk-fs">${v.fotos.map((f, i) => foto(f, i, u, j)).join("") || '<span class="mut">sin fotos</span>'}<button type="button" class="alt" data-x="fotos" data-u="${u}" data-v="${j}" title="Editar o subir fotos de este color">Fotos…</button></div>
    <div class="bk-vb"><button type="button" class="alt" data-x="dupv" data-u="${u}" data-v="${j}" title="Duplicar este color">⧉</button><button type="button" class="alt" data-x="delv" data-u="${u}" data-v="${j}" title="Quitar este color">✕</button></div></div>`;
  function tarjeta(p) {
    const u = uid(p);
    const f = (k, t, ex = "") => `<label>${t}<input data-u="${u}" data-k="${k}" value="${esc(val(p, k))}" ${ex}></label>`;
    const s = (k, t, a) => `<label>${t}<select data-u="${u}" data-k="${k}">${opts(a, val(p, k))}</select></label>`;
    const gen = (p.fotos || []).length;
    return `<article class="bk-p pb-p" data-u="${u}"><header><b>${esc(p.id)}</b><span class="chip ${esc(p.estado)}">${esc(p.estado)}</span><span class="mi">${esc(p.nombre)}</span><span class="bk-hb"><button type="button" class="alt" data-x="gen" data-u="${u}" title="Descripción completa y fotos generales">Descripción y fotos generales${gen ? " (" + gen + ")" : ""}</button><button type="button" class="alt" data-x="dup" data-u="${u}">⧉ Duplicar</button><button type="button" class="alt" data-x="del" data-u="${u}" title="Eliminar producto">✕</button></span></header>
      <div class="bk-g">${f("nombre", "Nombre *")}${f("precio", "Precio *", 'inputmode="decimal"')}${s("categoria", "Categoría", CATS)}${f("subcategoria", "Subcategoría")}${f("marca", "Marca")}${f("modelo", "Modelo")}${s("genero", "Género", GEN)}${s("estado", "Estado", EST)}${f("subtitulo", "Subtítulo")}${f("descripcionCorta", "Desc. corta (junto al precio)")}${f("fechaPublicacion", "Fecha pub.", 'type="date"')}</div>
      <details><summary>Cuotas</summary><div class="bk-g">${f("cuotasCant", "Cuotas", 'inputmode="numeric"')}${f("cuotasDet", "Detalle de cuotas")}</div></details>
      ${p.variantes.map((v, j) => fila(u, v, j)).join("")}
      <button type="button" class="alt" data-x="addv" data-u="${u}">+ Color</button></article>`;
  }
  function marcar(p) {                                // pinta en rojo lo que falta (nombre, precio, colores)
    const el = $(`#pb-list [data-u="${uid(p)}"].pb-p`); if (!el) return;
    el.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));
    if (!String(p.nombre || "").trim()) el.querySelector('[data-k="nombre"]').classList.add("bad");
    if (p.precio == null || !isFinite(p.precio)) el.querySelector('[data-k="precio"]').classList.add("bad");
    p.variantes.forEach((v, j) => { if (malo({ p, v })) { const i = el.querySelector(`[data-v="${j}"][data-k="color"]`); i && i.classList.add("bad") } });
  }
  function refrescar(p) {
    const el = $(`#pb-list [data-u="${uid(p)}"].pb-p`); if (!el) return;
    const abierto = el.querySelector("details").open; el.outerHTML = tarjeta(p);
    if (abierto) $(`#pb-list [data-u="${uid(p)}"].pb-p details`).open = true; marcar(p);
  }
  function pintar() {
    filtrar(); const vis = lista.slice(0, lim);
    $("#pb-list").innerHTML = vis.map(tarjeta).join("") + (lista.length > lim ? `<button type="button" class="alt pb-mas" id="pb-mas">Mostrar más (${lista.length - lim} restantes)</button>` : "") || `<p class="mi" style="margin:14px 0">${all().length ? "Ningún producto coincide con el filtro." : "No hay productos. Conectate con GitHub o agregá un producto nuevo."}</p>`;
    vis.forEach(marcar);
    $("#pb-cnt").textContent = `${lista.length} de ${all().length} productos · ${lista.reduce((a, p) => a + p.variantes.length, 0)} colores`;
  }
  const sync = () => { calc(); renderAll() };       // actualiza la tabla de fondo

  /* ---------- eventos ---------- */
  $("#todas").onclick = () => { endEdit(true); lim = LOTE; aviso(""); pintar(); pb.showModal() };
  const cerrar = () => pb.close();
  $("#pb-x").onclick = $("#pb-ok").onclick = cerrar;
  pb.addEventListener("close", sync);
  dlg.addEventListener("close", () => { if (pb.open && mod) refrescar(mod.p) });          // volvió de editar fotos / descripción
  $("#pb-cat").innerHTML += CATS.map(c => `<option>${c}</option>`).join("");
  ["#pb-s", "#pb-cat", "#pb-est"].forEach(s => $(s).addEventListener("input", () => { lim = LOTE; pintar() }));

  $("#pb-list").addEventListener("input", e => {      // el título de la tarjeta sigue al nombre mientras se escribe
    const t = e.target; if (t.dataset.k === "nombre") t.closest("article").querySelector("header .mi").textContent = t.value;
  });
  $("#pb-list").addEventListener("change", e => {
    const t = e.target, u = +t.dataset.u, k = t.dataset.k; if (!u || !k) return;
    const p = porUid.get(u), v = t.dataset.v != null ? p.variantes[+t.dataset.v] : null, row = { p, v }, col = colK(k), antes = get(row, col);
    if (t.value === antes) return;
    snap();
    if (!set(row, col, t.value)) { undo.pop(); const mal = t.value; t.value = antes; t.classList.add("bad"); return aviso(`“${mal}” no es un valor válido para ${col.t}.`, 1) }
    aviso(""); dirty();
    if (k === "categoria" || k === "estado") refrescar(p); else { t.classList.remove("bad"); marcar(p) }
  });
  $("#pb-list").addEventListener("click", e => {
    if (e.target.closest("#pb-mas")) { lim += LOTE; return pintar() }
    const b = e.target.closest("button[data-x]"); if (!b) return;
    const p = porUid.get(+b.dataset.u), x = b.dataset.x, j = +b.dataset.v, v = p && p.variantes[j];
    if (x === "gen") return abrirModal({ p, v: null }, "fotos");
    if (x === "fotos") return abrirModal({ p, v }, "fotos");
    if (x === "dup") { duplicar(p); const c = all()[all().length - 1]; lim = Math.max(lim, LOTE); pintar(); const el = $(`#pb-list [data-u="${uid(c)}"].pb-p`); el && el.scrollIntoView({ block: "center" }); return }
    if (x === "del") { const antes = all().length; eliminar(p); if (all().length !== antes) pintar(); return }
    if (x === "addv") { snap(); p.variantes.push(nuevaVar("")); dirty(); refrescar(p); const el = $(`#pb-list [data-u="${uid(p)}"].pb-p`).querySelectorAll('[data-k="color"]'); el[el.length - 1].focus(); return }
    if (x === "dupv") { snap(); const c = JSON.parse(JSON.stringify(v)); c.color = v.color + " (copia)"; p.variantes.splice(j + 1, 0, c); dirty(); return refrescar(p) }
    if (x === "delv") {
      if (p.variantes.length < 2) return aviso("Un producto necesita al menos un color. Si querés sacarlo, eliminá el producto.", 1);
      if (!confirm(`¿Quitar el color “${v.color || "(sin nombre)"}” de “${p.nombre || p.id}”?`)) return;
      snap(); p.variantes.splice(j, 1); dirty(); return refrescar(p);
    }
    if (x === "unf") { snap(); v.fotos.splice(+b.dataset.i, 1); dirty(); return refrescar(p) }
  });
})();
