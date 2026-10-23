(function(){
const R=document.body.dataset.root||"",C=CONFIG,$=(s,e=document)=>e.querySelector(s);
const money=n=>"$"+Number(n).toLocaleString("es-AR");
const wa=t=>`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(t)}`;
const line=i=>`HOLA QUIERO ESTE PRODUCTO ${i.n}, TALLE ${i.t}, COLOR ${i.c}`+(i.p?`\nCantidad: ${i.q}\nPrecio: ${money(i.p*i.q)}`:"");
const order=a=>"¡Hola! Quiero hacer este pedido:\n\n"+a.map((i,k)=>`${k+1}) ${i.n}\n    Talle: ${i.t} | Color: ${i.c}\n    ${i.q} x ${money(i.p)} = ${money(i.p*i.q)}`).join("\n\n")+`\n\nTOTAL: ${money(a.reduce((s,i)=>s+i.p*i.q,0))}\n\n--- Datos para coordinar el envío (completá acá) ---\nNombre: \nLocalidad y dirección: \nEnvío o retiro en el local: \nForma de pago: \nComentarios: `;
const cols=p=>p.colores&&p.colores.length?p.colores:["Único"];
function add(p,t,c,q){const f=cart.find(i=>i.id===p.id&&i.t===t&&i.c===c);f?f.q+=q:cart.push({id:p.id,n:p.nombre,t,c,p:p.precio,q});save();$("#cart").classList.add("on")}
const foto=f=>!f?R+"logo.png":/^http/.test(f)?f:C.fotos+f;
const sz=p=>p.talles.filter(t=>!p.stock||p.stock[t]!==0);
let cart=[],all=[];
try{cart=JSON.parse(localStorage.getItem("carrito"))||[]}catch(e){}
const save=()=>{try{localStorage.setItem("carrito",JSON.stringify(cart))}catch(e){}draw()};
const nav=[["Inicio","index.html"],["Productos","productos/productos.html"],["Contacto","contacto/contacto.html"],["Quiénes somos","quienes-somos/quienes-somos.html"],["Preguntas frecuentes","preguntas-frecuentes/preguntas-frecuentes.html"],["Guía de talles","guia-de-talles/guia-de-talles.html"]];
$("#h").innerHTML=`<div class="top"><form action="${R}productos/productos.html"><input name="q" placeholder="Buscar productos" aria-label="Buscar"><button aria-label="Buscar">🔍</button></form><a href="${R}index.html"><img src="${R}logo.png" alt="Logo"></a><button id="cb">🛒 <span id="cn">0</span></button></div><nav>${nav.map(n=>`<a href="${R+n[1]}">${n[0]}</a>`).join("")}</nav>`;
$("#f").innerHTML=`<div class="fg"><div><h4>NAVEGACIÓN</h4>${nav.map(n=>`<a href="${R+n[1]}">${n[0]}</a>`).join("")}</div>
<div><h4>MEDIOS DE PAGO</h4><p>Visa, Mastercard, American Express, Naranja, Cabal, tarjetas de débito, transferencia y efectivo.</p></div>
<div><h4>CONTACTO</h4><a href="${wa("Hola, quiero hacer una consulta")}">WhatsApp</a><a href="mailto:${C.mail}">${C.mail}</a><a href="${C.maps}">Ubicación</a></div>
<div><h4>REDES</h4><a href="${C.ig}">Instagram</a><a href="${C.fb}">Facebook</a><a href="${C.tt}">TikTok</a></div></div>`;
document.body.insertAdjacentHTML("beforeend",`<aside id="cart"><button id="cx" aria-label="Cerrar">✕</button><h2>Tu carrito</h2><ul id="ci"></ul><p>Total: <b id="ct"></b></p><a id="cw" target="_blank">Enviar pedido por WhatsApp</a></aside><a class="fab" target="_blank" aria-label="WhatsApp" href="${wa("Hola, quiero hacer una consulta")}">💬</a>`);
function draw(){
 $("#cn").textContent=cart.reduce((a,i)=>a+i.q,0);
 $("#ci").innerHTML=cart.map((i,k)=>`<li><span>${i.n}<br><small>Talle ${i.t} · ${i.c}</small><br><button data-q="${k}:-1" aria-label="Menos">−</button> ${i.q} <button data-q="${k}:1" aria-label="Más">+</button></span><b>${money(i.p*i.q)}</b><button data-r="${k}" aria-label="Quitar">✕</button></li>`).join("")||"<li>El carrito está vacío.</li>";
 $("#ct").textContent=money(cart.reduce((a,i)=>a+i.p*i.q,0));
 $("#cw").href=wa(cart.length?order(cart):"Hola, quiero hacer una consulta");
}
document.addEventListener("click",e=>{
 const x=e.target;
 if(x.closest("#cb"))$("#cart").classList.add("on");
 if(x.closest("#cx"))$("#cart").classList.remove("on");
 if(x.dataset.r){cart.splice(x.dataset.r,1);save()}
 if(x.dataset.q){const[k,d]=x.dataset.q.split(":");cart[k].q+=+d;if(cart[k].q<1)cart.splice(k,1);save()}
 const a=x.dataset.a;
 if(a){const c=x.closest(".card"),p=all.find(p=>p.id===c.dataset.id),t=$(".t",c).value,co=$(".c",c).value;
  if(a==="wa")window.open(wa(line({n:p.nombre,t,c:co,q:1,p:p.precio})),"_blank");
  else add(p,t,co,1)}
});
async function load(){
 for(const u of [C.json,R+C.local]){try{const r=await fetch(u,{cache:"no-cache"});if(r.ok){all=Object.values(await r.json()).flat().filter(p=>p.estado==="Publicado");return all}}catch(e){}}
 return all}
const opt=a=>a.map(v=>`<option>${v}</option>`).join("");
const pu=p=>`${R}producto/producto.html?id=${p.id}`;
const img=(f,a)=>`<img src="${foto(f)}" alt="${a}" width="600" height="800" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${R}logo.png'">`;
const card=p=>`<article class="card" data-id="${p.id}"><a href="${pu(p)}">${img(p.fotos&&p.fotos[0],p.nombre)}<h3>${p.nombre}</h3></a><p class="sub">${p.descripcionCorta||""}</p><b>${money(p.precio)}</b>${p.cuotas&&p.cuotas.tiene?`<small>${p.cuotas.detalle||""}</small>`:""}<div class="sel"><select class="t" aria-label="Talle">${opt(sz(p))}</select><select class="c" aria-label="Color">${opt(cols(p))}</select></div><button data-a="add">Agregar al carrito</button><button class="alt" data-a="wa">Pedir por WhatsApp</button></article>`;
window.T={load,card,sz,cols,img,add,line,money,wa};
[C.json,C.fotos].forEach(u=>{try{document.head.insertAdjacentHTML("beforeend",`<link rel="preconnect" href="${new URL(u).origin}">`)}catch(e){}});
draw();
})();
