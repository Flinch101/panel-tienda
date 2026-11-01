/* Panel de productos — tabla editable estilo Google Sheets, con variantes por color.
   Cada producto = una fila + una sub-fila por color (stock por talle y fotos propias de cada color).
   Publica el mismo productos.json de GitHub: guarda "variantes" y mantiene colores/talles/stock calculados, así lo viejo sigue funcionando. */
const $ = s => document.querySelector(s);
const CATS = ["conjuntos", "remeras", "shorts", "buzos", "pantalones"], PRE = { conjuntos: "con", remeras: "rem", shorts: "sho", buzos: "buz", pantalones: "pan" };
const SZ = ["S", "M", "L", "XL", "XXL"], GEN = ["hombre", "mujer", "unisex"], EST = ["Borrador", "Publicado", "Oculto"];
/* v:1 = columna que también existe a nivel color (sub-fila). En la fila del producto, color y talles son resúmenes de solo lectura. */
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
  { k: "color", t: "Color", w: 135, v: 1 },
  ...SZ.map(s => ({ k: s, t: "Stock " + s, w: 74, v: 1 })),
  { k: "cuotasCant", t: "Cuotas", w: 70, num: 1 },
  { k: "cuotasDet", t: "Detalle de cuotas", w: 170 },
  { k: "fotos", t: "Fotos", w: 80, modal: 1, v: 1 },
  { k: "descripcion", t: "Descripción completa", w: 230, modal: 1 }
];
const NC = COLS.length, RN = 46, AXW = 100;
const esDerivada = k => k === "color" || SZ.includes(k);       // en la fila del producto son resúmenes

const nuevos = new Set();                           // productos creados en esta sesión: se muestran al final de la tabla
let data = {}, sha = "", cfg = {}, view = [], sort = { k: "", d: 1 }, cur = { r: 0, c: 1 }, anc = { r: 0, c: 1 };
let edit = null, drag = false, undo = [], redo = [], mod = null, gen = [], wasCur = false;
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
const nuevaVar = (color = "Único") => ({ color, stock: {}, fotos: [] });

/* ---------- formato: viejo -> variantes ---------- */
function normalizar(p) {
  p.fotos = p.fotos || [];
  if (Array.isArray(p.variantes) && p.variantes.length) { p.variantes.forEach(v => { v.color = v.color || ""; v.stock = v.stock || {}; v.fotos = v.fotos || [] }); return }
  const st = {}; (p.talles || []).forEach(t => st[t] = p.stock && p.stock[t] != null ? p.stock[t] : 99);
  p.variantes = (p.colores && p.colores.length ? p.colores : ["Único"]).map(c => ({ color: c, stock: { ...st }, fotos: [] }));
}
function salida() {                                  // JSON a publicar: variantes + campos viejos calculados
  const o = JSON.parse(JSON.stringify(data));
  CATS.forEach(c => (o[c] || []).forEach(p => {
    if (!p.variantes || !p.variantes.length) p.variantes = [nuevaVar()];
    p.colores = p.variantes.map(v => v.color);
    const ks = [...new Set([...SZ, ...p.variantes.flatMap(v => Object.keys(v.stock))])];
    p.talles = ks.filter(t => p.variantes.some(v => v.stock[t] != null));
    p.stock = {}; p.talles.forEach(t => p.stock[t] = p.variantes.reduce((a, v) => a + (+v.stock[t] || 0), 0));
  }));
  return o;
}

/* ---------- leer / escribir una celda (fila = { p, v }: v null => fila del producto) ---------- */
const editable = (row, col) => row.v ? !!col.v : !(col.ro || esDerivada(col.k));
function get(row, col) {
  const p = row.p, v = row.v, k = col.k;
  if (v) {
    if (k === "color") return v.color; if (SZ.includes(k)) return v.stock[k] != null ? String(v.stock[k]) : "";
    if (k === "fotos") return v.fotos.join("\n"); return "";
  }
  if (k === "color") return p.variantes.map(x => x.color).join(", ");
  if (SZ.includes(k)) { const xs = p.variantes.filter(x => x.stock[k] != null); return xs.length ? String(xs.reduce((a, x) => a + (+x.stock[k] || 0), 0)) : "" }
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
function set(row, col, val) {                        // devuelve false si el valor no es válido
  const p = row.p, v = row.v, k = col.k; val = String(val).replace(/\r/g, "");
  if (v) {
    if (k === "color") { v.color = val.trim(); return true }
    if (SZ.includes(k)) {
      val = val.trim(); if (val === "") { delete v.stock[k]; return true }
      if (!/^\d+$/.test(val)) return false; v.stock[k] = +val; return true;
    }
    if (k === "fotos") { v.fotos = val.split("\n").map(s => s.trim()).filter(Boolean); return true }
    return false;
  }
  if (col.ro || esDerivada(k)) return false;
  if (col.sel) { const m = col.sel.find(o => o.toLowerCase() === val.trim().toLowerCase()); if (!m) return false; if (k === "categoria" && m !== p.categoria) cambiarCat(p, m); else p[k] = m; return true }
  if (k === "fotos") { p.fotos = val.split("\n").map(s => s.trim()).filter(Boolean); return true }
  if (k === "precio") {
    val = val.trim().replace(/^\$\s*/, "").replace(/\s/g, ""); if (val === "") { p.precio = null; return true }
    val = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(val) ? val.replace(/\./g, "").replace(",", ".") : val.replace(",", ".");
    const n = Number(val); if (!isFinite(n) || n < 0) return false; p.precio = n; return true;
  }
  if (k === "cuotasCant" || k === "cuotasDet") {
    p.cuotas = p.cuotas || {};
    if (k === "cuotasCant") { val = val.trim(); if (val !== "" && !/^\d+$/.test(val)) return false; p.cuotas.cantidad = +val || 0 } else p.cuotas.detalle = val.trim();
    p.cuotas.tiene = !!(p.cuotas.cantidad || p.cuotas.detalle); return true;
  }
  if (k === "fechaPublicacion") {
    val = val.trim(); if (val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val)) { p[k] = val; return true }
    const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if (!m) return false;
    p[k] = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; return true;
  }
  p[k] = k === "descripcion" ? val : val.trim(); return true;
}
function crear(cat, conVar = true) {
  cat = cat || "remeras"; (data[cat] = data[cat] || []);
  const p = { id: nuevoId(cat), nombre: "", subtitulo: "", descripcionCorta: "", descripcion: "", categoria: cat, subcategoria: "", marca: "", modelo: "", genero: "unisex", estado: "Borrador", fechaPublicacion: "", precio: null, cuotas: { tiene: false, cantidad: 0, detalle: "" }, fotos: [], variantes: conVar ? [nuevaVar()] : [] };
  data[cat].push(p); nuevos.add(p); return p;
}
/* una fila está mal si le falta lo obligatorio (producto: nombre y precio; color: nombre único y no vacío) */
const dupColor = (p, v) => p.variantes.some(x => x !== v && norm(x.color.trim()) === norm(v.color.trim()) && v.color.trim() !== "");
const malo = row => row.v ? (!row.v.color.trim() || dupColor(row.p, row.v)) : (!String(row.p.nombre || "").trim() || row.p.precio == null || !isFinite(row.p.precio));

/* ---------- deshacer / estado ---------- */
const snap = () => { undo.push(JSON.stringify(data)); if (undo.length > 80) undo.shift(); redo = [] };
const dirty = () => { $("#pub").classList.add("dirty"); $("#est").textContent = "● Cambios sin publicar"; $("#est").className = "est dirty"; window.onbeforeunload = () => "Hay cambios sin publicar" };
const limpio = () => { $("#pub").classList.remove("dirty"); $("#est").textContent = "✓ Todo publicado"; $("#est").className = "est"; window.onbeforeunload = null };
function restaurar(s) { nuevos.clear(); data = JSON.parse(s); CATS.forEach(c => data[c] = data[c] || []); calc(); renderAll(); dirty() }
$("#un").onclick = () => { if (edit || !undo.length) return; redo.push(JSON.stringify(data)); restaurar(undo.pop()) };
$("#re").onclick = () => { if (edit || !redo.length) return; undo.push(JSON.stringify(data)); restaurar(redo.pop()) };

/* ---------- vista (filtro + orden): producto y debajo sus colores ---------- */
function calc() {
  const q = norm($("#s").value), fc = $("#fcat").value, fe = $("#fest").value;
  const orden = [...all().filter(p => !nuevos.has(p)), ...all().filter(p => nuevos.has(p))];
  let ps = orden.filter(p => (!fc || p.categoria === fc) && (!fe || p.estado === fe) && (!q || norm([p.id, p.nombre, p.marca, p.modelo, p.subcategoria, p.subtitulo, ...p.variantes.map(v => v.color)].join(" ")).includes(q)));
  if (sort.k) {
    const col = COLS.find(c => c.k === sort.k), num = col.num || SZ.includes(col.k);
    ps.sort((a, b) => { const x = get({ p: a, v: null }, col), y = get({ p: b, v: null }, col); return sort.d * (num ? (x === "" ? -1 : +x) - (y === "" ? -1 : +y) : x.localeCompare(y, "es", { numeric: true })) });
  }
  view = ps.flatMap(p => [{ p, v: null }, ...p.variantes.map(v => ({ p, v }))]);
  cur.r = Math.min(cur.r, Math.max(0, view.length - 1)); anc.r = Math.min(anc.r, Math.max(0, view.length - 1));
}
function cell(row, col, j) {
  const p = row.p, v = get(row, col), k = col.k, cl = [], sub = !!row.v;
  if (col.num) cl.push("n");
  if (col.fz != null) cl.push("fz");
  let inner, tit = true;
  if (SZ.includes(k)) {
    cl.push("s"); tit = false;
    if (sub) { if (v === "") cl.push("ns"); else if (v === "0") cl.push("z"); else if (+v <= 2) cl.push("lo") } else { cl.push("der"); if (v === "") cl.push("ns") }
  }
  if (sub && !col.v) { cl.push("sb"); if (k === "id" || k === "nombre") cl.push("mu"); inner = k === "id" ? esc(p.id) : k === "nombre" ? "↳ " + esc(p.nombre || "") : ""; tit = false }
  else if (!sub && esDerivada(k) && !SZ.includes(k)) { cl.push("der"); inner = esc(v) }
  else if (k === "estado") inner = `<span class="chip ${esc(v)}">${esc(v)}</span>`;
  else if (k === "precio") inner = v === "" ? "" : "$ " + Number(v).toLocaleString("es-AR");
  else if (k === "fotos") inner = v ? "📷 " + v.split("\n").length : `<span class="mut">—</span>`;
  else inner = esc(k === "descripcion" ? v.replace(/\n/g, " ") : v);
  if (sub && k === "color") cl.push("cl");
  if (malo(row) && (sub ? k === "color" : (col.req && (k === "nombre" ? !v.trim() : v === "")))) cl.push("bad");
  return `<td data-c="${j}" class="${cl.join(" ")}" ${col.fz != null ? `style="left:${col.fz}px"` : ""} ${tit ? `title="${esc(v.slice(0, 200))}"` : ""}>${inner}</td>`;
}
const rowHtml = (row, label) => `<td class="rn fz" style="left:0">${label}</td>` + COLS.map((c, j) => cell(row, c, j)).join("") +
  (row.v ? `<td class="ax"><button type="button" data-x="dupv" title="Duplicar este color">⧉</button><button type="button" data-x="delv" title="Quitar este color">✕</button></td>`
    : `<td class="ax"><button type="button" data-x="addv" title="Agregar un color a este producto">＋</button><button type="button" data-x="dup" title="Duplicar producto">⧉</button><button type="button" data-x="del" title="Eliminar producto">✕</button></td>`);
const etiqueta = r => view[r].v ? "↳" : view.slice(0, r + 1).filter(x => !x.v).length;
function renderHead() {
  $("#cg").innerHTML = `<col style="width:${RN}px">` + COLS.map(c => `<col style="width:${c.w}px">`).join("") + `<col style="width:${AXW}px">`;
  $("#gr").style.width = (RN + AXW + COLS.reduce((a, c) => a + c.w, 0)) + "px";
  $("#th").innerHTML = `<tr><th class="rn fz" style="left:0">#</th>` + COLS.map(c => `<th data-k="${c.k}" ${c.fz != null ? `class="fz" style="left:${c.fz}px"` : ""} title="Clic para ordenar">${c.t}${sort.k === c.k ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + `<th></th></tr>`;
}
function renderAll() {
  renderHead(); let n = 0;
  $("#tb").innerHTML = view.map(row => `<tr class="${row.v ? "vr" : "pr"}">${rowHtml(row, row.v ? "↳" : ++n)}</tr>`).join("") || `<tr><td colspan="${NC + 2}" style="padding:20px;cursor:default">${all().length ? "Ningún producto coincide con el filtro." : "No hay productos. Conectate con GitHub o agregá un producto nuevo."}</td></tr>`;
  const pub = all().filter(p => p.estado === "Publicado").length, nv = all().reduce((a, p) => a + p.variantes.length, 0);
  $("#cnt").textContent = `${all().length} productos · ${nv} colores · ${pub} publicados` + (new Set(view.map(r => r.p)).size !== all().length ? ` · mostrando ${new Set(view.map(r => r.p)).size}` : "");
  paint();
}
function renderRow(r) { const tr = $("#tb").rows[r]; if (tr && view[r]) tr.innerHTML = rowHtml(view[r], etiqueta(r)); paint() }
function renderProd(p) { view.forEach((row, r) => { if (row.p === p) { const tr = $("#tb").rows[r]; if (tr) tr.innerHTML = rowHtml(row, etiqueta(r)) } }); paint() }

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
  if (b) {
    const row = view[b.closest("tr").sectionRowIndex], x = b.dataset.x;
    return x === "dup" ? duplicar(row.p) : x === "del" ? eliminar(row.p) : x === "addv" ? agregarColor(row.p) : x === "dupv" ? duplicarColor(row) : quitarColor(row);
  }
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
  const col = COLS[c], row = view[r]; if (!row || !editable(row, col)) return;
  if (col.modal) return abrirModal(row, col.k);
  endEdit(true);
  const td = $("#tb").rows[r].cells[c + 1]; edit = { r, c, old: get(row, col) }; td.classList.add("ed");
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
  const td = $("#tb").rows[r] && $("#tb").rows[r].cells[c + 1], el = td && td.firstElementChild, row = view[r];
  if (save && el && row && el.value !== old) {
    snap();
    if (set(row, COLS[c], el.value)) dirty(); else { undo.pop(); msg(`“${el.value}” no es un valor válido para ${COLS[c].t}.`, 0) }
  }
  renderProd(row ? row.p : null); if (dr || dc) go(dr, dc, false);
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
  snap();
  if (!view.length) { crear(); calc(); renderAll(); cur = { r: 0, c: 1 }; anc = { r: 0, c: 1 } }
  const R = rng(); let mal = 0, w = 0; const creados = [];
  const aplicar = (row, c, val) => { if (c >= NC) return; const col = COLS[c]; if (!editable(row, col)) return; if (!set(row, col, val)) mal++ };
  const una = rows.length === 1 && rows[0].length === 1 && (R.r2 > R.r1 || R.c2 > R.c1);
  const ancho = Math.max(...rows.map(r => r.length));
  const soloProducto = !una && Array.from({ length: ancho }, (_, j) => R.c1 + j).every(c => c >= NC || !COLS[c].v);   // pegar datos del producto: salta las sub-filas de color
  if (una) { for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) aplicar(view[r], c, rows[0][0]) }
  else if (soloProducto) {
    const ps = []; view.forEach(row => { if (!row.v) ps.push(row.p) }); const k0 = ps.indexOf(view[R.r1].p);
    rows.forEach((fila, i) => {
      let p = ps[k0 + i]; if (!p) { const ult = ps[ps.length - 1]; p = crear(ult && ult.categoria, false); ps.push(p); creados.push(p) }
      fila.forEach((val, j) => { aplicar({ p, v: null }, R.c1 + j, val); w = Math.max(w, j + 1) });
    });
  } else {
    rows.forEach((fila, i) => {
      const r = R.r1 + i; if (r >= view.length) { const ult = view[view.length - 1], p = crear(ult && ult.p.categoria, false); creados.push(p); view.push({ p, v: null }) }
      fila.forEach((val, j) => { aplicar(view[r], R.c1 + j, val); w = Math.max(w, j + 1) });
    });
  }
  creados.forEach(p => { if (!p.variantes.length) p.variantes.push(nuevaVar()) });
  dirty(); calc(); renderAll();
  if (!una) { anc = { r: R.r1, c: R.c1 }; cur = { r: Math.min(view.length - 1, R.r1 + (soloProducto ? 0 : rows.length - 1)), c: Math.min(NC - 1, R.c1 + w - 1) }; paint() }
  msg(mal ? `${mal} celda(s) no se pegaron porque el valor no es válido.` : "Pegado.", !mal);
});
function borrar() {
  const R = rng(); snap();
  for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) { const col = COLS[c]; if (col.sel || !editable(view[r], col)) continue; set(view[r], col, "") }
  dirty(); renderAll();
}
function rellenar() {
  const R = rng(); if (R.r2 === R.r1) return; snap();
  for (let c = R.c1; c <= R.c2; c++) {
    const col = COLS[c], src = view[R.r1]; if (!editable(src, col)) continue; const val = get(src, col);
    for (let r = R.r1 + 1; r <= R.r2; r++) if (editable(view[r], col)) set(view[r], col, val);
  }
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
  if (k.length === 1 && !e.altKey) { const col = COLS[cur.c]; if (!editable(view[cur.r], col) || col.sel || col.modal) return; e.preventDefault(); startEdit(cur.r, cur.c, k) }
});

/* ---------- productos y colores ---------- */
const irA = (fn, c) => { const r = view.findIndex(fn); if (r >= 0) { cur = { r, c }; anc = { r, c }; paint(); return r } return -1 };
function nuevaFila() {
  endEdit(true); snap(); const base = view[cur.r];
  if ($("#s").value || $("#fcat").value || $("#fest").value) { $("#s").value = ""; $("#fcat").value = ""; $("#fest").value = "" }
  const p = crear(base && base.p.categoria); dirty(); sort = { k: "", d: 1 }; calc(); renderAll();
  const r = irA(x => x.p === p && !x.v, 1); startEdit(r, 1);
}
function duplicar(p) {
  snap(); const c = JSON.parse(JSON.stringify(p)); c.id = nuevoId(p.categoria); c.nombre = (p.nombre || "") + " (copia)"; c.estado = "Borrador";
  data[p.categoria].push(c); nuevos.add(c); dirty(); calc(); renderAll(); irA(x => x.p === c && !x.v, 1);
}
function eliminar(p) {
  if (!confirm(`¿Eliminar “${p.nombre || p.id}” con todos sus colores?`)) return;
  snap(); const a = cont(p); a.splice(a.indexOf(p), 1); nuevos.delete(p); dirty(); calc(); renderAll();
}
function agregarColor(p) {
  endEdit(true); snap(); const v = nuevaVar(""); p.variantes.push(v); dirty(); calc(); renderAll();
  const r = irA(x => x.v === v, 12); startEdit(r, 12);
}
function duplicarColor(row) {
  snap(); const c = JSON.parse(JSON.stringify(row.v)); c.color = row.v.color + " (copia)"; const a = row.p.variantes; a.splice(a.indexOf(row.v) + 1, 0, c);
  dirty(); calc(); renderAll(); irA(x => x.v === c, 12);
}
function quitarColor(row) {
  if (row.p.variantes.length < 2) return msg("Un producto necesita al menos un color. Si querés sacarlo, eliminá el producto.", 0);
  if (!confirm(`¿Quitar el color “${row.v.color || "(sin nombre)"}” de “${row.p.nombre || row.p.id}”?`)) return;
  snap(); const a = row.p.variantes; a.splice(a.indexOf(row.v), 1); dirty(); calc(); renderAll();
}
$("#nuevo").onclick = nuevaFila;
["#s", "#fcat", "#fest"].forEach(s => $(s).addEventListener("input", () => { endEdit(true); calc(); renderAll() }));
$("#fcat").innerHTML += CATS.map(c => `<option>${c}</option>`).join("");
document.addEventListener("click", e => { const b = e.target.closest("button"); if (b && b.type === "button") b.blur() });

/* ---------- ventana de descripción y fotos (del producto o de un color) ---------- */
const lineas = s => s.split("\n").map(x => x.trim()).filter(Boolean);
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "color";
const fsrc = n => /^http/.test(n) ? n : `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/fotos/${encodeURIComponent(n)}`;
const miniaturas = (a, extra = "") => a.map((n, i) => `<${extra ? "button type=button data-g=" + i : "span"} title="${esc(n)}"><img src="${esc(fsrc(n))}" alt="" onerror="this.style.visibility='hidden'"></${extra ? "button" : "span"}>`).join("");
function previa() { $("#mp").innerHTML = miniaturas(lineas($("#mf").value)); $("#mgl").innerHTML = miniaturas(gen, 1); $("#mg").hidden = !(mod && mod.v && gen.length) }
function abrirModal(row, foco) {
  endEdit(true); mod = row; const p = row.p, v = row.v; gen = v ? [...(p.fotos || [])] : [];
  $("#mt").textContent = v ? `${p.nombre || p.id} · ${v.color || "(sin nombre)"} · fotos` : `${p.nombre || p.id} · descripción y fotos`;
  $("#mi").textContent = v ? `Talles de este color: ${SZ.filter(t => v.stock[t] != null).map(t => t + (v.stock[t] === 0 ? " (agotado)" : "")).join(", ") || "ninguno cargado todavía"}. Estas fotos solo se ven cuando el cliente elige este color.` : "Las fotos de este producto sin color se muestran en todos los colores. Para fotos de un color puntual, usá la celda Fotos de la fila de ese color.";
  $("#mdl").hidden = !!v; $("#md").value = p.descripcion || ""; $("#mf").value = (v ? v.fotos : p.fotos || []).join("\n"); previa(); dlg.showModal();
  (foco === "fotos" || v ? $("#mf") : $("#md")).focus();
}
$("#mf").oninput = previa;
$("#mgl").onclick = e => {                           // pasar una foto general a este color
  const b = e.target.closest("button[data-g]"); if (!b) return; const n = gen.splice(+b.dataset.g, 1)[0];
  $("#mf").value = [...lineas($("#mf").value), n].join("\n"); previa();
};
$("#mc").onclick = () => dlg.close();
$("#mo").onclick = () => {
  const p = mod.p, v = mod.v, fotos = lineas($("#mf").value);
  const igual = v ? $("#mf").value.trim() === v.fotos.join("\n") && gen.length === (p.fotos || []).length : $("#md").value === (p.descripcion || "") && $("#mf").value.trim() === (p.fotos || []).join("\n");
  if (!igual) {
    snap();
    if (v) { v.fotos = fotos; p.fotos = gen } else { p.descripcion = $("#md").value; p.fotos = fotos }
    dirty(); renderProd(p);
  }
  dlg.close();
};
$("#up").onchange = async e => {
  const p = mod.p, v = mod.v, names = lineas($("#mf").value);
  const usados = () => new Set([...(p.fotos || []), ...p.variantes.flatMap(x => x.fotos), ...gen, ...names]);
  for (const file of e.target.files) {
    try {
      const b = await createImageBitmap(file), k = Math.min(1, 1200 / Math.max(b.width, b.height)), c = document.createElement("canvas");
      c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/webp", .82), ok = d.startsWith("data:image/webp"), ext = ok ? "webp" : "jpg", b64 = (ok ? d : c.toDataURL("image/jpeg", .82)).split(",")[1];
      const pre = v ? `${p.id}-${slug(v.color)}-` : `${p.id}-`;                       // el nombre del archivo ya dice a qué color pertenece
      let n = names.length + 1, name; do { name = `${pre}${n++}.${ext}` } while (usados().has(name));
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
    data = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, ""))))); CATS.forEach(c => data[c] = data[c] || []); all().forEach(normalizar);
    nuevos.clear(); undo = []; redo = []; cur = { r: 0, c: 1 }; anc = { r: 0, c: 1 }; calc(); renderAll(); limpio(); $("#cn").open = false; msg("JSON cargado.")
  }
  catch (e) { msg("No se pudo cargar (error " + e + "). Revisá usuario, repositorio, ruta y token.", 0); $("#cn").open = true }
}
$("#pub").onclick = async () => {
  endEdit(true);
  const filas = all().flatMap(p => [{ p, v: null }, ...p.variantes.map(v => ({ p, v }))]), malos = filas.filter(malo);
  if (malos.length) {
    msg(`Hay ${malos.length} fila(s) con datos que faltan o están repetidos (en rojo): nombre y precio de cada producto, y un color distinto en cada sub-fila. Corregilas para publicar.`, 0);
    const f = malos[0], i = view.findIndex(x => x.p === f.p && x.v === f.v); if (i >= 0) { cur = { r: i, c: f.v ? 12 : 1 }; anc = { ...cur }; paint() } return;
  }
  try {
    const r = await fetch(api(), { method: "PUT", headers: H(), body: JSON.stringify({ message: "Actualizar productos " + new Date().toISOString(), content: btoa(unescape(encodeURIComponent(JSON.stringify(salida(), null, 2)))), sha, branch: cfg.branch }) });
    if (!r.ok) throw r.status; sha = (await r.json()).content.sha; nuevos.clear(); limpio(); msg("Commit realizado. La tienda se actualiza en unos minutos.")
  }
  catch (e) { msg("No se pudo publicar (error " + e + "). Si es 409, volvé a cargar el JSON.", 0) }
};
$("#dl").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(salida(), null, 2)], { type: "application/json" })); a.download = "productos.json"; a.click() };

renderHead(); renderAll();
if (cfg.token) load();
