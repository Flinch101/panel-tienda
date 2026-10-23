const $=s=>document.querySelector(s),CATS=["conjuntos","remeras","shorts","buzos","pantalones"],PRE={conjuntos:"con",remeras:"rem",shorts:"sho",buzos:"buz",pantalones:"pan"},SZ=["S","M","L","XL","XXL"];
const KEYS=["nombre","subtitulo","descripcionCorta","descripcion","categoria","subcategoria","marca","modelo","genero","estado","fechaPublicacion"];
let data={},sha="",cfg={};
try{cfg=JSON.parse(localStorage.getItem("adm"))||{}}catch(e){}
const F=$("#cfg"),dlg=$("#dlg");
["owner","repo","branch","path","token"].forEach(k=>F[k].value=cfg[k]||(k=="branch"?"main":k=="path"?"data/productos.json":""));
const api=()=>`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
const H=()=>({Authorization:"Bearer "+cfg.token,Accept:"application/vnd.github+json"});
const msg=(t,ok=1)=>{$("#msg").textContent=t;$("#msg").className=ok?"":"err"};
const all=()=>CATS.flatMap(c=>data[c]||[]),find=id=>all().find(p=>p.id===id);
const dirty=()=>$("#pub").classList.add("dirty");
F.onsubmit=e=>{e.preventDefault();cfg=Object.fromEntries(new FormData(F));localStorage.setItem("adm",JSON.stringify(cfg));load()};
async function load(){
 try{const r=await fetch(api()+"?ref="+cfg.branch,{headers:H()});if(!r.ok)throw r.status;const j=await r.json();sha=j.sha;
 data=JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,"")))));CATS.forEach(c=>data[c]=data[c]||[]);list();msg("JSON cargado.")}
 catch(e){msg("No se pudo cargar (error "+e+"). Revisá usuario, repositorio, ruta y token.",0)}}
function list(){
 const q=$("#s").value.toLowerCase();
 $("#tb").innerHTML=all().filter(p=>(p.nombre+p.id).toLowerCase().includes(q)).map(p=>`<tr><td>${p.id}</td><td>${p.nombre}</td><td>${p.categoria}</td><td>$${p.precio}</td><td><span class="tag ${p.estado}">${p.estado}</span></td><td><button data-e="${p.id}">Editar</button> <button class="alt" data-d="${p.id}">Eliminar</button></td></tr>`).join("")||"<tr><td colspan=6>No hay productos. Creá el primero con “Nuevo producto”.</td></tr>"}
$("#tb").onclick=e=>{const x=e.target.dataset;
 if(x.e)edit(find(x.e));
 if(x.d&&confirm("¿Eliminar este producto?")){const p=find(x.d);data[p.categoria]=data[p.categoria].filter(y=>y.id!==p.id);list();dirty()}};
$("#nuevo").onclick=()=>edit();
function edit(p){
 const f=$("#pf");f.dataset.id=p?p.id:"";
 p=p||{categoria:"remeras",genero:"unisex",estado:"Borrador",talles:[],stock:{},colores:[],fotos:[],cuotas:{}};
 KEYS.concat("precio").forEach(k=>f[k].value=p[k]??"");
 f.colores.value=p.colores.join(", ");f.fotos.value=p.fotos.join("\n");
 f.cuotasTiene.checked=!!p.cuotas.tiene;f.cuotasCant.value=p.cuotas.cantidad||"";f.cuotasDet.value=p.cuotas.detalle||"";
 $("#sz").innerHTML=SZ.map(s=>`<label><input type="checkbox" data-t="${s}" ${p.talles.includes(s)?"checked":""}> ${s}<input type="number" min="0" data-s="${s}" value="${(p.stock||{})[s]||0}"></label>`).join("");
 dlg.showModal()}
$("#pf").onsubmit=e=>{
 e.preventDefault();const f=e.target,old=f.dataset.id&&find(f.dataset.id),cat=f.categoria.value;
 const talles=SZ.filter(s=>f.querySelector(`[data-t=${s}]`).checked),stock={};
 talles.forEach(s=>stock[s]=+f.querySelector(`[data-s=${s}]`).value);
 const id=old&&old.categoria===cat?old.id:PRE[cat]+(Math.max(0,...data[cat].map(p=>+p.id.slice(3)||0))+1);
 const p={id};KEYS.forEach(k=>p[k]=f[k].value);
 Object.assign(p,{colores:f.colores.value.split(",").map(s=>s.trim()).filter(Boolean),talles,stock,precio:+f.precio.value,
  cuotas:{tiene:f.cuotasTiene.checked,cantidad:+f.cuotasCant.value||0,detalle:f.cuotasDet.value},
  fotos:f.fotos.value.split("\n").map(s=>s.trim()).filter(Boolean)});
 if(old)data[old.categoria]=data[old.categoria].filter(x=>x.id!==old.id);
 data[cat].push(p);dlg.close();list();dirty()};
$("#pub").onclick=async()=>{
 try{const r=await fetch(api(),{method:"PUT",headers:H(),body:JSON.stringify({message:"Actualizar productos "+new Date().toISOString(),content:btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2)))),sha,branch:cfg.branch})});
 if(!r.ok)throw r.status;sha=(await r.json()).content.sha;$("#pub").classList.remove("dirty");msg("Commit realizado. La tienda se actualiza en unos minutos.")}
 catch(e){msg("No se pudo publicar (error "+e+"). Si es 409, volvé a cargar el JSON.",0)}};
$("#dl").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="productos.json";a.click()};
if(cfg.token)load();

const nextId=cat=>PRE[cat]+(Math.max(0,...data[cat].map(p=>+p.id.slice(3)||0))+1);
$("#up").onchange=async e=>{
 const f=$("#pf"),old=f.dataset.id&&find(f.dataset.id),cat=f.categoria.value,id=old&&old.categoria===cat?old.id:nextId(cat);
 const names=f.fotos.value.split("\n").map(s=>s.trim()).filter(Boolean);
 for(const file of e.target.files){
  try{
   const b=await createImageBitmap(file),k=Math.min(1,1200/Math.max(b.width,b.height)),c=document.createElement("canvas");
   c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);c.getContext("2d").drawImage(b,0,0,c.width,c.height);
   const d=c.toDataURL("image/webp",.82),ok=d.startsWith("data:image/webp"),ext=ok?"webp":"jpg",b64=(ok?d:c.toDataURL("image/jpeg",.82)).split(",")[1];
   let n=names.length+1,name;do{name=`${id}-${n++}.${ext}`}while(names.includes(name));
   const r=await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/fotos/${name}`,{method:"PUT",headers:H(),body:JSON.stringify({message:"Foto "+name,content:b64,branch:cfg.branch})});
   if(!r.ok)throw r.status;
   names.push(name);f.fotos.value=names.join("\n");msg("Foto subida: "+name)
  }catch(err){msg("No se pudo subir "+file.name+" (error "+err+")",0)}
 }
 e.target.value=""};
