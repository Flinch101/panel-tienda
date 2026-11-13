/* Personalizador de remeras — lee remeras/, estampados/, fondo/ y etiquetas/ y exporta PNG.
   Estampados:  COLORES-TIPO-ID-nombre.png
     COLORES: dígitos 1=negro 2=blanco 3=rojo (puede tener varios: 123, 12, 3…)
     TIPO:    1=chico al centro, 2=frente completo
     ID:      número para diferenciarlo
   Etiquetas de cuello:  etiquetas/<marca>/etiqueta-<marca>-<talle>.png   (talle: s, m, l, xl…)
   Tags de cartón:       etiquetas/tags/<nombre>.png                      */
(() => {
  const $ = s => document.querySelector(s);
  const W = 1200, H = 1600;                       // tamaño del PNG exportado
  /* Posiciones iniciales (fracción de la remera: w=ancho, cx/cy=centro, rot=grados).
     Si con tus fotos de remera no caen donde corresponde, cambiá estos números. */
  const AJUSTE = { 1: { w: .35, cx: .50, cy: .40, rot: 0 }, 2: { w: .62, cx: .50, cy: .46, rot: 0 } };  // estampados por tipo
  const AJ_ETI = { w: .075, cx: .52, cy: .08, rot: 0 };     // etiqueta de cuello (grifa)
  const AJ_TAG = { w: .15, cx: .69, cy: .125, rot: -15 };   // tag de cartón: cx/cy = punto donde entra el hilo; el tag cuelga y rota desde ahí
  const AJ_HILO = { cx: .66, cy: .075 };                    // punto del cuello donde nace el hilito
  const HOLE = { x: 0, y: -.40 };                           // dónde entra el hilo en el tag (desde su centro, fracción del tag)
  const TALLES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const COD = { negro: 1, blanco: 2, rojo: 3 }, NOM = { 1: "negro", 2: "blanco", 3: "rojo" };
  const EXT = /\.(png|webp|jpe?g)$/i;
  const sinAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const base = f => f.replace(/\.[^.]+$/, "");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const url = (...p) => p.map(encodeURIComponent).join("/");
  const limpio = s => sinAcento(String(s)).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const cv = $("#cv"), ctx = cv.getContext("2d");

  const st = { remera: null, estampado: null, fondo: null, marca: null, talle: "", tag: null, act: "est" };
  const P = { est: { ...AJUSTE[1] }, eti: { ...AJ_ETI }, tag: { ...AJ_TAG }, hilo: { ...AJ_HILO } };
  let D = { remeras: [], estampados: [], fondo: [], marcas: [], tags: [] }, ignorados = [];
  let box = { x: 0, y: 0, w: W, h: H }, G = {};     // G = geometría dibujada (para tocar/arrastrar)

  const msg = (t, err) => { $("#msg").textContent = t || ""; $("#msg").className = err ? "err" : "" };

  /* ---------- lectura de carpetas ---------- */
  async function indice(d) {                        // plan B: índice de carpeta del servidor
    try {
      const r = await fetch(d + "/", { cache: "no-cache" }); if (!r.ok) return [];
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      return [...doc.querySelectorAll("a")].map(a => a.getAttribute("href") || "")
        .filter(h => h && !/^(\/|https?:|\?|#|\.\.)/.test(h))
        .map(h => { const c = h.split("?")[0]; return { n: decodeURIComponent(c.split("/").filter(Boolean).pop() || ""), dir: c.endsWith("/") } });
    } catch (e) { return [] }
  }
  async function listar() {
    try {
      const r = await fetch("lista.json", { cache: "no-cache" });
      if (r.ok) {
        const j = await r.json();
        if (["remeras", "estampados", "fondo", "tags"].some(c => (j[c] || []).length) || Object.keys(j.etiquetas || {}).length) return j;
      }
    } catch (e) { }
    const j = { etiquetas: {} };
    for (const c of ["remeras", "estampados", "fondo"]) j[c] = (await indice(c)).filter(x => !x.dir).map(x => x.n);
    for (const x of await indice("etiquetas")) if (x.dir && x.n.toLowerCase() !== "tags") j.etiquetas[x.n] = (await indice("etiquetas/" + encodeURIComponent(x.n))).filter(y => !y.dir).map(y => y.n);
    j.tags = (await indice("etiquetas/tags")).filter(x => !x.dir).map(x => x.n);
    return j;
  }
  function parsear(j) {
    const ok = a => [...new Set((a || []).filter(f => EXT.test(f)))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    D.remeras = ok(j.remeras).map(f => {
      const n = sinAcento(base(f)).toLowerCase(); let cod = 0, nom = base(f);
      for (const k in COD) if (n.includes(k.slice(0, -1))) { cod = COD[k]; nom = k; break }   // negr / blanc / roj
      if (!cod) { const m = n.match(/^([123])(?!\d)/); if (m) { cod = +m[1]; nom = NOM[cod] } }
      return { f, url: url("remeras", f), cod, nom, label: base(f) };
    });
    ignorados = [];
    D.estampados = ok(j.estampados).flatMap(f => {
      const m = base(f).match(/^(\d+)-(\d)-(\d+)-(.+)$/);
      if (!m || !/^[123]+$/.test(m[1]) || !AJUSTE[m[2]]) { ignorados.push(f); return [] }
      return [{ f, url: url("estampados", f), cods: [...new Set(m[1].split("").map(Number))], tipo: +m[2], id: +m[3], nombre: m[4] }];
    });
    D.fondo = ok(j.fondo).map(f => ({ f, url: url("fondo", f), label: base(f) }));
    D.marcas = Object.keys(j.etiquetas || {}).sort((a, b) => a.localeCompare(b, "es")).map(m => {
      const talles = {};
      ok(j.etiquetas[m]).forEach(f => {
        const t = (base(f).match(/-(xxxl|xxl|xl|xxs|xs|s|m|l)$/i) || [])[1];
        if (t) talles[t.toUpperCase()] = url("etiquetas", m, f); else ignorados.push(`etiquetas/${m}/${f}`);
      });
      return { marca: m, talles };
    }).filter(x => Object.keys(x.talles).length);
    D.tags = ok(j.tags).map(f => ({ f, url: url("etiquetas", "tags", f), nombre: base(f) }));
  }

  /* ---------- imágenes ---------- */
  const cache = new Map();
  const cargar = u => { if (!cache.has(u)) cache.set(u, new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => no(new Error(u)); i.src = u })); return cache.get(u) };
  const urlEti = () => st.marca && st.marca.talles[st.talle] || null;

  /* ---------- dibujo ---------- */
  let tok = 0;
  async function dibujar(guia = true) {
    const mi = ++tok;
    const pedir = u => u ? cargar(u).catch(() => null) : null;
    const [bg, sh, es, et, tg] = await Promise.all([pedir(st.fondo && st.fondo.url), pedir(st.remera && st.remera.url), pedir(st.estampado && st.estampado.url), pedir(urlEti()), pedir(st.tag && st.tag.url)]);
    if (mi !== tok) return;
    ctx.clearRect(0, 0, W, H); G = {};
    if (bg) { const k = Math.max(W / bg.width, H / bg.height), w = bg.width * k, h = bg.height * k; ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h) }
    if (sh) {
      const k = Math.min(W * .94 / sh.width, H * .94 / sh.height), w = sh.width * k, h = sh.height * k;
      box = { x: (W - w) / 2, y: (H - h) / 2, w, h }; ctx.drawImage(sh, box.x, box.y, w, h);
    }
    if (sh) {
      if (es) G.est = poner(es, P.est);
      if (et) G.eti = poner(et, P.eti);
      if (tg) {
        const a = { x: box.x + box.w * P.hilo.cx, y: box.y + box.h * P.hilo.cy };
        G.tag = geom(tg, P.tag, true); hilo(a, G.tag); poner(tg, P.tag, true); G.hilo = a;       // hilo primero, el tag lo tapa en la punta
        if (guia && st.act === "hilo") { ctx.save(); ctx.strokeStyle = "#ff2d55"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, 7); ctx.stroke(); ctx.restore() }
      }
    }
    sync();
  }
  function geom(img, p, colgar) {
    const w = box.w * p.w, h = w * img.height / img.width, x = box.x + box.w * p.cx, y = box.y + box.h * p.cy, r = p.rot * Math.PI / 180;
    if (!colgar) return { x, y, w, h, r };
    const c = Math.cos(r), s = Math.sin(r), hx = HOLE.x * w, hy = HOLE.y * h;       // el centro del tag queda debajo del punto del hilo
    return { x: x - (hx * c - hy * s), y: y - (hx * s + hy * c), w, h, r, ex: x, ey: y };
  }
  function poner(img, p, colgar) { const g = geom(img, p, colgar); ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.r); ctx.drawImage(img, -g.w / 2, -g.h / 2, g.w, g.h); ctx.restore(); return g }
  function hilo(a, g) {
    const ex = g.ex, ey = g.ey, d = Math.hypot(ex - a.x, ey - a.y);
    ctx.save(); ctx.strokeStyle = "#f6f6f6"; ctx.lineWidth = Math.max(3, W * .0035); ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + ex) / 2, (a.y + ey) / 2 + d * .08, ex, ey); ctx.stroke(); ctx.restore();
  }
  const existe = k => ({ est: st.estampado, eti: urlEti(), tag: st.tag, hilo: st.tag }[k]);
  const NOMBRES = { est: "estampado", eti: "etiqueta", tag: "tag", hilo: "hilo" };
  function sync() {
    const p = P[st.act], h = st.act === "hilo";
    $("#sz").value = Math.round(p.w * 1000) || 0; $("#px").value = Math.round(p.cx * 1000); $("#py").value = Math.round(p.cy * 1000); $("#rt").value = p.rot || 0;
    $("#osz").textContent = h ? "—" : (p.w * 100).toFixed(1) + "%"; $("#opx").textContent = (p.cx * 100).toFixed(1) + "%"; $("#opy").textContent = (p.cy * 100).toFixed(1) + "%"; $("#ort").textContent = h ? "—" : Math.round(p.rot) + "°";
    $("#sz").disabled = $("#rt").disabled = h;
    document.querySelectorAll("#ac button").forEach(b => b.classList.toggle("on", b.dataset.a === st.act));
    $("#nm").textContent = nombre() + ".png";
  }
  const nombre = () => !st.remera ? "—" : [limpio(st.estampado ? st.estampado.nombre : "sin-estampado"), limpio(st.remera.nom), urlEti() ? limpio(st.talle) : ""].filter(Boolean).join("-");

  /* ---------- listas ---------- */
  const thumb = (k, i, src, lab, on, extra = "") => `<button type="button" class="th ${on ? "on" : ""} ${extra}" data-k="${k}" data-i="${i}" title="${esc(lab)}"><img src="${src}" alt="" loading="lazy"><span>${esc(lab)}</span></button>`;
  const vacio = c => `<p class="vacio">No hay imágenes en <b>${c}/</b>. Subilas y corré <b>generar-lista</b> (ver instrucciones).</p>`;
  function pintar() {
    $("#lr").innerHTML = D.remeras.map((r, i) => thumb("r", i, r.url, r.label, r === st.remera)).join("") || vacio("remeras");
    $("#lf").innerHTML = `<button type="button" class="th ninguno ${st.fondo ? "" : "on"}" data-k="f" data-i="-1">Sin fondo</button>` + D.fondo.map((f, i) => thumb("f", i, f.url, f.label, f === st.fondo)).join("");
    $("#lt").innerHTML = `<button type="button" class="th ninguno ${st.tag ? "" : "on"}" data-k="t" data-i="-1">Sin tag</button>` + (D.tags.map((t, i) => thumb("t", i, t.url, t.nombre, t === st.tag)).join("") || vacio("etiquetas/tags"));
    $("#mk").innerHTML = `<option value="-1">Sin etiqueta</option>` + D.marcas.map((m, i) => `<option value="${i}" ${m === st.marca ? "selected" : ""}>${esc(m.marca)}</option>`).join("");
    pintarT(); pintarE();
  }
  function pintarT() {
    const ts = st.marca ? TALLES.filter(t => st.marca.talles[t]) : [];
    $("#tl").innerHTML = ts.map(t => `<button type="button" class="${t === st.talle ? "on" : ""}" data-t="${t}">${t}</button>`).join("") || `<span class="vacio">${D.marcas.length ? "Elegí una marca" : "No hay etiquetas en etiquetas/"}</span>`;
  }
  function pintarE() {
    const t = +$("#ft").value, todos = $("#fa").checked, c = st.remera && st.remera.cod;
    const l = D.estampados.map((e, i) => [e, i]).filter(([e]) => (!t || e.tipo === t) && (todos || !c || e.cods.includes(c)));
    $("#le").innerHTML = (st.estampado ? `<button type="button" class="th ninguno" data-k="e" data-i="-1">Quitar estampado</button>` : "") +
      (l.map(([e, i]) => thumb("e", i, e.url, e.nombre, e === st.estampado)).join("") || `<p class="vacio">${D.estampados.length ? "No hay estampados para este color/tipo. Probá “Mostrar también los de otros colores”." : "No hay imágenes en <b>estampados/</b>."}</p>`);
  }
  const reset = k => { if (k === "est") Object.assign(P.est, AJUSTE[st.estampado ? st.estampado.tipo : 1]); if (k === "eti") Object.assign(P.eti, AJ_ETI); if (k === "tag") Object.assign(P.tag, AJ_TAG); if (k === "hilo") Object.assign(P.hilo, AJ_HILO) };

  $("#ui").addEventListener("click", e => {
    if (!ignorados.length) msg("");
    const g = e.target.closest("#ac button");
    if (g) { st.act = g.dataset.a; return sync() }
    const tl = e.target.closest("#tl button");
    if (tl) { st.talle = tl.dataset.t; pintarT(); return dibujar() }
    const b = e.target.closest(".th"); if (!b) return;
    const i = +b.dataset.i, k = b.dataset.k;
    if (k === "r") st.remera = D.remeras[i];
    if (k === "f") st.fondo = D.fondo[i] || null;
    if (k === "e") { st.estampado = D.estampados[i] || null; if (st.estampado) { reset("est"); st.act = "est" } }
    if (k === "t") { st.tag = D.tags[i] || null; if (st.tag) st.act = "tag" }
    pintar(); dibujar();
  });
  $("#mk").onchange = e => {
    st.marca = D.marcas[+e.target.value] || null;
    if (st.marca) {
      if (!st.marca.talles[st.talle]) st.talle = st.marca.talles.M ? "M" : TALLES.find(t => st.marca.talles[t]);
      const m = D.tags.find(t => limpio(t.nombre) === limpio(st.marca.marca)); if (m) st.tag = m;   // tag con el mismo nombre que la marca
      st.act = "eti";
    }
    pintar(); dibujar();
  };
  $("#ft").onchange = $("#fa").onchange = pintarE;
  [["sz", "w", 1e3], ["px", "cx", 1e3], ["py", "cy", 1e3]].forEach(([id, k, d]) => $("#" + id).oninput = e => { P[st.act][k] = e.target.value / d; dibujar() });
  $("#rt").oninput = e => { P[st.act].rot = +e.target.value; dibujar() };
  $("#rs").onclick = () => { reset(st.act); dibujar() };

  /* ---------- tocar y arrastrar sobre la vista previa ---------- */
  let mov = false, off = { x: 0, y: 0 };
  const punto = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H } };
  const frac = p => ({ x: (p.x - box.x) / box.w, y: (p.y - box.y) / box.h });
  function toque(p) {
    for (const k of ["tag", "eti", "hilo", "est"]) {
      const g = G[k]; if (!g) continue;
      if (k === "hilo") { if (Math.hypot(p.x - g.x, p.y - g.y) <= 30) return k; continue }
      const dx = p.x - g.x, dy = p.y - g.y, c = Math.cos(-g.r), s = Math.sin(-g.r), lx = dx * c - dy * s, ly = dx * s + dy * c;
      if (Math.abs(lx) <= g.w / 2 + 12 && Math.abs(ly) <= g.h / 2 + 12) return k;
    }
    return null;
  }
  const mover = e => {
    if (!mov || !existe(st.act)) return; const f = frac(punto(e));
    P[st.act].cx = Math.min(1, Math.max(0, f.x + off.x)); P[st.act].cy = Math.min(1, Math.max(0, f.y + off.y)); dibujar();
  };
  cv.addEventListener("pointerdown", e => {
    const p = punto(e), k = toque(p), f = frac(p);
    if (k) { st.act = k; off = { x: P[k].cx - f.x, y: P[k].cy - f.y } } else off = { x: 0, y: 0 };
    mov = true; cv.classList.add("mv"); cv.setPointerCapture(e.pointerId); mover(e);
  });
  cv.addEventListener("pointermove", mover);
  ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { mov = false; cv.classList.remove("mv") }));

  /* ---------- exportar ---------- */
  $("#dl").onclick = async () => {
    if (!st.remera) return msg("Elegí una remera primero.", 1);
    await dibujar(false);                           // sin guías para el PNG
    try {
      cv.toBlob(b => {
        if (!b) return msg("No se pudo generar el PNG.", 1);
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre() + ".png";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        msg("Descargado: " + a.download); dibujar();
      }, "image/png");
    } catch (e) { msg("El navegador bloqueó la exportación. Abrí la página desde la web (http/https), no desde el archivo suelto.", 1); dibujar() }
  };

  /* ---------- agregar / renombrar estampados ----------
     Con "Conectar carpeta" (Chrome/Edge) renombra los archivos en tu disco y actualiza lista.json.
     Sin eso, descarga cada imagen ya con el nombre correcto. */
  const FSA = "showDirectoryPicker" in window, PAT = /^(\d+)-(\d)-(\d+)-(.+)$/;
  const A = { dir: null, root: null, base: 0, cola: [], col: new Set(), tipo: 0, busy: false };
  let vistaUrl = null;
  const am = (t, err) => { const e = $("#ad-msg"); e.textContent = t || ""; e.className = "nm" + (err ? " err" : "") };
  const valido = f => { const m = base(f).match(PAT); return !!m && /^[123]+$/.test(m[1]) && !!AJUSTE[m[2]] };
  const entEst = (f, u) => { const m = base(f).match(PAT); return { f, url: u, cods: [...new Set(m[1].split("").map(Number))], tipo: +m[2], id: +m[3], nombre: m[4] } };
  const ordenar = () => D.estampados.sort((a, b) => a.f.localeCompare(b.f, "es", { numeric: true }));
  const sigId = () => Math.max(A.base, 0, ...D.estampados.map(e => e.id)) + 1;      // último ID + 1
  const extDe = n => (n.match(/\.[^.]+$/) || [".png"])[0].toLowerCase();
  const nomFinal = () => {
    const it = A.cola[0], n = limpio($("#ad-nom").value);
    return it && A.col.size && A.tipo && n ? `${[...A.col].sort().join("")}-${A.tipo}-${sigId()}-${n}${extDe(it.n)}` : "";
  };
  const archivos = async d => { const r = []; for await (const [n, h] of d.entries()) if (h.kind === "file" && EXT.test(n)) r.push({ n, h }); return r.sort((a, b) => a.n.localeCompare(b.n, "es", { numeric: true })) };

  function ref() {
    const nf = nomFinal(), q = A.cola.length;
    $("#ad-cont").textContent = q ? `Quedan ${q} por renombrar` : "";
    document.querySelectorAll("#ad-col button").forEach(b => b.classList.toggle("on", A.col.has(b.dataset.c)));
    document.querySelectorAll("#ad-tipo button").forEach(b => b.classList.toggle("on", +b.dataset.t === A.tipo));
    $("#ad-id").textContent = sigId(); $("#ad-res").textContent = nf || "—";
    $("#ad-ok").disabled = !nf || A.busy; $("#ad-skip").disabled = q < 2 || A.busy;
    $("#ad-sum").textContent = "Agregar / renombrar estampados" + (q ? ` (${q} pendiente${q > 1 ? "s" : ""})` : "");
  }
  async function mostrar() {
    if (vistaUrl) { URL.revokeObjectURL(vistaUrl); vistaUrl = null }
    let it;
    while ((it = A.cola[0]) && !it.file) {
      try {
        if (it.h) it.file = await it.h.getFile();
        else { const r = await fetch(it.src, { cache: "no-cache" }); if (!r.ok) throw 0; const b = await r.blob(); it.file = new File([b], it.n, { type: b.type }) }
      } catch (e) { am("No pude leer " + it.n + " (¿abriste la página desde la web o un servidor local?).", true); A.cola.shift() }
    }
    $("#ad-form").hidden = !it;
    if (it) {
      vistaUrl = URL.createObjectURL(it.file); $("#ad-img").src = vistaUrl; $("#ad-orig").textContent = it.n;
      const m = base(it.n).match(PAT);                // si ya venía con formato, precarga lo que pueda
      A.col = new Set(m ? [...new Set(m[1].split("").filter(c => "123".includes(c)))] : []);
      A.tipo = m && AJUSTE[m[2]] ? +m[2] : 0;
      $("#ad-nom").value = limpio(m ? m[4] : base(it.n));
    }
    ref();
  }
  async function escribirLista() {                  // igual que generar-lista, pero desde el navegador
    const nombres = async d => (await archivos(d)).map(x => x.n).sort();
    const sub = async n => { try { return await A.root.getDirectoryHandle(n) } catch (e) { return null } };
    const L = {};
    for (const c of ["remeras", "estampados", "fondo"]) { const d = await sub(c); L[c] = d ? await nombres(d) : [] }
    L.etiquetas = {}; L.tags = [];
    const et = await sub("etiquetas");
    if (et) {
      const dirs = []; for await (const [n, h] of et.entries()) if (h.kind === "directory") dirs.push([n, h]);
      dirs.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      for (const [n, h] of dirs) { if (n.toLowerCase() === "tags") L.tags = await nombres(h); else L.etiquetas[n] = await nombres(h) }
    }
    const w = await (await A.root.getFileHandle("lista.json", { create: true })).createWritable();
    await w.write(JSON.stringify(L, null, 2)); await w.close();
  }
  async function guardar() {
    const it = A.cola[0], nf = nomFinal(); if (!it || !nf || A.busy) return;
    const cols = [...A.col].map(Number).sort(), tipo = A.tipo, id = sigId(), nom = limpio($("#ad-nom").value), file = it.file;
    A.busy = true; ref(); let extra = "";
    try {
      if (A.dir) {
        let hay = true; try { await A.dir.getFileHandle(nf) } catch (e) { hay = false }
        if (hay) throw new Error("ya existe " + nf);
        let borrar = it.h ? it.n : null;            // si el archivo original está en la carpeta, se reemplaza
        if (!borrar) try { const f2 = await (await A.dir.getFileHandle(it.n)).getFile(); if (f2.size === file.size && f2.lastModified === file.lastModified) borrar = it.n } catch (e) { }
        const w = await (await A.dir.getFileHandle(nf, { create: true })).createWritable(); await w.write(file); await w.close();
        if (borrar) { await A.dir.removeEntry(borrar); D.estampados = D.estampados.filter(e => e.f !== borrar) }
        A.base = id;
        if (A.root) { try { await escribirLista(); extra = " · lista.json actualizado" } catch (e) { extra = " · no pude actualizar lista.json (corré generar-lista)" } }
        else extra = " · corré generar-lista para actualizar lista.json";
      } else {
        const u = URL.createObjectURL(file), a = document.createElement("a"); a.href = u; a.download = nf;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
        extra = " · descargado: ponelo en estampados/ (borrá el original) y corré generar-lista";
      }
      const k = ignorados.indexOf(it.n); if (k >= 0) ignorados.splice(k, 1);
      if (!ignorados.length) msg(""); else msg("Archivos ignorados por nombre inválido: " + ignorados.join(", "), 1);
      const ent = { f: nf, url: URL.createObjectURL(file), cods: cols, tipo, id, nombre: nom };
      D.estampados.push(ent); ordenar();
      st.estampado = ent; st.act = "est"; reset("est"); pintarE(); dibujar();       // lo muestra en la remera
      A.cola.shift(); A.busy = false; await mostrar(); am("✔ " + nf + extra);
    } catch (e) { A.busy = false; ref(); am("No se pudo guardar: " + (e && e.message || e), true) }
  }

  $("#ad-col").onclick = e => { const b = e.target.closest("button"); if (!b) return; const c = b.dataset.c; A.col.has(c) ? A.col.delete(c) : A.col.add(c); ref() };
  $("#ad-tipo").onclick = e => { const b = e.target.closest("button"); if (!b) return; A.tipo = +b.dataset.t; ref() };
  $("#ad-nom").oninput = ref;
  $("#ad-nom").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); guardar() } };
  $("#ad-ok").onclick = guardar;
  $("#ad-skip").onclick = () => { A.cola.push(A.cola.shift()); mostrar() };
  $("#ad-sub").onclick = () => $("#ad-file").click();
  $("#ad-file").onchange = e => {
    const vacia = !A.cola.length;
    [...e.target.files].filter(f => EXT.test(f.name)).forEach(f => A.cola.push({ n: f.name, file: f }));
    e.target.value = ""; $("#ad").open = true; am("");
    if (vacia) mostrar(); else ref();
  };
  $("#ad-con").onclick = async () => {
    try {
      const root = await window.showDirectoryPicker({ mode: "readwrite" }), solo = root.name.toLowerCase() === "estampados";
      const dir = solo ? root : await root.getDirectoryHandle("estampados");
      const es = await archivos(dir);
      A.dir = dir; A.root = solo ? null : root;
      A.base = Math.max(0, ...es.filter(x => valido(x.n)).map(x => +x.n.match(PAT)[3]));
      let nuevos = 0;                                // válidos que lista.json todavía no tenía
      es.filter(x => valido(x.n) && !D.estampados.some(d => d.f === x.n)).forEach(x => { D.estampados.push(entEst(x.n, url("estampados", x.n))); nuevos++ });
      if (nuevos) { ordenar(); pintarE() }
      A.cola = A.cola.filter(x => !x.h && !x.src);
      es.filter(x => !valido(x.n)).forEach(x => A.cola.push({ n: x.n, h: x.h }));
      $("#ad-est").textContent = "Carpeta conectada: " + root.name + (solo ? " (solo estampados: no se actualiza lista.json)" : "");
      $("#ad-con").textContent = "Cambiar carpeta";
      am(A.cola.length ? "" : "✔ No hay estampados sin renombrar."); await mostrar();
    } catch (e) {
      if (e.name === "AbortError") return;
      am(e.name === "NotFoundError" ? "No encuentro la carpeta estampados ahí adentro. Elegí la carpeta del proyecto (la que tiene index.html)." : "No pude abrir la carpeta: " + e.message, true);
    }
  };
  function adIniciar() {
    $("#ad-con").hidden = !FSA;
    $("#ad-ayuda").textContent = FSA
      ? "Conectá la carpeta del proyecto (la que tiene index.html) y renombro los archivos ahí mismo, actualizando lista.json. También podés subir imágenes nuevas desde tu PC."
      : "Este navegador no puede escribir en tu carpeta: cada imagen se descarga ya con el nombre correcto. Para renombrar directo usá Chrome o Edge en la compu.";
    ignorados.filter(f => !f.includes("/")).forEach(f => A.cola.push({ n: f, src: url("estampados", f) }));
    mostrar();
  }

  /* ---------- inicio ---------- */
  (async () => {
    parsear(await listar());
    st.remera = D.remeras[0] || null;
    pintar(); dibujar(); adIniciar();
    if (ignorados.length) msg("Archivos ignorados por nombre inválido: " + ignorados.join(", "), 1);
    else if (!D.remeras.length) msg("No se encontraron remeras. Si abriste el archivo directo desde tu PC, usá un servidor local o subilo a la web.", 1);
  })();
})();
