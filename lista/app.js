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
  }catch(e){ console.warn("Planilla no disponible:",e.message); if(DATA) $("#actualizado").textContent=""; }
  if(!DATA) $("#lista").innerHTML='<p class="vacio">No se pudo cargar la lista. Revisa tu conexión y recarga.</p>';
}

/* ---------- lista ---------- */
let carro={}; try{carro=JSON.parse(store("carro")||"{}")||{};}catch(e){carro={};}
const guardarCarro=()=>store("carro",JSON.stringify(carro));
function cantVar(pid,vi){let n=0;for(const k in carro){const [a,b]=k.split("|");if(a===pid&&+b===vi)n+=carro[k];}return n;}

function grupos(){
  const vistos=new Set();
  const gs=DATA.categorias.map(c=>{const ps=visibles().filter(p=>p.cat.includes(c.id));ps.forEach(p=>vistos.add(p.id));return {c,ps};});
  const otros=visibles().filter(p=>!vistos.has(p.id)); if(otros.length) gs.push({c:{id:"otros",nombre:"Otros"},ps:otros});
  return gs.filter(g=>g.ps.length);
}
function coincide(p){
  if(!busq) return true;
  const t=normal([p.nombre,p.nota,p.medida,p.variantes.map(v=>v.nombre+" "+(v.detalle||"")).join(" ")].join(" "));
  return busq.split(/\s+/).every(w=>t.includes(w));
}
function render(alDia){
  if(alDia!==undefined) $("#actualizado").textContent=alDia?"✓ Precios actualizados":"";
  renderTienda();
  const gs=grupos().map(g=>({c:g.c,ps:g.ps.filter(coincide)})).filter(g=>g.ps.length);
  $("#tabs").innerHTML=gs.map(g=>`<button class="tab" type="button" data-id="${esc(g.c.id)}">${esc(g.c.nombre)}</button>`).join("");
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{const s=document.getElementById("s-"+t.dataset.id);if(!s)return;
    marcarTab(t.dataset.id); pausaTabs=Date.now();
    const h=document.querySelector(".cab").offsetHeight;
    window.scrollTo({top:Math.max(0,s.getBoundingClientRect().top+window.scrollY-h-8),behavior:"auto"});});
  const L=$("#lista");
  if(!gs.length){L.innerHTML='<p class="vacio">No hay productos con esa búsqueda.</p>';pintarBarra();return;}
  L.innerHTML=gs.map(g=>`<section class="sec" id="s-${esc(g.c.id)}" data-id="${esc(g.c.id)}"><h2>${esc(g.c.nombre)}<small>${g.ps.length}</small></h2><div class="cards">${g.ps.map(filaProd).join("")}</div></section>`).join("");
  observarTabs(); dispatchEvent(new Event("scroll")); pintarBarra();
}
function resumen(t){
  const l=String(t||"").split(/\n/)[0].trim(); const m=l.match(/^.{25,}?[.;:](\s|$)/);
  let r=(m?m[0]:l).trim(); if(r.length>130) r=r.slice(0,125).replace(/\s+\S*$/,"")+"…";
  return r;
}
function filaProd(p){
  const ag=p.estado==="agotado", unica=p.variantes.length===1&&p.variantes[0].nombre==="Única";
  const chips=[p.medida?`<span class="chip">${esc(p.medida)}</span>`:"",p.nota?`<span class="chip para">${esc(p.nota)}</span>`:"",ag?'<span class="chip ag">Agotado por ahora</span>':""].join("");
  const conSel=p.variantes.some((v,i)=>opDe(p,i));
  const sirve=resumen(p.desc);
  return `<article class="prod${ag?" ag":""}" data-id="${esc(p.id)}">
    <div class="p-top">
      <button class="p-foto" type="button" data-ver="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}" style="background-image:url('${esc(p.img)}')"></button>
      <div style="min-width:0"><button class="p-nom" type="button" data-ver="${esc(p.id)}">${esc(p.nombre)}</button>${chips?`<div class="chips">${chips}</div>`:""}</div>
    </div>
    ${sirve?`<p class="p-sirve"><b>¿Para qué sirve?</b> ${esc(sirve)} <button type="button" data-ver="${esc(p.id)}">Leer más</button></p>`:""}
    <div class="ops">
      ${!unica?`<div class="ops-tit">${p.variantes.length===1?"1 opción":p.variantes.length+" opciones · elige la tuya"}</div>`:""}
      ${p.variantes.map((v,i)=>{
        const n=cantVar(p.id,i);
        return `<div class="op${n?" activo":""}"><span class="on">${unica?"Precio":esc(v.nombre)}${v.detalle&&!unica?`<small>${esc(v.detalle)}</small>`:""}</span><span class="pr num">${fmt(v.precio)}</span>
          <span class="cnt${n?"":" cero"}" ${ag?'aria-disabled="true"':""}><button class="menos" type="button" data-menos="${esc(p.id)}|${i}" aria-label="Quitar ${esc(p.nombre)} ${esc(v.nombre)}">−</button><span class="num" aria-live="polite">${n}</span><button class="mas" type="button" data-mas="${esc(p.id)}|${i}" aria-label="Agregar ${esc(p.nombre)} ${esc(v.nombre)}">+</button></span></div>`;
      }).join("")}
      ${conSel&&!ag?`<p class="pista">Al tocar + eliges ${esc(((p.variantes.map((v,i)=>opDe(p,i)).find(Boolean))||{}).nombre||"la variedad").toLowerCase()}.</p>`:""}
    </div></article>`;
}
let pausaTabs=0;
function marcarTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-current",String(t.dataset.id===id)));
  const a=document.querySelector('.tab[aria-current="true"]'); if(a){const n=a.parentElement;n.scrollTo({left:a.offsetLeft-n.clientWidth/2+a.clientWidth/2,behavior:"smooth"});}
}
function observarTabs(){
  if(window._tabsScroll) return;
  window._tabsScroll=true;
  let tic=false;
  addEventListener("scroll",()=>{ if(tic) return; tic=true; requestAnimationFrame(()=>{ tic=false;
    if(Date.now()-pausaTabs<350) return;
    const tope=(document.querySelector(".cab").getBoundingClientRect().bottom||0)+20;
    let actual=null; document.querySelectorAll(".sec").forEach(s=>{ if(s.getBoundingClientRect().top<=tope) actual=s.dataset.id; });
    if(!actual){const s=document.querySelector(".sec"); actual=s&&s.dataset.id;}
    const cur=document.querySelector('.tab[aria-current="true"]');
    if(actual&&(!cur||cur.dataset.id!==actual)) marcarTab(actual);
  }); },{passive:true});
}
$("#lista").addEventListener("click",e=>{
  const b=e.target.closest("[data-ver],[data-mas],[data-menos]"); if(!b) return;
  if(b.dataset.ver) return verDetalle(b.dataset.ver);
  const [pid,vi]=(b.dataset.mas||b.dataset.menos).split("|");
  if(b.dataset.mas) sumar(pid,+vi); else restar(pid,+vi);
});
function refrescar(pid){
  const p=prod(pid), act=document.activeElement;
  if(p) document.querySelectorAll(`.prod[data-id="${CSS.escape(pid)}"]`).forEach(el=>{
    const tenia=act&&act.closest&&act.closest(".prod")===el, at=tenia?(act.hasAttribute("data-mas")?"data-mas":act.hasAttribute("data-menos")?"data-menos":null):null, val=at?act.getAttribute(at):null;
    const tmp=document.createElement("div"); tmp.innerHTML=filaProd(p).trim(); const nuevo=tmp.firstElementChild; el.replaceWith(nuevo);
    if(at){const nb=nuevo.querySelector(`[${at}="${CSS.escape(val)}"]`); if(nb) nb.focus({preventScroll:true});}
  });
  pintarBarra();
}
$("#q").addEventListener("input",e=>{busq=normal(e.target.value.trim());render();});

/* ---------- pedido ---------- */
function sumar(pid,vi){
  const p=prod(pid); if(!p||p.estado==="agotado") return; const op=opDe(p,vi);
  if(op){ elegir(p,vi,op); return; }
  const k=`${pid}|${vi}|`; carro[k]=(carro[k]||0)+1; guardarCarro(); refrescar(pid);
}
function restar(pid,vi){
  const ks=Object.keys(carro).filter(k=>{const [a,b]=k.split("|");return a===pid&&+b===vi;});
  const k=ks[ks.length-1]; if(!k) return;
  carro[k]--; if(carro[k]<=0) delete carro[k]; guardarCarro(); refrescar(pid);
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
  $("#verPedido").disabled=!n; $("#verPedido").textContent=n?"Ver mi pedido":"Ver mi pedido";
}
const detTxt=l=>[l.v.nombre!=="Única"?l.v.nombre:null,l.op||null].filter(Boolean).join(", ");
function verPedido(){
  const ls=lineas(); if(!ls.length) return;
  $("#pItems").innerHTML=ls.map(l=>`<div class="item"><span class="t">${l.n} × ${esc(l.p.nombre)}${detTxt(l)?`<small>${esc(detTxt(l))}</small>`:""}</span><b class="num">${fmt(l.v.precio*l.n)}</b></div>`).join("");
  $("#pTotal").textContent=fmt(ls.reduce((s,l)=>s+l.v.precio*l.n,0));
  const hayW=waNum().length>=8; $("#pSinWsp").hidden=hayW; $("#pEnviar").disabled=!hayW;
  avisoEnt(); abrir("#hPedido");
}
$("#verPedido").onclick=verPedido;
function avisoEnt(){const r=$("#eRet").checked;$("#pDirW").hidden=r;$("#pDir").required=!r;$("#pAviso").textContent=r?(DATA.tienda.puntoVenta?`Retiro en nuestra tienda física: ${DATA.tienda.puntoVenta}, con previa coordinación por WhatsApp.`:"El lugar de retiro se coordina al confirmar."):"La entrega se hace con previa coordinación anticipada; el valor del despacho se confirma por WhatsApp.";}
$("#eRet").onchange=avisoEnt; $("#eDes").onchange=avisoEnt;
$("#pVaciar").onclick=()=>{carro={};cambioCarro();cerrar();toast("Pedido vaciado");};
$("#pForm").addEventListener("submit",e=>{
  e.preventDefault(); const ls=lineas(); if(!ls.length||waNum().length<8) return;
  const tot=ls.reduce((s,l)=>s+l.v.precio*l.n,0), r=$("#eRet").checked;
  let t=`Hola Organa, quiero hacer este pedido:\n\n${ls.map(l=>`• ${l.n} x ${l.p.nombre}${detTxt(l)?" ("+detTxt(l)+")":""} - ${fmt(l.v.precio*l.n)}`).join("\n")}\n\nTotal: ${fmt(tot)}\n\nNombre: ${$("#pNom").value.trim()}\nEntrega: ${r?"Retiro"+(DATA.tienda.puntoVenta?" en tienda física ("+DATA.tienda.puntoVenta+")":""):"Despacho a "+$("#pDir").value.trim()}`;
  const nota=$("#pNota").value.trim(); if(nota) t+=`\nComentario: ${nota}`;
  const diag=window.Asesora&&Asesora.resumen(); if(diag) t+=`\n\nLo que me pasa: ${diag}`;
  const a=document.createElement("a"); a.href=waLink(t); a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove();
  toast("Abriendo WhatsApp…");
});

/* ---------- elegir aroma / variedad ---------- */
function elegir(p,vi,op){
  $("#eTit").textContent=`${op.nombre||"Elige"}`;
  $("#eSub").textContent=`${p.nombre}${p.variantes[vi].nombre!=="Única"?" · "+p.variantes[vi].nombre:""}`;
  $("#eOps").innerHTML=op.valores.map(v=>`<button type="button">${esc(v)}</button>`).join("");
  [...$("#eOps").children].forEach((b,i)=>b.onclick=()=>{const k=`${p.id}|${vi}|${op.valores[i]}`;carro[k]=(carro[k]||0)+1;cerrar();guardarCarro();refrescar(p.id);toast(`Agregado: ${op.valores[i]}`);});
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
  $("#dChips").innerHTML=[p.medida?`<span class="chip">${esc(p.medida)}</span>`:"",p.nota?`<span class="chip para">${esc(p.nota)}</span>`:"",p.estado==="agotado"?'<span class="chip ag">Agotado por ahora</span>':"",...p.variantes.map(v=>`<span class="chip" style="background:var(--rosa-claro);color:var(--rosa-osc)">${v.nombre==="Única"?"":esc(v.nombre)+" · "}${fmt(v.precio)}</span>`)].join("");
  $("#dDesc").innerHTML=descHTML(p.desc); abrir("#hDetalle");
}

/* ---------- tienda ---------- */
function aMin(s){const[a,b]=String(s||"0:0").split(":").map(Number);return a*60+(b||0);}
function hoy(){try{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",weekday:"short"}).formatToParts(new Date());return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(p.find(x=>x.type==="weekday").value);}catch(e){return (new Date().getDay()+6)%7;}}
function renderTienda(){
  const t=DATA.tienda;
  const hayW=waNum().length>=8;
  $("#filaWsp").hidden=!hayW; if(hayW){const w=$("#wsp"); w.textContent=waVis(); w.href=waLink("Hola Organa, tengo una consulta.");}
  $("#filaPv").hidden=!t.puntoVenta; $("#pv").textContent=t.puntoVenta||"";
  $("#filaIg").hidden=!t.instagram; $("#filaPronto").hidden=hayW&&!!t.puntoVenta;
  const m=$("#mapa"); m.hidden=!t.mapa; if(t.mapa) m.href=t.mapa;
  const ig=$("#ig"); ig.textContent="@"+(t.instagram||""); ig.href="https://instagram.com/"+(t.instagram||"");
  const hs=t.horarios||[], d=hoy();
  $("#horas").hidden=!hs.some(h=>h.abierto); $("#bloqueHorario").hidden=!hs.some(h=>h.abierto)&&!t.notaHorario;
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

/* ---------- asesora ---------- */
window.OrganaTienda={
  datos:()=>DATA,
  agregar:(pid,vi,op)=>{ const k=`${pid}|${vi}|${op||""}`; carro[k]=(carro[k]||0)+1; guardarCarro(); refrescar(pid); },
  abrirPedido:()=>verPedido()
};
if(window.Asesora){
  Asesora.init({tienda:window.OrganaTienda,flor:"deco/peonia.png",flor2:"deco/eucalipto.png"});
  document.querySelectorAll("[data-asesora]").forEach(b=>b.onclick=()=>Asesora.abrir());
}
cargar().then(()=>{ if(window.Asesora&&DATA) setTimeout(()=>Asesora.abrirSiPrimeraVez(),400); });
})();
