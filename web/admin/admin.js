/* Panel de productos — tabla editable estilo Google Sheets.
   Lee y publica el mismo productos.json de GitHub que antes (mismo formato). */
const $ = s => document.querySelector(s);
const CATS = ["conjuntos", "remeras", "shorts", "buzos", "pantalones"], PRE = { conjuntos: "con", remeras: "rem", shorts: "sho", buzos: "buz", pantalones: "pan" };
const SZ = ["S", "M", "L", "XL", "XXL"], GEN = ["hombre", "mujer", "unisex"], EST = ["Borrador", "Publicado", "Oculto"];
const COLS = [
  { k: "id", t: "ID", w: 70, ro: 1, fz: 46 },
  { k: "nombre", t: "Nombre", w: 230, req: 1, fz: 116 },
  { k: "subtitulo", t: "Subtítulo", w: 170 },
  { k: "descripcionCorta", t: "Desc. corta (junto al precio)", w: 190 },
  { k: "categoria", t: "Categoría", w: 115, sel: CATS },
  { k: "subcategoria", t: "Subcategoría", w: 125 },
  { k: "marca", t: "Marca", w: 105 },
  { k: "modelo", t: "Modelo", w: 105 },
  { k: "genero", t: "Género", w: 95, sel: GEN },
  { k: "estado", t: "Estado", w: 105, sel: EST },
  { k: "fechaPublicacion", t: "Fecha pub.", w: 110, date: 1 },
  { k: "precio", t: "Precio", w: 100, num: 1, req: 1 },
  { k: "colores", t: "Colores (con coma)", w: 170 },
  ...SZ.map(s => ({ k: s, t: "Stock " + s, w: 74 })),
  { k: "cuotasCant", t: "Cuotas", w: 70, num: 1 },
  { k: "cuotasDet", t: "Detalle de cuotas", w: 170 },
  { k: "fotos", t: "Fotos", w: 80, modal: 1 },
  { k: "descripcion", t: "Descripción completa", w: 230, modal: 1 }
];
const NC = COLS.length, RN = 46, AXW = 66;

let data = {}, sha = "", cfg = {}, view = [], sort = { k: "", d: 1 }, cur = { r: 0, c: 1 }, anc = { r: 0, c: 1 };
const nuevos = new Set();                           // filas creadas en esta sesión: se muestran al final de la tabla
let edit = null, drag = false, undo = [], redo = [], mod = null, wasCur = false;
try { cfg = JSON.parse(localStorage.getItem("adm")) || {} } catch (e) { }
const F = $("#cfg"), dlg = $("#dlg");
["owner", "repo", "branch", "path", "token"].forEach(k => F[k].value = cfg[k] || (k == "branch" ? "main" : k == "path" ? "data/productos.json" : ""));
$("#cn").open = !cfg.token;
const api = () => `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
const H = () => ({ Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" });
const msg = (t, ok = 1) => { $("#msg").textContent = t; $("#msg").className = ok ? "" : "err" };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const all = () => CATS.flatMap(c => data[c] || []);
const cont = p => CATS.map(c => data[c]).find(a => a && a.includes(p));
const nuevoId = cat => PRE[cat] + (Math.max(0, ...(data[cat] || []).map(p => +String(p.id).slice(3) || 0)) + 1);

/* ---------- leer / escribir una celda ---------- */
function get(p, col) {
  const k = col.k;
  if (SZ.includes(k)) return p.talles && p.talles.includes(k) ? String((p.stock || {})[k] ?? 0) : "";
  if (k === "colores") return (p.colores || []).join(", ");
  if (k === "fotos") return (p.fotos || []).join("\n");
  if (k === "cuotasCant") return p.cuotas && p.cuotas.cantidad ? String(p.cuotas.cantidad) : "";
  if (k === "cuotasDet") return (p.cuotas && p.cuotas.detalle) || "";
  if (k === "precio") return p.precio == null || p.precio === "" ? "" : String(p.precio);
  return p[k] == null ? "" : String(p[k]);
}
function cambiarCat(p, cat) {                        // mueve el producto de categoría y le da un código nuevo (igual que antes)
  const a = cont(p); if (a) a.splice(a.indexOf(p), 1);
  p.categoria = cat; p.id = nuevoId(cat); (data[cat] = data[cat] || []).push(p);
}
function set(p, col, v) {                            // devuelve false si el valor no es válido
  const k = col.k; v = String(v).replace(/\r/g, "");
  if (col.ro) return false;
  if (col.sel) { const m = col.sel.find(o => o.toLowerCase() === v.trim().toLowerCase()); if (!m) return false; if (k === "categoria" && m !== p.categoria) cambiarCat(p, m); else p[k] = m; return true }
  if (SZ.includes(k)) {
    v = v.trim(); p.talles = p.talles || []; p.stock = p.stock || {};
    if (v === "") { p.talles = p.talles.filter(t => t !== k); delete p.stock[k]; return true }
    if (!/^\d+$/.test(v)) return false;
    p.stock[k] = +v; if (!p.talles.includes(k)) p.talles = SZ.filter(s => s === k || p.talles.includes(s)); return true;
  }
  if (k === "colores") { p.colores = v.split(",").map(s => s.trim()).filter(Boolean); return true }
  if (k === "fotos") { p.fotos = v.split("\n").map(s => s.trim()).filter(Boolean); return true }
  if (k === "precio") {
    v = v.trim().replace(/^\$\s*/, "").replace(/\s/g, ""); if (v === "") { p.precio = null; return true }
    v = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v) ? v.replace(/\./g, "").replace(",", ".") : v.replace(",", ".");
    const n = Number(v); if (!isFinite(n) || n < 0) return false; p.precio = n; return true;
  }
  if (k === "cuotasCant" || k === "cuotasDet") {
    p.cuotas = p.cuotas || {};
    if (k === "cuotasCant") { v = v.trim(); if (v !== "" && !/^\d+$/.test(v)) return false; p.cuotas.cantidad = +v || 0 } else p.cuotas.detalle = v.trim();
    p.cuotas.tiene = !!(p.cuotas.cantidad || p.cuotas.detalle); return true;
  }
  if (k === "fechaPublicacion") {
    v = v.trim(); if (v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v)) { p[k] = v; return true }
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if (!m) return false;
    p[k] = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; return true;
  }
  p[k] = k === "descripcion" ? v : v.trim(); return true;
}
function crear(cat) {
  cat = cat || "remeras"; (data[cat] = data[cat] || []);
  const p = { id: nuevoId(cat), nombre: "", subtitulo: "", descripcionCorta: "", descripcion: "", categoria: cat, subcategoria: "", marca: "", modelo: "", genero: "unisex", estado: "Borrador", fechaPublicacion: "", precio: null, colores: [], talles: [], stock: {}, cuotas: { tiene: false, cantidad: 0, detalle: "" }, fotos: [] };
  data[cat].push(p); nuevos.add(p); return p;
}

/* ---------- deshacer / estado ---------- */
const snap = () => { undo.push(JSON.stringify(data)); if (undo.length > 80) undo.shift(); redo = [] };
const dirty = () => { $("#pub").classList.add("dirty"); $("#est").textContent = "● Cambios sin publicar"; $("#est").className = "est dirty"; window.onbeforeunload = () => "Hay cambios sin publicar" };
const limpio = () => { $("#pub").classList.remove("dirty"); $("#est").textContent = "✓ Todo publicado"; $("#est").className = "est"; window.onbeforeunload = null };
function restaurar(s) { nuevos.clear(); data = JSON.parse(s); CATS.forEach(c => data[c] = data[c] || []); calc(); renderAll(); dirty() }
$("#un").onclick = () => { if (edit || !undo.length) return; redo.push(JSON.stringify(data)); restaurar(undo.pop()) };
$("#re").onclick = () => { if (edit || !redo.length) return; undo.push(JSON.stringify(data)); restaurar(redo.pop()) };

/* ---------- vista (filtro + orden) ---------- */
function calc() {
  const q = norm($("#s").value), fc = $("#fcat").value, fe = $("#fest").value;
  const orden = [...all().filter(p => !nuevos.has(p)), ...all().filter(p => nuevos.has(p))];
  view = orden.filter(p => (!fc || p.categoria === fc) && (!fe || p.estado === fe) && (!q || norm([p.id, p.nombre, p.marca, p.modelo, p.subcategoria, p.subtitulo].join(" ")).includes(q)));
  if (sort.k) {
    const col = COLS.find(c => c.k === sort.k), num = col.num || SZ.includes(col.k);
    view.sort((a, b) => { const x = get(a, col), y = get(b, col); return sort.d * (num ? (x === "" ? -1 : +x) - (y === "" ? -1 : +y) : x.localeCompare(y, "es", { numeric: true })) });
  }
  cur.r = Math.min(cur.r, Math.max(0, view.length - 1)); anc.r = Math.min(anc.r, Math.max(0, view.length - 1));
}
function cell(p, col, j) {
  const v = get(p, col), k = col.k, cl = [];
  if (col.num) cl.push("n"); if (SZ.includes(k)) { cl.push("s"); if (v === "") cl.push("ns"); else if (v === "0") cl.push("z"); else if (+v <= 2) cl.push("lo") }
  if (col.fz != null) cl.push("fz"); if (col.req && (k === "nombre" ? !v.trim() : v === "")) cl.push("bad");
  let inner;
  if (k === "estado") inner = `<span class="chip ${esc(v)}">${esc(v)}</span>`;
  else if (k === "precio") inner = v === "" ? "" : "$ " + Number(v).toLocaleString("es-AR");
  else if (k === "fotos") inner = v ? "📷 " + v.split("\n").length : `<span class="mut">—</span>`;
  else inner = esc(k === "descripcion" ? v.replace(/\n/g, " ") : v);
  return `<td data-c="${j}" class="${cl.join(" ")}" ${col.fz != null ? `style="left:${col.fz}px"` : ""} ${SZ.includes(k) ? "" : `title="${esc(v.slice(0, 200))}"`}>${inner}</td>`;
}
const rowHtml = (p, i) => `<td class="rn fz" style="left:0">${i + 1}</td>` + COLS.map((c, j) => cell(p, c, j)).join("") + `<td class="ax"><button type="button" data-x="dup" title="Duplicar fila">⧉</button><button type="button" data-x="del" title="Eliminar fila">✕</button></td>`;
function renderHead() {
  $("#cg").innerHTML = `<col style="width:${RN}px">` + COLS.map(c => `<col style="width:${c.w}px">`).join("") + `<col style="width:${AXW}px">`;
  $("#gr").style.width = (RN + AXW + COLS.reduce((a, c) => a + c.w, 0)) + "px";
  $("#th").innerHTML = `<tr><th class="rn fz" style="left:0">#</th>` + COLS.map(c => `<th data-k="${c.k}" ${c.fz != null ? `class="fz" style="left:${c.fz}px"` : ""} title="Clic para ordenar">${c.t}${sort.k === c.k ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + `<th></th></tr>`;
}
function renderAll() {
  renderHead();
  $("#tb").innerHTML = view.map((p, i) => `<tr>${rowHtml(p, i)}</tr>`).join("") || `<tr><td colspan="${NC + 2}" style="padding:20px;cursor:default">${all().length ? "Ningún producto coincide con el filtro." : "No hay productos. Conectate con GitHub o agregá una fila nueva."}</td></tr>`;
  const pub = all().filter(p => p.estado === "Publicado").length;
  $("#cnt").textContent = `${all().length} productos · ${pub} publicados` + (view.length !== all().length ? ` · mostrando ${view.length}` : "");
  paint();
}
function renderRow(r) { const tr = $("#tb").rows[r]; if (tr && view[r]) tr.innerHTML = rowHtml(view[r], r); paint() }

/* ---------- selección ---------- */
const rng = () => ({ r1: Math.min(anc.r, cur.r), r2: Math.max(anc.r, cur.r), c1: Math.min(anc.c, cur.c), c2: Math.max(anc.c, cur.c) });
function paint() {
  document.querySelectorAll("#tb td.sel,#tb td.cur").forEach(t => t.classList.remove("sel", "cur"));
  if (!view.length) return;
  const R = rng(), tb = $("#tb");
  for (let r = R.r1; r <= R.r2; r++) { const tr = tb.rows[r]; if (!tr) continue; for (let c = R.c1; c <= R.c2; c++) { const td = tr.cells[c + 1]; td && td.classList.add("sel") } }
  const t = tb.rows[cur.r] && tb.rows[cur.r].cells[cur.c + 1]; if (t) { t.classList.add("cur"); if (!edit) t.scrollIntoView({ block: "nearest", inline: "nearest" }) }
}
function go(dr, dc, ext) {
  if (!view.length) return;
  cur = { r: Math.min(view.length - 1, Math.max(0, cur.r + dr)), c: Math.min(NC - 1, Math.max(0, cur.c + dc)) };
  if (!ext) anc = { ...cur }; paint();
}
$("#tb").addEventListener("mousedown", e => {
  if (e.target.closest("input,select")) return;
  const td = e.target.closest("td"), tr = e.target.closest("tr"); if (!td || td.classList.contains("ax") || !tr || !view[tr.sectionRowIndex]) return;
  endEdit(true);
  const r = tr.sectionRowIndex;
  if (td.classList.contains("rn")) { if (e.shiftKey) cur = { r, c: NC - 1 }; else { anc = { r, c: 0 }; cur = { r, c: NC - 1 } } drag = "fila"; paint(); return }
  const c = +td.dataset.c;
  wasCur = !e.shiftKey && cur.r === r && cur.c === c && anc.r === r && anc.c === c;
  cur = { r, c }; if (!e.shiftKey) anc = { r, c }; drag = "celda"; paint();
});
$("#tb").addEventListener("mouseover", e => {
  if (!drag) return; const td = e.target.closest("td"), tr = e.target.closest("tr"); if (!td || !tr || td.classList.contains("ax")) return;
  cur = { r: tr.sectionRowIndex, c: drag === "fila" ? NC - 1 : (td.dataset.c != null ? +td.dataset.c : cur.c) }; paint();
});
document.addEventListener("mouseup", () => { drag = false });
$("#tb").addEventListener("click", e => {
  const b = e.target.closest("button[data-x]");
  if (b) { const r = b.closest("tr").sectionRowIndex, p = view[r]; return b.dataset.x === "dup" ? duplicar(p) : eliminar(p) }
  const td = e.target.closest("td"); if (wasCur && td && td.dataset.c != null && !e.target.closest("input,select")) { wasCur = false; startEdit(cur.r, cur.c) }
});
$("#tb").addEventListener("dblclick", e => { const td = e.target.closest("td"); if (td && td.dataset.c != null && !e.target.closest("input,select")) startEdit(cur.r, cur.c) });
$("#th").addEventListener("click", e => {
  const th = e.target.closest("th[data-k]"); if (!th) return; endEdit(true);
  sort = sort.k === th.dataset.k ? (sort.d > 0 ? { k: th.dataset.k, d: -1 } : { k: "", d: 1 }) : { k: th.dataset.k, d: 1 };
  calc(); renderAll();
});

/* ---------- edición de una celda ---------- */
function startEdit(r, c, ini) {
  const col = COLS[c], p = view[r]; if (!p || col.ro) return;
  if (col.modal) return abrirModal(p, col.k);
  endEdit(true);
  const td = $("#tb").rows[r].cells[c + 1]; edit = { r, c, old: get(p, col) }; td.classList.add("ed");
  let el;
  if (col.sel) { el = document.createElement("select"); el.innerHTML = col.sel.map(o => `<option>${o}</option>`).join(""); el.value = edit.old }
  else { el = document.createElement("input"); el.type = col.date ? "date" : "text"; if (col.num || SZ.includes(col.k)) el.inputMode = "decimal"; el.value = ini != null ? ini : edit.old }
  td.textContent = ""; td.appendChild(el); el.focus();
  if (!col.sel && ini == null && !col.date) el.select();
  el.onkeydown = ev => {
    if (ev.key === "Enter") { ev.preventDefault(); endEdit(true, 1, 0) }
    else if (ev.key === "Tab") { ev.preventDefault(); endEdit(true, 0, ev.shiftKey ? -1 : 1) }
    else if (ev.key === "Escape") { ev.preventDefault(); endEdit(false) }
  };
  el.onblur = () => endEdit(true);
  if (col.sel) { el.onchange = () => endEdit(true); try { el.showPicker && el.showPicker() } catch (e) { } }
}
function endEdit(save, dr = 0, dc = 0) {
  if (!edit) return; const { r, c, old } = edit; edit = null;
  const td = $("#tb").rows[r] && $("#tb").rows[r].cells[c + 1], el = td && td.firstElementChild, p = view[r];
  if (save && el && p && el.value !== old) {
    snap();
    if (set(p, COLS[c], el.value)) dirty(); else { undo.pop(); msg(`“${el.value}” no es un valor válido para ${COLS[c].t}.`, 0) }
  }
  renderRow(r); if (dr || dc) go(dr, dc, false);
}

/* ---------- portapapeles (compatible con Google Sheets / Excel) ---------- */
const q = v => /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
function tsv(R) { const o = []; for (let r = R.r1; r <= R.r2; r++) { const a = []; for (let c = R.c1; c <= R.c2; c++) a.push(q(get(view[r], COLS[c]))); o.push(a.join("\t")) } return o.join("\n") }
function parseTSV(t) {
  const rows = []; let row = [], f = "", inq = false; t = t.replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inq) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else inq = false } else f += ch }
    else if (ch === '"' && f === "") inq = true;
    else if (ch === "\t") { row.push(f); f = "" }
    else if (ch === "\n") { row.push(f); rows.push(row); row = []; f = "" }
    else f += ch;
  }
  row.push(f); if (row.length > 1 || row[0] !== "") rows.push(row); return rows;
}
const en = (e, sel) => e.target && e.target.closest && e.target.closest(sel);
const libre = e => edit || !view.length || en(e, "input,textarea,select,dialog");
document.addEventListener("copy", e => { if (libre(e)) return; e.preventDefault(); e.clipboardData.setData("text/plain", tsv(rng())) });
document.addEventListener("cut", e => { if (libre(e)) return; e.preventDefault(); e.clipboardData.setData("text/plain", tsv(rng())); borrar() });
document.addEventListener("paste", e => {
  if (edit || en(e, "input,textarea,select,dialog")) return;
  const rows = parseTSV(e.clipboardData.getData("text/plain")); if (!rows.length) return; e.preventDefault();
  if (!view.length) { snap(); const p = crear(); view.push(p); renderAll(); cur = { r: 0, c: 1 }; anc = { r: 0, c: 1 } }
  const R = rng(); let mal = 0, w = 0; snap();
  const una = rows.length === 1 && rows[0].length === 1 && (R.r2 > R.r1 || R.c2 > R.c1);
  const aplicar = (r, c, v) => { if (c >= NC) return; const col = COLS[c]; if (col.ro) return; if (!set(view[r], col, v)) mal++ };
  if (una) { for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) aplicar(r, c, rows[0][0]) }
  else rows.forEach((fila, i) => {
    const r = R.r1 + i; if (r >= view.length) { const ult = view[view.length - 1]; view.push(crear(ult && ult.categoria)) }
    fila.forEach((v, j) => { aplicar(r, R.c1 + j, v); w = Math.max(w, j + 1) });
  });
  dirty(); renderAll();
  if (!una) { anc = { r: R.r1, c: R.c1 }; cur = { r: Math.min(view.length - 1, R.r1 + rows.length - 1), c: Math.min(NC - 1, R.c1 + w - 1) }; paint() }
  msg(mal ? `${mal} celda(s) no se pegaron porque el valor no es válido.` : "Pegado.", !mal);
});
function borrar() {
  const R = rng(); snap();
  for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) { const col = COLS[c]; if (col.ro || col.sel) continue; set(view[r], col, "") }
  dirty(); renderAll();
}
function rellenar() {
  const R = rng(); if (R.r2 === R.r1) return; snap();
  for (let c = R.c1; c <= R.c2; c++) { const col = COLS[c]; if (col.ro) continue; const v = get(view[R.r1], col); for (let r = R.r1 + 1; r <= R.r2; r++) set(view[r], col, v) }
  dirty(); renderAll();
}

/* ---------- teclado ---------- */
document.addEventListener("keydown", e => {
  if (en(e, "input,textarea,select,dialog") || !view.length) return;
  const k = e.key, m = e.ctrlKey || e.metaKey, kl = k.toLowerCase();
  if (m) {
    if (kl === "z") { e.preventDefault(); e.shiftKey ? $("#re").click() : $("#un").click() }
    else if (kl === "y") { e.preventDefault(); $("#re").click() }
    else if (kl === "d") { e.preventDefault(); rellenar() }
    else if (kl === "a") { e.preventDefault(); anc = { r: 0, c: 0 }; cur = { r: view.length - 1, c: NC - 1 }; paint() }
    return;
  }
  const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
  if (mv) { e.preventDefault(); return go(mv[0], mv[1], e.shiftKey) }
  if (k === "Tab") { e.preventDefault(); return go(0, e.shiftKey ? -1 : 1, false) }
  if (k === "Enter" || k === "F2") { e.preventDefault(); return e.shiftKey ? go(-1, 0, false) : startEdit(cur.r, cur.c) }
  if (k === "Delete" || k === "Backspace") { e.preventDefault(); return borrar() }
  if (k === "Home") { e.preventDefault(); return go(0, -NC, e.shiftKey) }
  if (k === "End") { e.preventDefault(); return go(0, NC, e.shiftKey) }
  if (k.length === 1 && !e.altKey) { const col = COLS[cur.c]; if (col.ro || col.sel || col.modal) return; e.preventDefault(); startEdit(cur.r, cur.c, k) }
});

/* ---------- filas ---------- */
function nuevaFila() {
  endEdit(true); snap(); const base = view[cur.r];
  if ($("#s").value || $("#fcat").value || $("#fest").value) { $("#s").value = ""; $("#fcat").value = ""; $("#fest").value = "" }
  const p = crear(base && base.categoria); dirty(); sort = { k: "", d: 1 }; calc(); renderAll();
  const r = view.indexOf(p); cur = { r, c: 1 }; anc = { r, c: 1 }; paint(); startEdit(r, 1);
}
function duplicar(p) {
  snap(); const c = JSON.parse(JSON.stringify(p)); c.id = nuevoId(p.categoria); c.nombre = (p.nombre || "") + " (copia)"; c.estado = "Borrador";
  data[p.categoria].push(c); nuevos.add(c); dirty(); calc(); renderAll(); const r = view.indexOf(c); cur = { r, c: 1 }; anc = { ...cur }; paint();
}
function eliminar(p) {
  if (!confirm(`¿Eliminar “${p.nombre || p.id}”?`)) return;
  snap(); const a = cont(p); a.splice(a.indexOf(p), 1); dirty(); calc(); renderAll();
}
$("#nuevo").onclick = nuevaFila;
["#s", "#fcat", "#fest"].forEach(s => $(s).addEventListener("input", () => { endEdit(true); calc(); renderAll() }));
$("#fcat").innerHTML += CATS.map(c => `<option>${c}</option>`).join("");
document.addEventListener("click", e => { const b = e.target.closest("button"); if (b && b.type === "button") b.blur() });

/* ---------- ventana de descripción y fotos ---------- */
const lineas = s => s.split("\n").map(x => x.trim()).filter(Boolean);
const fsrc = n => /^http/.test(n) ? n : `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/fotos/${encodeURIComponent(n)}`;
function previa() { $("#mp").innerHTML = lineas($("#mf").value).map(n => `<img src="${esc(fsrc(n))}" title="${esc(n)}" alt="" onerror="this.style.visibility='hidden'">`).join("") }
function abrirModal(p, foco) {
  endEdit(true); mod = p; $("#mt").textContent = (p.nombre || p.id) + " · descripción y fotos";
  $("#md").value = p.descripcion || ""; $("#mf").value = (p.fotos || []).join("\n"); previa(); dlg.showModal();
  (foco === "fotos" ? $("#mf") : $("#md")).focus();
}
$("#mf").oninput = previa;
$("#mc").onclick = () => dlg.close();
$("#mo").onclick = () => {
  if ($("#md").value !== (mod.descripcion || "") || $("#mf").value !== (mod.fotos || []).join("\n")) { snap(); mod.descripcion = $("#md").value; mod.fotos = lineas($("#mf").value); dirty(); const r = view.indexOf(mod); if (r >= 0) renderRow(r) }
  dlg.close();
};
$("#up").onchange = async e => {
  const p = mod, id = p.id, names = lineas($("#mf").value);
  for (const file of e.target.files) {
    try {
      const b = await createImageBitmap(file), k = Math.min(1, 1200 / Math.max(b.width, b.height)), c = document.createElement("canvas");
      c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/webp", .82), ok = d.startsWith("data:image/webp"), ext = ok ? "webp" : "jpg", b64 = (ok ? d : c.toDataURL("image/jpeg", .82)).split(",")[1];
      let n = names.length + 1, name; do { name = `${id}-${n++}.${ext}` } while (names.includes(name));
      const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/fotos/${name}`, { method: "PUT", headers: H(), body: JSON.stringify({ message: "Foto " + name, content: b64, branch: cfg.branch }) });
      if (!r.ok) throw r.status;
      names.push(name); $("#mf").value = names.join("\n"); previa(); msg("Foto subida: " + name)
    } catch (err) { msg("No se pudo subir " + file.name + " (error " + err + ")", 0) }
  }
  e.target.value = ""
};

/* ---------- GitHub: cargar, publicar, descargar ---------- */
F.onsubmit = e => { e.preventDefault(); cfg = Object.fromEntries(new FormData(F)); localStorage.setItem("adm", JSON.stringify(cfg)); load() };
async function load() {
  try {
    const r = await fetch(api() + "?ref=" + cfg.branch, { headers: H() }); if (!r.ok) throw r.status; const j = await r.json(); sha = j.sha;
    data = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, ""))))); CATS.forEach(c => data[c] = data[c] || []);
    nuevos.clear(); undo = []; redo = []; cur = { r: 0, c: 1 }; anc = { r: 0, c: 1 }; calc(); renderAll(); limpio(); $("#cn").open = false; msg("JSON cargado.")
  }
  catch (e) { msg("No se pudo cargar (error " + e + "). Revisá usuario, repositorio, ruta y token.", 0); $("#cn").open = true }
}
$("#pub").onclick = async () => {
  endEdit(true);
  const malos = all().filter(p => !String(p.nombre || "").trim() || p.precio == null || !isFinite(p.precio));
  if (malos.length) {
    msg(`Falta el nombre o el precio en ${malos.length} fila(s) (están en rojo). Completalas para publicar.`, 0);
    const i = view.indexOf(malos[0]); if (i >= 0) { cur = { r: i, c: 1 }; anc = { ...cur }; paint() } return;
  }
  try {
    const r = await fetch(api(), { method: "PUT", headers: H(), body: JSON.stringify({ message: "Actualizar productos " + new Date().toISOString(), content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), sha, branch: cfg.branch }) });
    if (!r.ok) throw r.status; sha = (await r.json()).content.sha; nuevos.clear(); limpio(); msg("Commit realizado. La tienda se actualiza en unos minutos.")
  }
  catch (e) { msg("No se pudo publicar (error " + e + "). Si es 409, volvé a cargar el JSON.", 0) }
};
$("#dl").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "productos.json"; a.click() };

renderHead(); renderAll();
if (cfg.token) load();
