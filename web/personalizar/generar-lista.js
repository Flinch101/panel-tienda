// Crea lista.json con los archivos de remeras/, estampados/, fondo/ y etiquetas/.
// Correr cada vez que agregues o borres imágenes:  node generar-lista.js
const fs = require("fs"), path = require("path");
const imgs = (...r) => { const d = path.join(__dirname, ...r); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.(png|webp|jpe?g)$/i.test(f)).sort() : [] };
const lista = {};
for (const c of ["remeras", "estampados", "fondo"]) lista[c] = imgs(c);
const et = path.join(__dirname, "etiquetas");
lista.etiquetas = {};
if (fs.existsSync(et)) for (const m of fs.readdirSync(et).sort())
  if (fs.statSync(path.join(et, m)).isDirectory() && m.toLowerCase() !== "tags") lista.etiquetas[m] = imgs("etiquetas", m);
lista.tags = imgs("etiquetas", "tags");
fs.writeFileSync(path.join(__dirname, "lista.json"), JSON.stringify(lista, null, 2));
console.log(JSON.stringify(lista, (k, v) => Array.isArray(v) ? v.length : v));
