/* Organa · catálogo con carrito por WhatsApp y panel de administración.
   Los datos viven en datos.json (productos, categorías, tienda, horarios). */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>"$"+Math.round(Number(n)||0).toLocaleString("es-CL");
const normal=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const clon=o=>JSON.parse(JSON.stringify(o));
const DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

let DATA=null;               // datos publicados (o borrador local en este equipo)
const previews={};           // fotos nuevas de esta sesión: ruta -> objectURL
const imgSrc=p=>previews[p]||p;
const waNum=()=>String(DATA.tienda.whatsapp||"").replace(/\D/g,"");
const waLink=t=>"https://wa.me/"+waNum()+"?text="+encodeURIComponent(t);
const waVisible=()=>{const d=waNum();return d.length===11&&d.startsWith("569")?`+56 9 ${d.slice(3,7)} ${d.slice(7)}`:"+"+d;};
const catNombre=id=>(DATA.categorias.find(c=>c.id===id)||{}).nombre||id;
const visibles=()=>DATA.productos.filter(p=>p.estado!=="oculto");
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}}

/* ================= Carga ================= */
async function cargar(){
  let pub=null;
  try{const r=await fetch("datos.json",{cache:"no-store"});if(r.ok)pub=await r.json();}catch(e){}
  let borr=null; try{borr=JSON.parse(store("organa-borrador")||"null");}catch(e){}
  if(borr&&pub&&borr.base!==pub.version){borr=null;store("organa-borrador",null);}
  DATA=borr?borr.datos:pub;
  if(!DATA){$("#productos").innerHTML='<p class="vacio">No se pudo cargar el catálogo. Recarga la página.</p>';return;}
  DATA.version=DATA.version||1;
  PUB_VERSION=pub?pub.version:DATA.version;
  renderTodo();
}
let PUB_VERSION=1;

/* ================= Vista pública ================= */
function renderTodo(){ if(primeraVez&&DATA.categorias[0]){abiertas.add(DATA.categorias[0].id);primeraVez=false;} renderTienda(); renderChips(); renderCatalogo(); pintarCarro(); }

function renderTienda(){
  const t=DATA.tienda;
  $("#heroCiudad").textContent=t.ciudad||"Iquique";
  $("#wspHero").href=waLink("Hola Organa, quiero hacer una consulta.");
  const wc=$("#wspContacto"); wc.textContent=waVisible(); wc.href=waLink("Hola Organa, quiero hacer una consulta.");
  $("#feria").textContent=t.feria||""; $("#feriaP").hidden=!t.feria;
  $("#retiro").textContent=t.puntoVenta||"a coordinar";
  const m=$("#mapa"); m.hidden=!t.mapa; if(t.mapa) m.href=t.mapa;
  const ig=$("#ig"); ig.textContent="@"+(t.instagram||""); ig.href="https://instagram.com/"+(t.instagram||"");
  $("#numVis").textContent=waVisible();
  const hs=t.horarios||[], hay=hs.some(h=>h.abierto), hoy=diaHoy();
  $("#horas").hidden=!hay;
  $("#horas").innerHTML=hs.map((h,i)=>`<tr class="${i===hoy.dia?"hoy":""}"><td>${esc(h.dia)}</td><td>${h.abierto?esc(h.desde)+" – "+esc(h.hasta):"Cerrado"}</td></tr>`).join("");
  $("#notaHorario").textContent=t.notaHorario||"";
  const e=$("#estadoTienda");
  if(!hay){e.hidden=true;}else{
    const h=hs[hoy.dia], ab=h&&h.abierto&&hoy.min>=aMin(h.desde)&&hoy.min<aMin(h.hasta);
    e.hidden=false; e.className="estado-tienda "+(ab?"abierto":"cerrado");
    e.textContent=ab?`Abierto hasta ${h.hasta}`:"Cerrado ahora";
  }
  avisoEntrega();
}
function aMin(s){const[a,b]=String(s||"0:0").split(":").map(Number);return a*60+(b||0);}
function diaHoy(){
  try{
    const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
    const g=k=>(p.find(x=>x.type===k)||{}).value;
    const dia=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(g("weekday"));
    return {dia,min:(Number(g("hour"))%24)*60+Number(g("minute"))};
  }catch(e){const d=new Date();return {dia:(d.getDay()+6)%7,min:d.getHours()*60+d.getMinutes()};}
}

/* --- categorías desplegables --- */
let abiertas=new Set(); let busq="";
let _ab=null; try{_ab=JSON.parse(store("organa-abiertas")||"null");}catch(e){}
let primeraVez=!_ab; abiertas=new Set(_ab||[]);
function guardarAbiertas(){store("organa-abiertas",JSON.stringify([...abiertas]));}
function grupos(){
  const vistos=new Set();
  return DATA.categorias.map(c=>{
    const ps=visibles().filter(p=>p.cat&&p.cat[0]===c.id&&!vistos.has(p.id));
    ps.forEach(p=>vistos.add(p.id));
    return {c,ps};
  }).concat([{c:{id:"_otros",nombre:"Otros"},ps:visibles().filter(p=>!vistos.has(p.id))}]).filter(g=>g.ps.length);
}
function renderChips(){
  const cont=$("#chips"); cont.innerHTML="";
  grupos().forEach(g=>{
    const b=document.createElement("button"); b.className="chip"; b.type="button";
    b.setAttribute("aria-pressed",String(abiertas.has(g.c.id)));
    b.innerHTML=`<span>${esc(g.c.nombre)}</span><span class="c">${g.ps.length}</span>`;
    b.onclick=()=>{abiertas.add(g.c.id);guardarAbiertas();renderChips();renderCatalogo();
      const el=document.getElementById("cat-"+g.c.id); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});};
    cont.appendChild(b);
  });
}
$("#abrirTodas").onclick=()=>{const gs=grupos();const todas=gs.every(g=>abiertas.has(g.c.id));
  abiertas=todas?new Set():new Set(gs.map(g=>g.c.id));guardarAbiertas();renderChips();renderCatalogo();};
$("#q").addEventListener("input",e=>{busq=normal(e.target.value.trim());renderCatalogo();});
function coincide(p){
  if(!busq) return true;
  const t=normal([p.nombre,p.nota,p.desc,(p.variantes||[]).map(v=>v.nombre+" "+(v.detalle||"")).join(" "),(p.cat||[]).map(catNombre).join(" ")].join(" "));
  return busq.split(/\s+/).every(w=>t.includes(w));
}
function rango(p){const ps=(p.variantes||[]).map(v=>Number(v.precio)||0);return {min:Math.min(...ps),max:Math.max(...ps)};}
function esUnico(p){return p.variantes.length===1&&!p.opcion&&!p.variantes[0].opcion;}
function renderCatalogo(){
  const main=$("#productos"); main.innerHTML="";
  const gs=grupos().map(g=>({c:g.c,ps:g.ps.filter(coincide)})).filter(g=>g.ps.length);
  if(!gs.length){main.innerHTML='<p class="vacio">No encontramos productos con esa búsqueda. Prueba con otra palabra.</p>';$("#abrirTodas").textContent="Abrir todas";return;}
  const todas=grupos().every(g=>abiertas.has(g.c.id));
  $("#abrirTodas").textContent=todas?"Cerrar todas":"Abrir todas";
  gs.forEach(g=>{
    const abierto=!!busq||abiertas.has(g.c.id);
    const sec=document.createElement("section"); sec.className="cat"; sec.id="cat-"+g.c.id; sec.dataset.open=String(abierto);
    const muestra=g.ps.slice(0,4).map(p=>p.nombre).join(" · ")+(g.ps.length>4?" …":"");
    sec.innerHTML=`<button class="cat-cab" type="button" aria-expanded="${abierto}" aria-controls="cc-${g.c.id}">
        <span class="cat-mini" style="background-image:url('${esc(imgSrc(g.ps[0].img))}')"></span>
        <span><h3>${esc(g.c.nombre)}</h3><span class="muestra">${esc(muestra)}</span></span>
        <span class="cuenta">${g.ps.length} ${g.ps.length===1?"producto":"productos"}</span>
        <span class="chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>
      </button><div class="cat-cuerpo" id="cc-${g.c.id}"><div class="grid"></div></div>`;
    const grid=sec.querySelector(".grid");
    if(abierto) g.ps.forEach(p=>grid.appendChild(tarjeta(p)));
    sec.querySelector(".cat-cab").onclick=()=>{
      if(busq) return;
      if(abiertas.has(g.c.id))abiertas.delete(g.c.id);else abiertas.add(g.c.id);
      guardarAbiertas();renderChips();renderCatalogo();
    };
    main.appendChild(sec);
  });
}
function tarjeta(p){
  const r=rango(p), unico=esUnico(p), ag=p.estado==="agotado";
  const el=document.createElement("article"); el.className="card"+(ag?" es-agotado":"");
  const med=p.medida||(p.variantes.length>1?p.variantes.length+" opciones":"");
  const tag=ag?'<span class="tag agotado">Agotado</span>':(p.nota&&p.nota.length<28?`<span class="tag">${esc(p.nota)}</span>`:"");
  el.innerHTML=`<button class="ver" type="button" aria-label="Ver ${esc(p.nombre)}">
      <div class="img" style="background-image:url('${esc(imgSrc(p.img))}')">${tag}</div>
      <div class="info"><span class="nombre">${esc(p.nombre)}</span><span class="med">${esc(med)}</span></div>
    </button>
    <div class="pie"><span>${r.min!==r.max?'<span class="desde">desde</span>':""}<span class="precio">${fmt(r.min)}</span></span>
    <button class="mas" type="button" ${ag?"disabled":""} aria-label="${ag?"Agotado":unico?"Agregar "+esc(p.nombre)+" al carrito":"Elegir opción de "+esc(p.nombre)}">+</button></div>`;
  el.querySelector(".ver").onclick=()=>abrirFicha(p);
  el.querySelector(".mas").onclick=()=>{ if(unico) agregar(p,0,null,1); else abrirFicha(p); };
  return el;
}

/* --- descripción legible --- */
function descHTML(txt){
  const lineas=String(txt||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
  let html="", lista=null;
  const cerrar=()=>{if(lista){html+=`</${lista}>`;lista=null;}};
  const conEtiqueta=s=>{const m=s.match(/^([^:.]{3,40}):\s*(.+)$/);return m?`<b>${esc(m[1])}:</b> ${esc(m[2])}`:esc(s);};
  lineas.forEach((l,i)=>{
    let m;
    if((m=l.match(/^[•\-–]\s*(.+)/))){ if(lista!=="ul"){cerrar();html+="<ul>";lista="ul";} html+=`<li>${conEtiqueta(m[1])}</li>`; return; }
    if((m=l.match(/^\d+[.)]\s*(.+)/))){ if(lista!=="ol"){cerrar();html+="<ol>";lista="ol";} html+=`<li>${conEtiqueta(m[1])}</li>`; return; }
    cerrar();
    if(l.endsWith(":")&&l.length<70){html+=`<p><b>${esc(l)}</b></p>`;return;}
    // párrafos largos: se agrupan de a 2 oraciones para que se lean mejor
    const ors=l.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)||[l]; let buf="";
    ors.forEach(o=>{buf+=o; if(buf.length>220){html+=`<p${!html?' class="intro"':""}>${conEtiqueta(buf.trim())}</p>`;buf="";}});
    if(buf.trim()) html+=`<p${!html?' class="intro"':""}>${conEtiqueta(buf.trim())}</p>`;
  });
  cerrar(); return html;
}

/* --- ficha --- */
let actual=null, vSel=0, cant=1;
function opcionDe(p,i){const o=p.variantes[i].opcion||p.opcion;return o&&o.valores&&o.valores.length?o:null;}
function abrirFicha(p){
  actual=p; vSel=0; cant=1;
  $("#fFoto").style.backgroundImage=`url('${imgSrc(p.img)}')`; $("#fFoto").setAttribute("aria-label",p.nombre);
  $("#fCats").innerHTML=(p.cat||[]).map(c=>`<span>${esc(catNombre(c))}</span>`).join("");
  $("#fNombre").textContent=p.nombre;
  $("#fNota").textContent=p.nota||""; $("#fNota").hidden=!p.nota;
  $("#fMed").textContent=p.medida?"Contenido: "+p.medida:""; $("#fMed").hidden=!p.medida;
  $("#fDesc").innerHTML=descHTML(p.desc);
  const ag=p.estado==="agotado"; $("#fAgotado").hidden=!ag; $("#fAgregar").disabled=ag;
  $("#fPedir").textContent=ag?"Consultar disponibilidad":"Pedir solo este";
  $("#fVarsWrap").hidden=p.variantes.length===1;
  pintarVars(); pintarOp(); actualizar();
  $("#ficha .det").scrollTop=0; $("#ficha .cuerpo").scrollTop=0;
  abrir("#ficha");
}
function pintarVars(){
  const c=$("#fVars"); c.innerHTML="";
  actual.variantes.forEach((v,i)=>{
    const b=document.createElement("button"); b.type="button"; b.className="var"; b.setAttribute("role","radio");
    b.setAttribute("aria-checked",String(i===vSel));
    b.innerHTML=`<span>${esc(v.nombre)}${v.detalle?`<small>${esc(v.detalle)}</small>`:""}</span><span class="precio">${fmt(v.precio)}</span>`;
    b.onclick=()=>{vSel=i;pintarVars();pintarOp();actualizar();};
    c.appendChild(b);
  });
}
function pintarOp(){
  const op=opcionDe(actual,vSel); $("#fOpWrap").hidden=!op; if(!op) return;
  $("#fOpLbl").textContent=op.nombre||"Opción";
  $("#fOp").innerHTML=op.valores.map(v=>`<option>${esc(v)}</option>`).join("");
}
function lineaTexto(p,i,op,n){const v=p.variantes[i]||p.variantes[0];const det=[v.nombre!=="Única"?v.nombre:null,op].filter(Boolean).join(", ");return `${n} x ${p.nombre}${det?" ("+det+")":""} - ${fmt(v.precio*n)}`;}
function actualizar(){
  const v=actual.variantes[vSel]; $("#fCant").textContent=cant; $("#fTotal").textContent=fmt(v.precio*cant);
  const op=opcionDe(actual,vSel)?$("#fOp").value:null;
  $("#fPedir").href=waLink(actual.estado==="agotado"
    ?`Hola Organa, ¿cuándo vuelve a estar disponible ${actual.nombre}?`
    :`Hola Organa, quiero pedir:\n\n• ${lineaTexto(actual,vSel,op,cant)}\n\n¿Está disponible?`);
}
$("#fOp").onchange=actualizar;
$("#fMenos").onclick=()=>{if(cant>1){cant--;actualizar();}};
$("#fMas").onclick=()=>{cant++;actualizar();};
$("#fAgregar").onclick=()=>{const op=opcionDe(actual,vSel)?$("#fOp").value:null;agregar(actual,vSel,op,cant);cerrar();};

/* --- carrito --- */
let carro=[];
try{carro=JSON.parse(store("organa-carro")||"[]")||[];}catch(e){carro=[];}
function guardarCarro(){store("organa-carro",JSON.stringify(carro));}
const prod=id=>DATA.productos.find(p=>p.id===id);
function limpiarCarro(){carro=carro.filter(it=>{const p=prod(it.id);return p&&p.estado==="disponible"&&p.variantes[it.v];});}
function agregar(p,i,op,n){
  const key=p.id+"|"+i+"|"+(op||"");
  const ex=carro.find(it=>it.key===key);
  if(ex) ex.n+=n; else carro.push({key,id:p.id,v:i,op,n});
  guardarCarro(); pintarCarro(); toast(`Agregado: ${p.nombre}`);
}
function pintarCarro(){
  limpiarCarro();
  const tot=carro.reduce((s,it)=>s+prod(it.id).variantes[it.v].precio*it.n,0), n=carro.reduce((s,it)=>s+it.n,0);
  $("#nCarro").textContent=n; $("#total").textContent=fmt(tot);
  $("#flot").classList.toggle("on",n>0); $("#flotTxt").textContent=`Ver pedido · ${fmt(tot)}`;
  const l=$("#lista"); l.innerHTML=""; $("#pedido").hidden=!n;
  if(!n){l.innerHTML='<div class="vacio-c">Tu carrito está vacío.<br>Agrega productos con el botón “+”.</div>';return;}
  carro.forEach((it,idx)=>{
    const p=prod(it.id), v=p.variantes[it.v];
    const det=[v.nombre!=="Única"?v.nombre:null,it.op].filter(Boolean).join(" · ");
    const d=document.createElement("div"); d.className="item";
    d.innerHTML=`<div class="mini" style="background-image:url('${esc(imgSrc(p.img))}')"></div>
      <div><div class="t">${esc(p.nombre)}</div>${det?`<div class="v">${esc(det)}</div>`:""}<div class="v precio">${fmt(v.precio*it.n)}</div></div>
      <div class="der"><div class="cant"><button type="button" aria-label="Quitar uno">−</button><span>${it.n}</span><button type="button" aria-label="Agregar uno">+</button></div>
      <button class="quitar" type="button">Quitar</button></div>`;
    const [menos,mas]=d.querySelectorAll(".cant button");
    menos.onclick=()=>{if(it.n>1)it.n--;else carro.splice(idx,1);guardarCarro();pintarCarro();};
    mas.onclick=()=>{it.n++;guardarCarro();pintarCarro();};
    d.querySelector(".quitar").onclick=()=>{carro.splice(idx,1);guardarCarro();pintarCarro();};
    l.appendChild(d);
  });
}
function avisoEntrega(){
  const r=$("#eRetiro").checked;
  $("#dirWrap").hidden=r; $("#cDir").required=!r;
  $("#avisoEntrega").textContent=r?`Retiro en ${DATA?DATA.tienda.puntoVenta:""}.`:"El valor del despacho se coordina por WhatsApp.";
}
$("#eRetiro").onchange=avisoEntrega; $("#eDespacho").onchange=avisoEntrega;
$("#pedido").addEventListener("submit",e=>{
  e.preventDefault(); if(!carro.length) return;
  const tot=carro.reduce((s,it)=>s+prod(it.id).variantes[it.v].precio*it.n,0);
  const lineas=carro.map(it=>"• "+lineaTexto(prod(it.id),it.v,it.op,it.n)).join("\n");
  const r=$("#eRetiro").checked;
  let t=`Hola Organa, quiero hacer este pedido:\n\n${lineas}\n\nTotal: ${fmt(tot)}\n\nNombre: ${$("#cNombre").value.trim()}\nEntrega: ${r?"Retiro en "+DATA.tienda.puntoVenta:"Despacho a "+$("#cDir").value.trim()}`;
  const nota=$("#cNota").value.trim(); if(nota) t+=`\nComentario: ${nota}`;
  const a=document.createElement("a"); a.href=waLink(t); a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove();
  toast("Abriendo WhatsApp con tu pedido…");
});

/* --- paneles --- */
let abierto=null;
function abrir(sel){ if(abierto)cerrarSin(); const el=$(sel); el.hidden=false; requestAnimationFrame(()=>{el.classList.add("on");$("#velo").classList.add("on");}); abierto=el; document.body.style.overflow="hidden"; setTimeout(()=>{const f=el.querySelector("[data-cerrar],input");f&&f.focus({preventScroll:true});},60); }
function cerrarSin(){ const el=abierto; if(!el)return; el.classList.remove("on"); if(el.id==="login"||el.id==="compartir")el.hidden=true; else setTimeout(()=>{if(!el.classList.contains("on"))el.hidden=true;},300); abierto=null; }
function cerrar(){ cerrarSin(); $("#velo").classList.remove("on"); if($("#admin").hidden)document.body.style.overflow=""; }
$("#velo").onclick=cerrar;
document.querySelectorAll("[data-cerrar]").forEach(b=>b.onclick=cerrar);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&abierto)cerrar();});
function abrirCompartir(){
  const link=DATA.tienda.link||location.href.split("#")[0];
  $("#compLink").value=link;
  $("#compWsp").href="https://wa.me/?text="+encodeURIComponent("Mira el catálogo de Organa, cosmética natural en "+(DATA.tienda.ciudad||"Iquique")+": "+link);
  abrir("#compartir");
}
$("#abrirCompartir").onclick=abrirCompartir; $("#abrirCompartir2").onclick=abrirCompartir;
$("#compCopiar").onclick=async()=>{
  const i=$("#compLink");
  try{await navigator.clipboard.writeText(i.value);toast("Link copiado");}
  catch(e){i.focus();i.select();toast("Link seleccionado: cópialo con Copiar del teclado");}
};
$("#abrirCarro").onclick=()=>{pintarCarro();abrir("#carro");};
$("#flot").onclick=()=>{pintarCarro();abrir("#carro");};
let tt; function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("on"),2200);}

/* ================= Administración ================= */
async function sha(s){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("organa|"+s));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
$("#abrirLogin").onclick=()=>{ if(sessionStorage.getItem("organa-admin")==="1"){abrirAdmin();return;} $("#loginErr").hidden=true; $("#clave").value=""; abrir("#login"); };
$("#login").addEventListener("submit",async e=>{
  e.preventDefault();
  const ok=(await sha($("#clave").value))===DATA.claveHash;
  if(!ok){$("#loginErr").hidden=false;return;}
  try{sessionStorage.setItem("organa-admin","1");}catch(e){}
  cerrar(); abrirAdmin();
});
if(location.hash==="#admin") setTimeout(()=>$("#abrirLogin").click(),400);

let ED=null, sucio=false, tabAct="productos", editando=null, admFiltro="", admCat="";
const nuevasFotos={}; // ruta -> Blob
function abrirAdmin(){
  ED=clon(DATA); sucio=false; editando=null; tabAct="productos";
  $("#admin").hidden=false; document.body.style.overflow="hidden";
  marcar(false); renderAdmin();
}
function marcar(v){
  sucio=v; const e=$("#admEstado");
  e.textContent=v?"Cambios sin publicar":(store("organa-borrador")?"Borrador guardado solo en este equipo":"Todo publicado");
  e.classList.toggle("pend",v); $("#admPublicar").disabled=!v;
}
const cambio=()=>marcar(true);
$("#admSalir").onclick=()=>{
  if(sucio&&!$("#admSalir").dataset.ok){$("#admSalir").dataset.ok="1";$("#admSalir").textContent="Salir sin publicar";toast("Tienes cambios sin publicar. Toca de nuevo para salir igual.");setTimeout(()=>{delete $("#admSalir").dataset.ok;$("#admSalir").textContent="Salir";},4000);return;}
  delete $("#admSalir").dataset.ok; $("#admSalir").textContent="Salir";
  $("#admin").hidden=true; document.body.style.overflow=""; renderTodo();
};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{tabAct=t.dataset.tab;editando=null;renderAdmin();});
function renderAdmin(){
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",String(t.dataset.tab===tabAct)));
  const v=$("#admVista"); v.innerHTML=""; $("#admCuerpo").scrollTop=0;
  if(tabAct==="productos") editando?vistaEditar(v):vistaLista(v);
  if(tabAct==="tienda") vistaTienda(v);
  if(tabAct==="categorias") vistaCategorias(v);
  if(tabAct==="clave") vistaClave(v);
}

/* --- lista de productos --- */
function vistaLista(v){
  v.innerHTML=`<div class="adm-barra">
      <label class="buscar" for="admQ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="admQ" type="search" placeholder="Buscar producto" value="${esc(admFiltro)}"></label>
      <select class="sel" id="admCat" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${ED.categorias.map(c=>`<option value="${esc(c.id)}" ${admCat===c.id?"selected":""}>${esc(c.nombre)}</option>`).join("")}</select>
      <span class="sp" style="flex:1"></span>
      <button class="btn btn-oliva btn-chico" id="admNuevo" type="button">+ Nuevo producto</button>
    </div><div id="admLista"></div>`;
  const pintar=()=>{
    const cont=$("#admLista"); cont.innerHTML="";
    const q=normal(admFiltro);
    ED.categorias.concat([{id:"_sin",nombre:"Sin categoría"}]).forEach(c=>{
      if(admCat&&admCat!==c.id) return;
      const ps=ED.productos.filter(p=>c.id==="_sin"?!(p.cat&&p.cat.length&&ED.categorias.some(k=>k.id===p.cat[0])):p.cat&&p.cat[0]===c.id).filter(p=>!q||normal(p.nombre).includes(q));
      if(!ps.length) return;
      const g=document.createElement("div"); g.className="adm-grupo"; g.innerHTML=`<h3>${esc(c.nombre)}</h3>`;
      ps.forEach(p=>{
        const r=rango(p), f=document.createElement("div"); f.className="adm-fila";
        f.innerHTML=`<div class="mini" style="background-image:url('${esc(imgSrc(p.img))}')"></div>
          <div style="min-width:0"><div class="t">${esc(p.nombre)}</div><div class="s precio">${r.min===r.max?fmt(r.min):fmt(r.min)+" – "+fmt(r.max)} · ${p.variantes.length} ${p.variantes.length===1?"opción":"opciones"}</div></div>
          <span class="pill ${esc(p.estado)}">${p.estado==="disponible"?"Disponible":p.estado==="agotado"?"Agotado":"Oculto"}</span>
          <div class="acc"><button class="ico" type="button" title="Subir" aria-label="Subir ${esc(p.nombre)}">↑</button><button class="ico" type="button" title="Bajar" aria-label="Bajar ${esc(p.nombre)}">↓</button><button class="btn btn-suave btn-chico" type="button">Editar</button></div>`;
        const [sub,baj,ed]=f.querySelectorAll("button");
        sub.onclick=()=>mover(p,-1,ps,pintar); baj.onclick=()=>mover(p,1,ps,pintar);
        ed.onclick=()=>{editando=p.id;renderAdmin();};
        f.querySelector(".t").onclick=ed.onclick; f.querySelector(".t").style.cursor="pointer";
        g.appendChild(f);
      });
      cont.appendChild(g);
    });
    if(!cont.children.length) cont.innerHTML='<p class="vacio">No hay productos con ese filtro.</p>';
  };
  $("#admQ").oninput=e=>{admFiltro=e.target.value;pintar();};
  $("#admCat").onchange=e=>{admCat=e.target.value;pintar();};
  $("#admNuevo").onclick=()=>{
    const id="p-"+Date.now().toString(36);
    ED.productos.push({id,estado:"disponible",cat:[admCat||ED.categorias[0].id],nombre:"Nuevo producto",img:"img/logo.png",medida:"",nota:"",desc:"",variantes:[{nombre:"Única",precio:0}]});
    cambio(); editando=id; renderAdmin();
  };
  pintar();
}
function mover(p,d,grupo,repintar){
  const i=grupo.indexOf(p), otro=grupo[i+d]; if(!otro) return;
  const a=ED.productos.indexOf(p), b=ED.productos.indexOf(otro);
  ED.productos[a]=otro; ED.productos[b]=p; cambio(); repintar();
}

/* --- editar producto --- */
function vistaEditar(v){
  const p=ED.productos.find(x=>x.id===editando); if(!p){editando=null;renderAdmin();return;}
  v.innerHTML=`<div class="adm-barra"><button class="btn btn-suave btn-chico" id="volver" type="button">← Volver a la lista</button></div>
  <div class="form">
    <div class="tarjeta">
      <h3>Datos del producto</h3>
      <div class="campo"><label class="lbl" for="eNombre">Nombre</label><input class="inp" id="eNombre" value="${esc(p.nombre)}"></div>
      <div class="dos-col">
        <div class="campo"><label class="lbl" for="eMedida">Contenido / tamaño</label><input class="inp" id="eMedida" value="${esc(p.medida||"")}" placeholder="Ej: 100 ml."></div>
        <div class="campo"><label class="lbl" for="eEstado">Estado</label><select class="sel" id="eEstado">
          <option value="disponible">Disponible</option><option value="agotado">Agotado (se ve, no se puede pedir)</option><option value="oculto">Oculto (no aparece)</option></select></div>
      </div>
      <div class="campo"><label class="lbl" for="eNota">Frase destacada (opcional)</label><input class="inp" id="eNota" value="${esc(p.nota||"")}" placeholder="Ej: Ideal para pieles sensibles"></div>
      <div class="campo"><span class="lbl">Categorías</span><div class="checks" id="eCats">${ED.categorias.map(c=>`<label><input type="checkbox" value="${esc(c.id)}" ${(p.cat||[]).includes(c.id)?"checked":""}> ${esc(c.nombre)}</label>`).join("")}</div>
        <p class="ayuda">La primera categoría marcada es donde aparece en el catálogo. Las demás sirven para la búsqueda.</p></div>
    </div>
    <div class="tarjeta">
      <h3>Precios y opciones</h3>
      <p class="ayuda" style="margin:0">Cada fila es una opción que el cliente puede elegir, con su propio precio. Si el producto tiene un solo precio, deja una fila llamada “Única”.</p>
      <div id="eVars" style="display:flex;flex-direction:column;gap:8px"></div>
      <div><button class="btn btn-suave btn-chico" id="eAddVar" type="button">+ Agregar opción</button></div>
      <div class="dos-col">
        <div class="campo"><label class="lbl" for="eOpN">Selector extra (opcional)</label><input class="inp" id="eOpN" value="${esc(p.opcion?p.opcion.nombre:"")}" placeholder="Ej: Aroma"></div>
        <div class="campo"><label class="lbl" for="eOpV">Valores separados por coma</label><input class="inp" id="eOpV" value="${esc(p.opcion?p.opcion.valores.join(", "):"")}" placeholder="Ej: Lavanda, Naranja, Miel"></div>
      </div>
    </div>
    <div class="tarjeta">
      <h3>Foto</h3>
      <div class="foto-ed"><div class="mini" id="eFoto" style="background-image:url('${esc(imgSrc(p.img))}')"></div>
        <div><label class="btn btn-suave btn-chico" for="eFile">Cambiar foto</label><input id="eFile" type="file" accept="image/*" hidden>
        <p class="ayuda">Se ajusta sola al tamaño de la web. Mejor en formato vertical.</p></div></div>
    </div>
    <div class="tarjeta">
      <h3>Descripción</h3>
      <textarea class="inp" id="eDesc" rows="10">${esc(p.desc||"")}</textarea>
      <p class="ayuda">Usa Enter para separar párrafos. Empieza una línea con “• ” para hacer una lista.</p>
    </div>
    <div class="pie-form">
      <button class="btn btn-suave btn-chico" id="eDup" type="button">Duplicar</button>
      <button class="btn btn-peligro btn-chico" id="eDel" type="button">Eliminar producto</button>
      <span style="flex:1"></span>
      <button class="btn btn-oliva btn-chico" id="eListo" type="button">Listo</button>
    </div>
    <div class="confirmar" id="eConf" hidden><b>¿Eliminar “${esc(p.nombre)}” del catálogo?</b><span class="ayuda" style="margin:0">Se quita al publicar. Si solo no tienes stock, mejor márcalo como Agotado.</span>
      <div class="fila"><button class="btn btn-peligro btn-chico" id="eDelSi" type="button">Sí, eliminar</button><button class="btn btn-suave btn-chico" id="eDelNo" type="button">Cancelar</button></div></div>
  </div>`;
  $("#eEstado").value=p.estado||"disponible";
  const bind=(id,fn)=>{$(id).addEventListener("input",e=>{fn(e.target.value);cambio();});};
  bind("#eNombre",x=>p.nombre=x); bind("#eMedida",x=>p.medida=x.trim()||undefined); bind("#eNota",x=>p.nota=x.trim()||undefined); bind("#eDesc",x=>p.desc=x);
  $("#eEstado").onchange=e=>{p.estado=e.target.value;cambio();};
  $("#eCats").onchange=()=>{const sel=[...$("#eCats").querySelectorAll("input:checked")].map(i=>i.value);
    p.cat=(p.cat||[]).filter(c=>sel.includes(c)).concat(sel.filter(c=>!(p.cat||[]).includes(c)));cambio();};
  const opUpd=()=>{const n=$("#eOpN").value.trim(), vs=$("#eOpV").value.split(",").map(s=>s.trim()).filter(Boolean);
    if(n&&vs.length)p.opcion={nombre:n,valores:vs};else delete p.opcion;cambio();};
  $("#eOpN").oninput=opUpd; $("#eOpV").oninput=opUpd;
  const pintarVarsEd=()=>{
    const c=$("#eVars"); c.innerHTML="";
    p.variantes.forEach((va,i)=>{
      const f=document.createElement("div"); f.className="var-ed";
      f.innerHTML=`<input class="inp" aria-label="Nombre de la opción" value="${esc(va.nombre)}" placeholder="Nombre de la opción">
        <input class="inp det-in" aria-label="Detalle" value="${esc(va.detalle||"")}" placeholder="Detalle (opcional)">
        <div class="precio-in"><span>$</span><input class="inp" aria-label="Precio" inputmode="numeric" value="${esc(va.precio)}"></div>
        <button class="ico" type="button" aria-label="Quitar opción" ${p.variantes.length===1?"disabled":""}>×</button>`;
      const [n,d,pr]=f.querySelectorAll("input");
      n.oninput=()=>{va.nombre=n.value;cambio();};
      d.oninput=()=>{if(d.value.trim())va.detalle=d.value;else delete va.detalle;cambio();};
      pr.oninput=()=>{const num=Number(pr.value.replace(/\D/g,""));va.precio=num;cambio();};
      pr.onblur=()=>{pr.value=va.precio;};
      f.querySelector("button").onclick=()=>{if(p.variantes.length>1){p.variantes.splice(i,1);cambio();pintarVarsEd();}};
      c.appendChild(f);
    });
  };
  pintarVarsEd();
  $("#eAddVar").onclick=()=>{p.variantes.push({nombre:"",precio:p.variantes[0]?p.variantes[0].precio:0});cambio();pintarVarsEd();};
  $("#eFile").onchange=async e=>{
    const f=e.target.files[0]; if(!f) return;
    try{
      const blob=await achicar(f); const ruta=`img/${p.id}-${Date.now().toString(36)}.jpg`;
      nuevasFotos[ruta]=blob; previews[ruta]=URL.createObjectURL(blob); p.img=ruta; cambio();
      $("#eFoto").style.backgroundImage=`url('${previews[ruta]}')`; toast("Foto lista. Se sube al publicar.");
    }catch(err){toast("No se pudo leer esa imagen. Prueba con una foto JPG o PNG.");}
  };
  $("#volver").onclick=$("#eListo").onclick=()=>{editando=null;renderAdmin();};
  $("#eDup").onclick=()=>{const c=clon(p);c.id="p-"+Date.now().toString(36);c.nombre=p.nombre+" (copia)";ED.productos.splice(ED.productos.indexOf(p)+1,0,c);cambio();editando=c.id;renderAdmin();toast("Producto duplicado");};
  $("#eDel").onclick=()=>{$("#eConf").hidden=false;$("#eConf").scrollIntoView({block:"nearest"});};
  $("#eDelNo").onclick=()=>{$("#eConf").hidden=true;};
  $("#eDelSi").onclick=()=>{ED.productos.splice(ED.productos.indexOf(p),1);cambio();editando=null;renderAdmin();toast("Producto eliminado");};
}
function achicar(file){
  return new Promise((res,rej)=>{
    const img=new Image(); const u=URL.createObjectURL(file);
    img.onload=()=>{const k=Math.min(1,900/img.width,1100/img.height);const c=document.createElement("canvas");
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(u); c.toBlob(b=>b?res(b):rej(),"image/jpeg",.82);};
    img.onerror=rej; img.src=u;
  });
}

/* --- tienda y horarios --- */
function vistaTienda(v){
  const t=ED.tienda;
  v.innerHTML=`<div class="form">
    <div class="tarjeta"><h3>Punto de venta y contacto</h3>
      <div class="campo"><label class="lbl" for="tPV">Dirección del punto de venta / retiro</label><input class="inp" id="tPV" value="${esc(t.puntoVenta)}"></div>
      <div class="dos-col">
        <div class="campo"><label class="lbl" for="tCiudad">Ciudad</label><input class="inp" id="tCiudad" value="${esc(t.ciudad||"")}"></div>
        <div class="campo"><label class="lbl" for="tMapa">Link de Google Maps (opcional)</label><input class="inp" id="tMapa" value="${esc(t.mapa||"")}" placeholder="https://maps.app.goo.gl/..."></div>
      </div>
      <div class="campo"><label class="lbl" for="tFeria">Feria o evento donde están (opcional)</label><input class="inp" id="tFeria" value="${esc(t.feria||"")}"></div>
      <div class="dos-col">
        <div class="campo"><label class="lbl" for="tWsp">WhatsApp para pedidos</label><input class="inp" id="tWsp" inputmode="tel" value="${esc(t.whatsapp)}"><p class="ayuda">Con código de país, sin + ni espacios: 569XXXXXXXX</p></div>
        <div class="campo"><label class="lbl" for="tIg">Instagram</label><input class="inp" id="tIg" value="${esc(t.instagram||"")}"><p class="ayuda">Sin @</p></div>
      </div>
    </div>
    <div class="tarjeta"><h3>Horario de atención</h3>
      <div id="tHoras" style="display:flex;flex-direction:column;gap:8px"></div>
      <div class="campo"><label class="lbl" for="tNotaH">Nota bajo el horario (opcional)</label><input class="inp" id="tNotaH" value="${esc(t.notaHorario||"")}" placeholder="Ej: Festivos cerrado"></div>
      <p class="ayuda" style="margin:0">Si no marcas ningún día, el catálogo muestra solo la nota y oculta el aviso de Abierto/Cerrado.</p>
    </div></div>`;
  const bind=(id,k,fn)=>$(id).addEventListener("input",e=>{t[k]=fn?fn(e.target.value):e.target.value;cambio();});
  bind("#tPV","puntoVenta"); bind("#tCiudad","ciudad"); bind("#tMapa","mapa",x=>x.trim()); bind("#tFeria","feria");
  bind("#tWsp","whatsapp",x=>x.replace(/\D/g,"")); bind("#tIg","instagram",x=>x.replace(/^@/,"").trim()); bind("#tNotaH","notaHorario");
  if(!t.horarios||t.horarios.length!==7) t.horarios=DIAS.map(d=>({dia:d,abierto:false,desde:"10:00",hasta:"19:00"}));
  const c=$("#tHoras");
  t.horarios.forEach((h,i)=>{
    const f=document.createElement("div"); f.className="hor-fila";
    f.innerHTML=`<b>${esc(h.dia)}</b><label class="switch"><input type="checkbox" ${h.abierto?"checked":""} aria-label="${esc(h.dia)} abierto"> Abierto</label>
      <input class="inp" type="time" aria-label="Desde" value="${esc(h.desde)}" ${h.abierto?"":"disabled"}><input class="inp" type="time" aria-label="Hasta" value="${esc(h.hasta)}" ${h.abierto?"":"disabled"}>`;
    const [ck,de,ha]=f.querySelectorAll("input");
    ck.onchange=()=>{h.abierto=ck.checked;de.disabled=ha.disabled=!ck.checked;cambio();};
    de.oninput=()=>{h.desde=de.value;cambio();}; ha.oninput=()=>{h.hasta=ha.value;cambio();};
    c.appendChild(f);
  });
}

/* --- categorías --- */
function vistaCategorias(v){
  v.innerHTML=`<div class="form"><div class="tarjeta"><h3>Categorías del catálogo</h3>
    <p class="ayuda" style="margin:0">El orden de esta lista es el orden en que aparecen en la web.</p>
    <div id="cLista" style="display:flex;flex-direction:column;gap:8px"></div>
    <div class="fila"><input class="inp" id="cNueva" placeholder="Nueva categoría" style="flex:1;min-width:0"><button class="btn btn-oliva btn-chico" id="cAdd" type="button">Agregar</button></div>
    <p class="err" id="cErr" style="color:var(--alerta);font-weight:600;margin:0" hidden></p>
  </div></div>`;
  const pintar=()=>{
    const c=$("#cLista"); c.innerHTML="";
    ED.categorias.forEach((k,i)=>{
      const n=ED.productos.filter(p=>p.cat&&p.cat[0]===k.id).length;
      const f=document.createElement("div"); f.className="fila";
      f.innerHTML=`<input class="inp" style="flex:1;min-width:0" aria-label="Nombre de la categoría" value="${esc(k.nombre)}"><span class="ayuda" style="margin:0;white-space:nowrap">${n} prod.</span>
        <button class="ico" type="button" aria-label="Subir">↑</button><button class="ico" type="button" aria-label="Bajar">↓</button><button class="ico" type="button" aria-label="Eliminar categoría">×</button>`;
      const inp=f.querySelector("input"), [s,b,x]=f.querySelectorAll("button");
      inp.oninput=()=>{k.nombre=inp.value;cambio();};
      s.onclick=()=>{if(i>0){[ED.categorias[i-1],ED.categorias[i]]=[ED.categorias[i],ED.categorias[i-1]];cambio();pintar();}};
      b.onclick=()=>{if(i<ED.categorias.length-1){[ED.categorias[i+1],ED.categorias[i]]=[ED.categorias[i],ED.categorias[i+1]];cambio();pintar();}};
      x.onclick=()=>{
        if(n){$("#cErr").hidden=false;$("#cErr").textContent=`“${k.nombre}” tiene ${n} productos. Muévelos a otra categoría antes de eliminarla.`;return;}
        ED.categorias.splice(i,1); ED.productos.forEach(p=>p.cat=(p.cat||[]).filter(c=>c!==k.id)); cambio(); pintar();
      };
      c.appendChild(f);
    });
  };
  $("#cAdd").onclick=()=>{const n=$("#cNueva").value.trim(); if(!n) return;
    let id=normal(n).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"cat"; while(ED.categorias.some(c=>c.id===id)) id+="-2";
    ED.categorias.push({id,nombre:n}); $("#cNueva").value=""; $("#cErr").hidden=true; cambio(); pintar();};
  pintar();
}

/* --- clave --- */
function vistaClave(v){
  v.innerHTML=`<form class="form" id="kForm"><div class="tarjeta"><h3>Cambiar clave del panel</h3>
    <div class="campo"><label class="lbl" for="k1">Nueva clave</label><input class="inp" id="k1" type="password" minlength="6" required autocomplete="new-password"></div>
    <div class="campo"><label class="lbl" for="k2">Repite la nueva clave</label><input class="inp" id="k2" type="password" minlength="6" required autocomplete="new-password"></div>
    <p class="ayuda" style="margin:0">Mínimo 6 caracteres. La nueva clave rige después de publicar.</p>
    <p class="err" id="kErr" style="color:var(--alerta);font-weight:600;margin:0" hidden></p>
    <div><button class="btn btn-oliva btn-chico" type="submit">Guardar clave</button></div></div></form>`;
  $("#kForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if($("#k1").value!==$("#k2").value){$("#kErr").hidden=false;$("#kErr").textContent="Las dos claves no coinciden.";return;}
    ED.claveHash=await sha($("#k1").value); cambio(); $("#kErr").hidden=true; $("#kForm").reset(); toast("Clave lista. Publica para que quede activa.");
  });
}

/* --- publicar --- */
function validar(){
  for(const p of ED.productos){
    if(!p.nombre.trim()) return "Hay un producto sin nombre.";
    if(!p.cat||!p.cat.length) return `“${p.nombre}” no tiene categoría.`;
    for(const v of p.variantes){ if(!String(v.nombre||"").trim()) return `“${p.nombre}” tiene una opción sin nombre.`; if(!(v.precio>0)) return `“${p.nombre}” tiene una opción con precio $0.`; }
  }
  if(String(ED.tienda.whatsapp||"").replace(/\D/g,"").length<8) return "Revisa el número de WhatsApp.";
  return null;
}
$("#admPublicar").onclick=async()=>{
  const err=validar(); if(err){toast(err);return;}
  const btn=$("#admPublicar"); btn.disabled=true; btn.textContent="Publicando…";
  const nuevo=clon(ED); nuevo.version=(PUB_VERSION||1)+1;
  let artifact=null; try{artifact=window.claude&&await window.claude.use("artifact");}catch(e){}
  try{
    if(!artifact) throw {code:"sin_capacidad"};
    const files={"datos.json":{content:JSON.stringify(nuevo,null,1),contentType:"application/json"}};
    for(const r in nuevasFotos){ if(JSON.stringify(nuevo).includes(r)) files[r]={content:nuevasFotos[r],contentType:"image/jpeg"}; }
    await artifact.publish(files);
    for(const r in nuevasFotos) delete nuevasFotos[r];
    PUB_VERSION=nuevo.version; DATA=nuevo; ED=clon(nuevo); store("organa-borrador",null);
    marcar(false); toast("Publicado. Los clientes ya ven los cambios.");
  }catch(e){
    const code=e&&e.code;
    if(code==="conflict"){toast("Alguien publicó otra versión recién. Recarga la página y vuelve a hacer tus cambios.");}
    else if(code==="rate_limited"){toast("Demasiadas publicaciones seguidas. Espera un minuto y vuelve a intentar.");}
    else{
      // Sin permiso para publicar aquí: se guarda como borrador en este equipo
      for(const r in nuevasFotos){ try{ nuevo.productos.forEach(p=>{if(p.img===r)p.img=previews[r];}); }catch(x){} }
      await Promise.all(Object.keys(nuevasFotos).map(async r=>{const d=await aDataURL(nuevasFotos[r]);nuevo.productos.forEach(p=>{if(p.img===previews[r])p.img=d;});}));
      store("organa-borrador",JSON.stringify({base:PUB_VERSION,datos:nuevo}));
      DATA=nuevo; ED=clon(nuevo); marcar(false);
      $("#admEstado").textContent="Guardado solo en este equipo"; toast("Desde aquí no se puede publicar. Los cambios quedaron guardados en este equipo.");
    }
  }
  btn.textContent="Publicar cambios"; btn.disabled=!sucio;
};
function aDataURL(b){return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});}

/* --- portada con fotos que se turnan --- */
(function(){
  const fotos=[...document.querySelectorAll(".hero .foto")], puntos=[...document.querySelectorAll("#puntos button")];
  if(fotos.length<2) return;
  let i=0, t=null;
  const quieto=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ir(n){
    fotos[i].classList.remove("on"); puntos[i].removeAttribute("aria-current");
    i=(n+fotos.length)%fotos.length;
    void fotos[i].offsetWidth; fotos[i].classList.add("on"); puntos[i].setAttribute("aria-current","true");
  }
  function auto(){ clearInterval(t); if(!quieto) t=setInterval(()=>{ if(!document.hidden) ir(i+1); },5000); }
  puntos.forEach((b,n)=>b.onclick=()=>{ir(n);auto();});
  auto();
})();
cargar();
})();
