/* Organa · Lista de precios (Punto 2). Datos propios: su planilla de Google, con respaldo en datos.json. */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>"$"+Math.round(Number(n)||0).toLocaleString("es-CL");
const normal=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const K=k=>"lista2-"+k;                       // claves propias: no se mezclan con el otro catálogo
function store(k,v){try{if(v===undefined)return localStorage.getItem(K(k));if(v===null)localStorage.removeItem(K(k));else localStorage.setItem(K(k),v);}catch(e){return null;}}

let DATA=null, busq="";
const waNum=()=>String(DATA.tienda.whatsapp||"").replace(/\D/g,"");
const waLink=t=>"https://wa.me/"+waNum()+"?text="+encodeURIComponent(t);
const waVis=()=>{const d=waNum();return d.length===11&&d.startsWith("569")?`+56 9 ${d.slice(3,7)} ${d.slice(7)}`:"+"+d;};
const visibles=()=>DATA.productos.filter(p=>p.estado!=="oculto"&&p.variantes&&p.variantes.length);
const prod=id=>DATA.productos.find(p=>p.id===id);
const opDe=(p,i)=>{const o=(p.variantes[i]&&p.variantes[i].opcion)||p.opcion;return o&&o.valores&&o.valores.length?o:null;};

/* ---------- carga ---------- */
async function cargar(){
  let pub=null; try{const r=await fetch("datos.json",{cache:"no-store"});if(r.ok)pub=await r.json();}catch(e){}
  let cache=null; try{cache=JSON.parse(store("planilla")||"null");}catch(e){}
  DATA=cache||pub; if(DATA) render(false);
  try{
    const pl=await Promise.race([window.cargarPlanilla(),new Promise((_,no)=>setTimeout(()=>no(new Error("tiempo")),9000))]);
    store("planilla",JSON.stringify(pl)); DATA=pl; render(true);
  }catch(e){ console.warn("Planilla no disponible:",e.message); if(DATA) $("#actualizado").textContent="Precios guardados"; }
  if(!DATA) $("#lista").innerHTML='<p class="vacio">No se pudo cargar la lista. Revisa tu conexión y recarga.</p>';
}

/* ---------- lista ---------- */
let carro={}; try{carro=JSON.parse(store("carro")||"{}")||{};}catch(e){carro={};}
const guardarCarro=()=>store("carro",JSON.stringify(carro));
function cantVar(pid,vi){let n=0;for(const k in carro){const [a,b]=k.split("|");if(a===pid&&+b===vi)n+=carro[k];}return n;}

function grupos(){
  const vistos=new Set();
  const gs=DATA.categorias.map(c=>{const ps=visibles().filter(p=>p.cat[0]===c.id&&!vistos.has(p.id));ps.forEach(p=>vistos.add(p.id));return {c,ps};});
  const otros=visibles().filter(p=>!vistos.has(p.id)); if(otros.length) gs.push({c:{id:"otros",nombre:"Otros"},ps:otros});
  return gs.filter(g=>g.ps.length);
}
function coincide(p){
  if(!busq) return true;
  const t=normal([p.nombre,p.nota,p.medida,p.variantes.map(v=>v.nombre+" "+(v.detalle||"")).join(" ")].join(" "));
  return busq.split(/\s+/).every(w=>t.includes(w));
}
function render(alDia){
  if(alDia!==undefined) $("#actualizado").textContent=alDia?"Precios al día":"";
  renderTienda();
  const gs=grupos().map(g=>({c:g.c,ps:g.ps.filter(coincide)})).filter(g=>g.ps.length);
  $("#tabs").innerHTML=gs.map(g=>`<button class="tab" type="button" data-id="${esc(g.c.id)}">${esc(g.c.nombre)}</button>`).join("");
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{const s=document.getElementById("s-"+t.dataset.id);if(s)s.scrollIntoView({behavior:"smooth"});});
  const L=$("#lista");
  if(!gs.length){L.innerHTML='<p class="vacio">No hay productos con esa búsqueda.</p>';pintarBarra();return;}
  L.innerHTML=gs.map(g=>`<section class="sec" id="s-${esc(g.c.id)}" data-id="${esc(g.c.id)}"><h2>${esc(g.c.nombre)}<span>${g.ps.length}</span></h2>${g.ps.map(filaProd).join("")}</section>`).join("");
  L.querySelectorAll("[data-ver]").forEach(b=>b.onclick=()=>verDetalle(b.dataset.ver));
  L.querySelectorAll("[data-mas]").forEach(b=>b.onclick=()=>{const [pid,vi]=b.dataset.mas.split("|");sumar(pid,+vi);});
  L.querySelectorAll("[data-menos]").forEach(b=>b.onclick=()=>{const [pid,vi]=b.dataset.menos.split("|");restar(pid,+vi);});
  observarTabs(); pintarBarra();
}
function filaProd(p){
  const ag=p.estado==="agotado";
  const meta=[p.medida,p.nota].filter(Boolean).map(esc).join(" · ");
  return `<article class="prod">
    <button class="foto" type="button" data-ver="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}" style="background-image:url('${esc(p.img)}')"></button>
    <div class="cuerpo">
      <div class="tit"><button class="nom" type="button" data-ver="${esc(p.id)}">${esc(p.nombre)}</button></div>
      ${meta||ag?`<div class="meta">${ag?'<span class="ag">Agotado</span>'+(meta?" · ":""):""}${meta}</div>`:""}
      ${p.variantes.map((v,i)=>{
        const n=cantVar(p.id,i), unica=p.variantes.length===1&&v.nombre==="Única";
        return `<div class="op"><span class="on">${unica?"Precio":esc(v.nombre)}${v.detalle&&!unica?`<small>${esc(v.detalle)}</small>`:""}</span><span class="pts" aria-hidden="true"></span><span class="pr num">${fmt(v.precio)}</span>
          <span class="cnt${n?" activo":""}" ${ag?'aria-disabled="true"':""}><button type="button" data-menos="${esc(p.id)}|${i}" aria-label="Quitar ${esc(p.nombre)} ${esc(v.nombre)}">−</button><span class="num" aria-live="polite">${n}</span><button type="button" data-mas="${esc(p.id)}|${i}" aria-label="Agregar ${esc(p.nombre)} ${esc(v.nombre)}">+</button></span></div>`;
      }).join("")}
    </div></article>`;
}
function observarTabs(){
  if(!("IntersectionObserver" in window)) return;
  if(window._obs) window._obs.disconnect();
  window._obs=new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-current",String(t.dataset.id===e.target.dataset.id)));
      const a=document.querySelector('.tab[aria-current="true"]'); if(a) a.scrollIntoView({block:"nearest",inline:"center"}); } });
  },{rootMargin:"-160px 0px -60% 0px"});
  document.querySelectorAll(".sec").forEach(s=>window._obs.observe(s));
}
$("#q").addEventListener("input",e=>{busq=normal(e.target.value.trim());render();});

/* ---------- pedido ---------- */
function sumar(pid,vi){
  const p=prod(pid), op=opDe(p,vi);
  if(op){ elegir(p,vi,op); return; }
  const k=`${pid}|${vi}|`; carro[k]=(carro[k]||0)+1; cambioCarro();
}
function restar(pid,vi){
  const ks=Object.keys(carro).filter(k=>{const [a,b]=k.split("|");return a===pid&&+b===vi;});
  const k=ks[ks.length-1]; if(!k) return;
  carro[k]--; if(carro[k]<=0) delete carro[k]; cambioCarro();
}
function cambioCarro(){ guardarCarro(); render(); }
function lineas(){
  return Object.keys(carro).map(k=>{const [pid,vi,op]=k.split("|");const p=prod(pid);const v=p&&p.variantes[+vi];
    return p&&v&&p.estado!=="oculto"?{k,p,v,op,n:carro[k]}:null;}).filter(Boolean);
}
function pintarBarra(){
  const ls=lineas(); Object.keys(carro).forEach(k=>{if(!ls.some(l=>l.k===k))delete carro[k];});
  const tot=ls.reduce((s,l)=>s+l.v.precio*l.n,0), n=ls.reduce((s,l)=>s+l.n,0);
  $("#total").textContent=fmt(tot);
  $("#cuenta").textContent=n?`${n} ${n===1?"producto":"productos"} en tu pedido`:"Tu pedido está vacío";
  $("#verPedido").disabled=!n;
}
const detTxt=l=>[l.v.nombre!=="Única"?l.v.nombre:null,l.op||null].filter(Boolean).join(", ");
function verPedido(){
  const ls=lineas(); if(!ls.length) return;
  $("#pItems").innerHTML=ls.map(l=>`<div class="item"><span class="t">${l.n} × ${esc(l.p.nombre)}${detTxt(l)?`<small>${esc(detTxt(l))}</small>`:""}</span><b class="num">${fmt(l.v.precio*l.n)}</b></div>`).join("");
  $("#pTotal").textContent=fmt(ls.reduce((s,l)=>s+l.v.precio*l.n,0));
  avisoEnt(); abrir("#hPedido");
}
$("#verPedido").onclick=verPedido;
function avisoEnt(){const r=$("#eRet").checked;$("#pDirW").hidden=r;$("#pDir").required=!r;$("#pAviso").textContent=r?`Retiro en ${DATA.tienda.puntoVenta||"punto de venta"}.`:"El valor del despacho se coordina por WhatsApp.";}
$("#eRet").onchange=avisoEnt; $("#eDes").onchange=avisoEnt;
$("#pVaciar").onclick=()=>{carro={};cambioCarro();cerrar();toast("Pedido vaciado");};
$("#pForm").addEventListener("submit",e=>{
  e.preventDefault(); const ls=lineas(); if(!ls.length) return;
  const tot=ls.reduce((s,l)=>s+l.v.precio*l.n,0), r=$("#eRet").checked;
  let t=`Hola Organa, quiero hacer este pedido:\n\n${ls.map(l=>`• ${l.n} x ${l.p.nombre}${detTxt(l)?" ("+detTxt(l)+")":""} - ${fmt(l.v.precio*l.n)}`).join("\n")}\n\nTotal: ${fmt(tot)}\n\nNombre: ${$("#pNom").value.trim()}\nEntrega: ${r?"Retiro en "+DATA.tienda.puntoVenta:"Despacho a "+$("#pDir").value.trim()}`;
  const nota=$("#pNota").value.trim(); if(nota) t+=`\nComentario: ${nota}`;
  const a=document.createElement("a"); a.href=waLink(t); a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove();
  toast("Abriendo WhatsApp…");
});

/* ---------- elegir aroma / variedad ---------- */
function elegir(p,vi,op){
  $("#eTit").textContent=`${op.nombre||"Elige"}`;
  $("#eSub").textContent=`${p.nombre}${p.variantes[vi].nombre!=="Única"?" · "+p.variantes[vi].nombre:""}`;
  $("#eOps").innerHTML=op.valores.map(v=>`<button type="button">${esc(v)}</button>`).join("");
  [...$("#eOps").children].forEach((b,i)=>b.onclick=()=>{const k=`${p.id}|${vi}|${op.valores[i]}`;carro[k]=(carro[k]||0)+1;cerrar();cambioCarro();toast(`Agregado: ${op.valores[i]}`);});
  abrir("#hElegir");
}

/* ---------- detalle ---------- */
function descHTML(txt){
  const ls=String(txt||"").split(/\n+/).map(s=>s.trim()).filter(Boolean); let h="",l=null;
  const cer=()=>{if(l){h+=`</${l}>`;l=null;}};
  ls.forEach(x=>{let m;
    if((m=x.match(/^[•\-–]\s*(.+)/))){if(l!=="ul"){cer();h+="<ul>";l="ul";}h+=`<li>${esc(m[1])}</li>`;return;}
    if((m=x.match(/^\d+[.)]\s*(.+)/))){if(l!=="ol"){cer();h+="<ol>";l="ol";}h+=`<li>${esc(m[1])}</li>`;return;}
    cer(); h+=`<p>${esc(x)}</p>`;});
  cer(); return h;
}
function verDetalle(id){
  const p=prod(id); if(!p) return;
  $("#dNom").textContent=p.nombre; $("#dImg").style.backgroundImage=`url('${p.img}')`; $("#dImg").setAttribute("aria-label",p.nombre);
  $("#dMeta").textContent=[p.medida,p.nota,p.estado==="agotado"?"Agotado por ahora":""].filter(Boolean).join(" · ");
  $("#dDesc").innerHTML=descHTML(p.desc); abrir("#hDetalle");
}

/* ---------- tienda ---------- */
function aMin(s){const[a,b]=String(s||"0:0").split(":").map(Number);return a*60+(b||0);}
function hoy(){try{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",weekday:"short"}).formatToParts(new Date());return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(p.find(x=>x.type==="weekday").value);}catch(e){return (new Date().getDay()+6)%7;}}
function renderTienda(){
  const t=DATA.tienda;
  $("#subtitulo").textContent="Lista de precios"+(t.puntoVenta?" · "+t.puntoVenta:"");
  const w=$("#wsp"); w.textContent=waVis(); w.href=waLink("Hola Organa, tengo una consulta.");
  $("#pv").textContent=t.puntoVenta||"a coordinar";
  const m=$("#mapa"); m.hidden=!t.mapa; if(t.mapa) m.href=t.mapa;
  const ig=$("#ig"); ig.textContent="@"+(t.instagram||""); ig.href="https://instagram.com/"+(t.instagram||"");
  const hs=t.horarios||[], d=hoy();
  $("#horas").hidden=!hs.some(h=>h.abierto);
  $("#horas").innerHTML=hs.map((h,i)=>`<tr class="${i===d?"hoy":""}"><td>${esc(h.dia)}</td><td class="num">${h.abierto?esc(h.desde)+" – "+esc(h.hasta):"Cerrado"}</td></tr>`).join("");
  $("#notaH").textContent=t.notaHorario||"";
}

/* ---------- compartir ---------- */
$("#abrirQR").onclick=()=>{
  const link=(DATA&&DATA.tienda.link)||location.href.split("#")[0];
  $("#qLink").value=link; $("#qWsp").href="https://wa.me/?text="+encodeURIComponent("Lista de precios Organa: "+link); abrir("#hQR");
};
$("#qCopiar").onclick=async()=>{const i=$("#qLink");try{await navigator.clipboard.writeText(i.value);toast("Link copiado");}catch(e){i.select();toast("Link seleccionado");}};

/* ---------- hojas + botón atrás ---------- */
let abierta=null;
function abrir(sel){
  const st={h:sel.slice(1)};
  try{ if(history.state&&history.state.h) history.replaceState(st,""); else history.pushState(st,""); }catch(e){}
  if(abierta) cerrarReal(true);
  const el=$(sel); el.hidden=false; requestAnimationFrame(()=>{el.classList.add("on");$("#velo").classList.add("on");});
  abierta=el; document.body.style.overflow="hidden";
}
function cerrarReal(rapido){
  const el=abierta; if(!el) return; abierta=null; el.classList.remove("on");
  if(rapido) el.hidden=true; else setTimeout(()=>{if(!el.classList.contains("on"))el.hidden=true;},260);
  if(!rapido){ $("#velo").classList.remove("on"); document.body.style.overflow=""; }
}
function cerrar(){ if(abierta&&history.state&&history.state.h===abierta.id) history.back(); else cerrarReal(); }
window.addEventListener("popstate",e=>{ const st=e.state||{}; if(abierta&&st.h!==abierta.id) cerrarReal(); });
try{ if(history.state&&history.state.h) history.replaceState(null,""); }catch(e){}
$("#velo").onclick=cerrar;
document.querySelectorAll("[data-cerrar]").forEach(b=>b.onclick=cerrar);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&abierta)cerrar();});
let tt; function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("on"),1800);}

cargar();
})();
