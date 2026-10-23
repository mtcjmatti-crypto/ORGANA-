/* Organa Lista de precios (Punto 2) · lee SU PROPIA planilla de Google.
   Cualquier sitio que cargue este archivo muestra los mismos datos. */
(function(){
"use strict";
const PLANILLA_ID="1OiFkUlTdYgEvZ_kObDu1QCOutXphuvjacu7N4Imr-Sk";
const BASE_IMG="https://mtcjmatti-crypto.github.io/ORGANA-/img/";
const DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const normal=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const slug=s=>normal(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"x";

function parseCSV(t){
  const filas=[]; let fila=[], campo="", q=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){campo+='"';i++;} else q=false; } else campo+=c; }
    else if(c==='"') q=true;
    else if(c===','){ fila.push(campo); campo=""; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; fila.push(campo); filas.push(fila); fila=[]; campo=""; }
    else campo+=c;
  }
  if(campo!==""||fila.length){ fila.push(campo); filas.push(fila); }
  return filas;
}
async function hoja(nombre){
  const url=`https://docs.google.com/spreadsheets/d/${PLANILLA_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(nombre)}&_=${Date.now()}`;
  const r=await fetch(url,{cache:"no-store",redirect:"manual"});
  if(r.type==="opaqueredirect"||r.status===0) throw new Error("planilla no compartida");
  if(!r.ok) throw new Error("hoja "+nombre+" "+r.status);
  const t=await r.text();
  if(/^\s*</.test(t)) throw new Error("planilla no pública");
  return parseCSV(t).slice(1).map(f=>f.map(x=>String(x||"").trim()));
}
function precio(v){
  let s=String(v||"").trim().replace(/\s/g,"");
  s=s.replace(/[.,]\d{1,2}$/,"");           // quita decimales
  const n=Number(s.replace(/\D/g,""));
  return n>0?n:0;
}
function foto(v){
  v=String(v||"").trim();
  if(!v) return "img/logo.png";
  const m=v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  if(m) return "https://lh3.googleusercontent.com/d/"+m[1]+"=w900";
  if(/^https?:\/\//i.test(v)) return v;
  return BASE_IMG+v.replace(/^img\//,"");
}
function horario(v){
  const m=String(v||"").match(/(\d{1,2})[:.](\d{2})\s*(?:-|–|a|hasta)\s*(\d{1,2})[:.](\d{2})/i);
  return m?{abierto:true,desde:m[1].padStart(2,"0")+":"+m[2],hasta:m[3].padStart(2,"0")+":"+m[4]}:{abierto:false,desde:"10:00",hasta:"19:00"};
}

window.cargarPlanilla=async function(){
  const [prod,cats,tien]=await Promise.all([hoja("Productos"),hoja("Categorías"),hoja("Tienda")]);
  const categorias=[];
  cats.forEach(f=>{ const n=f[0]; if(n&&!categorias.some(c=>c.id===slug(n))) categorias.push({id:slug(n),nombre:n}); });
  const catId=n=>{ const id=slug(n); if(n&&!categorias.some(c=>c.id===id)) categorias.push({id,nombre:n}); return id; };
  const productos=[], porId={};
  prod.forEach(f=>{
    const [nombre,cat,opNom,pr,det,selN,selV,medida,nota,estado,img,desc,otras]=f;
    if(!nombre) return;
    const id=slug(nombre); let p=porId[id];
    if(!p){
      const est=normal(estado);
      p=porId[id]={id,nombre,cat:[catId(cat||"Otros")],estado:est.startsWith("agot")?"agotado":est.startsWith("ocul")?"oculto":"disponible",
        img:foto(img),medida:medida||undefined,nota:nota||undefined,desc:desc||"",variantes:[]};
      String(otras||"").split(",").map(s=>s.trim()).filter(Boolean).forEach(o=>{const c=catId(o);if(!p.cat.includes(c))p.cat.push(c);});
      productos.push(p);
    }
    const v={nombre:opNom||"Única",precio:precio(pr)};
    if(det) v.detalle=det;
    const vals=String(selV||"").split(",").map(s=>s.trim()).filter(Boolean);
    if(selN&&vals.length) v.opcion={nombre:selN,valores:vals};
    if(v.precio>0) p.variantes.push(v);
  });
  const lista=productos.filter(p=>p.variantes.length);
  if(!lista.length) throw new Error("planilla sin productos");
  const T={}; tien.forEach(f=>{ if(f[0]) T[normal(f[0])]=f[1]||""; });
  const g=k=>{ for(const key in T) if(key.startsWith(normal(k))) return T[key]; return ""; };
  const tienda={nombre:"Organa",whatsapp:g("whatsapp").replace(/\D/g,""),instagram:g("instagram").replace(/^@/,""),
    puntoVenta:g("punto de venta"),ciudad:g("ciudad")||"Iquique",mapa:g("link de google maps"),feria:g("feria"),
    notaHorario:g("nota"),link:g("link del catalogo"),
    horarios:DIAS.map(d=>Object.assign({dia:d},horario(g(d))))};
  return {categorias,productos:lista,tienda};
};
})();
