/* Organa · Asesora: entiende lo que necesita la clienta y recomienda solo lo que le sirve.
   Uso: Asesora.init({ tienda: window.OrganaTienda, flor: "deco/peonia.png" })
   tienda = { datos(): {productos}, agregar(idProducto, indiceOpcion, selector), abrirPedido() } */
(function(){
"use strict";
const normal=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>"$"+Math.round(Number(n)||0).toLocaleString("es-CL");
const LS="organa-asesora"+(location.pathname.includes("/lista")?"-lista":"");
const guardar=(k,v)=>{try{localStorage.setItem(LS+"-"+k,JSON.stringify(v));}catch(e){}};
const leer=k=>{try{return JSON.parse(localStorage.getItem(LS+"-"+k)||"null");}catch(e){return null;}};

/* ---------- Preguntas ---------- */
const PASOS=[
  {id:"zonas",titulo:"¿Qué te gustaría cuidar hoy?",sub:"Puedes elegir más de una.",multi:true,omitir:true,op:[
    ["rostro","Mi rostro"],["cabello","Mi cabello"],["cuerpo","Mi cuerpo"],["labios","Mis labios"],["bienestar","Mi bienestar","Estrés, sueño, dolores"]]},
  {id:"piel",si:"rostro",titulo:"¿Cómo sientes tu piel la mayor parte del día?",sub:"Elige la que más se parezca.",multi:false,op:[
    ["seca","Seca o tirante"],["grasa","Grasa o con brillo"],["mixta","Mixta","Grasa en frente y nariz"],["sensible","Sensible o con rojeces"],["madura","Madura","Con líneas o menos firmeza"],["nose","No estoy segura"]]},
  {id:"rostro",si:"rostro",titulo:"¿Qué te gustaría mejorar en tu rostro?",sub:"Puedes elegir más de una.",multi:true,op:[
    ["deshidratada","Le falta hidratación"],["manchas","Manchas"],["arrugas","Líneas de expresión"],["acne","Granitos o poros"],["ojeras","Ojeras o bolsas"],["opaca","Se ve opaca, sin luz"],["maquillaje","Sacar bien el maquillaje"],["pestanas","Pestañas débiles"]]},
  {id:"cabello",si:"cabello",titulo:"¿Qué le pasa a tu cabello?",sub:"Puedes elegir más de una.",multi:true,op:[
    ["caida","Se me cae"],["caspa","Caspa o picazón"],["graso","Se engrasa rápido"],["cab_seco","Seco o con frizz"],["tenido","Teñido o con químicos"],["rizado","Rizado u ondulado"],["calor","Uso plancha o secador"],["ninos","Es para niños o cuero sensible"]]},
  {id:"cuerpo",si:"cuerpo",titulo:"¿Qué necesita tu cuerpo?",sub:"Puedes elegir más de una.",multi:true,op:[
    ["cuerpo_seco","Piel seca"],["pies","Talones agrietados"],["manos","Manos y codos resecos"],["heridas","Roces, heridas o cicatrices"],["irritacion","Irritación o picazón"],["sudor","Sudor u olor en axilas"],["exfoliar","Exfoliar o renovar la piel"],["aroma","Un aroma rico para llevar"]]},
  {id:"labios",si:"labios",titulo:"¿Cómo están tus labios?",sub:"Puedes elegir más de una.",multi:true,op:[
    ["labios_secos","Secos o partidos"],["brillo","Quiero brillo natural"]]},
  {id:"bienestar",si:"bienestar",titulo:"¿Qué te gustaría aliviar?",sub:"Puedes elegir más de una.",multi:true,op:[
    ["estres","Estrés o ansiedad"],["sueno","Me cuesta dormir"],["cabeza","Dolor de cabeza"],["musculos","Dolores musculares o cólicos"],["nariz","Nariz congestionada"],["concentracion","Me cuesta concentrarme"],["regalo","Quiero regalarme un momento para mí"]]},
  {id:"comentario",titulo:"¿Quieres contarme algo más?",sub:"Escribe con tus palabras lo que te pasa. Lo leo para afinar tus recomendaciones. Es opcional.",tipo:"texto"}
];

/* ---------- Qué sirve para cada necesidad ----------
   k = palabra del nombre del producto · v = palabra de la opción a sugerir · por = por qué se recomienda */
const R={
  seca:[{k:"acido hialuronico",por:"Hidrata en profundidad la piel seca."},{k:"agua termal",por:"Reduce la sequedad y calma la piel."},{k:"cremas faciales",v:"hialuronico",por:"Crema con ácido hialurónico para nutrir."}],
  grasa:[{k:"barra de limpieza",v:"grasa",por:"Limpia sin irritar y controla el brillo."},{k:"cremas faciales",v:"uva",por:"Crema ideal para pieles mixtas a grasas."},{k:"agua de azahar",por:"Equilibra la producción de grasa."}],
  mixta:[{k:"espuma de limpieza",por:"Limpia profundo sin resecar, ideal mixta a grasa."},{k:"cremas faciales",v:"uva",por:"Crema ideal para pieles mixtas a grasas."},{k:"agua de azahar",por:"Equilibra la grasa y aporta luz."}],
  sensible:[{k:"barra de limpieza",v:"sensible",por:"Limpieza suave para piel sensible o con rojeces."},{k:"cremas faciales",v:"calendula",por:"Crema calmante para pieles sensibles."},{k:"agua de calendula",por:"Calma rojeces e irritación."},{k:"agua de rosas",por:"Reduce rojeces y refresca."}],
  madura:[{k:"cremas faciales",v:"niacinamida y acido",por:"Ideal para pieles maduras y atenúa manchas."},{k:"contorno de ojos",por:"Suaviza líneas y descansa la mirada."},{k:"acido hialuronico",por:"Reduce arrugas y líneas de expresión."}],
  nose:[{k:"espuma de limpieza",por:"Limpieza suave apta para todo tipo de piel."},{k:"agua de rosas",por:"Tónico natural que equilibra cualquier piel."}],
  deshidratada:[{k:"acido hialuronico",por:"Devuelve la hidratación que le falta a tu piel."},{k:"agua termal",por:"Hidrata y protege del aire acondicionado y el clima."},{k:"agua de rosas",por:"Hidrata y refresca al instante."}],
  manchas:[{k:"cremas faciales",v:"niacinamida y acido",por:"La niacinamida ayuda a atenuar manchas."},{k:"exfoliante de cafe",por:"Renueva la piel y unifica el tono."}],
  arrugas:[{k:"acido hialuronico",por:"Rellena y suaviza líneas de expresión."},{k:"contorno de ojos",por:"Suaviza líneas alrededor de los ojos."},{k:"cremas faciales",v:"niacinamida y acido",por:"Ideal para pieles maduras."}],
  acne:[{k:"barra de limpieza",v:"grasa",por:"Limpia los poros sin resecar."},{k:"agua de calendula",por:"Ayuda a equilibrar pieles con tendencia al acné."},{k:"cremas faciales",v:"uva",por:"Hidrata sin engrasar."}],
  ojeras:[{k:"contorno de ojos",por:"Reduce bolsas e hinchazón con manzanilla."}],
  opaca:[{k:"exfoliante de cafe",por:"Quita células muertas y devuelve la luz."},{k:"agua de rosas",por:"Aporta luminosidad y frescura."},{k:"acido hialuronico",por:"Mejora la textura y la luminosidad."}],
  maquillaje:[{k:"desmaquillante",por:"Disuelve el maquillaje, incluso a prueba de agua."},{k:"agua micelar",por:"Limpia el maquillaje sin enjuague."}],
  pestanas:[{k:"serum de pestanas",por:"Fortalece y estimula el crecimiento de las pestañas."}],
  caida:[{k:"shampoo solido",v:"ortiga",por:"Ortiga y romero estimulan el crecimiento y reducen la caída."},{k:"tonico de romero",por:"Activa el cuero cabelludo y frena la caída."},{k:"shampoo liquido",por:"Fortalece desde la raíz."},{k:"crema capilar",por:"Ayuda a frenar la caída y fortalece las hebras."}],
  caspa:[{k:"shampoo solido",v:"neem",por:"El neem combate la caspa y calma la picazón."},{k:"tonico de romero",por:"Alivia la caspa y refresca el cuero cabelludo."}],
  graso:[{k:"shampoo solido",v:"ortiga",por:"Regula el sebo y controla la grasa."},{k:"tonico de romero",por:"Equilibra la grasa del cuero cabelludo."}],
  cab_seco:[{k:"bomba capilar",por:"Hidratación profunda contra el frizz."},{k:"acondicionador",por:"Sella la cutícula y desenreda."},{k:"shampoo solido",v:"rosa",por:"Hidratación, suavidad y brillo."}],
  tenido:[{k:"shampoo solido",v:"rosa",por:"Pensado para cabellos teñidos."},{k:"bomba capilar",por:"Repara la fibra dañada."},{k:"protector de calor",por:"Protege el cabello tratado."}],
  rizado:[{k:"shampoo solido",v:"cacao",por:"Nutre y define rizos."},{k:"bomba capilar",por:"Mejora la definición de rizos y ondas."}],
  calor:[{k:"protector de calor",por:"Crea una barrera contra plancha y secador."}],
  ninos:[{k:"shampoo solido",v:"manzanilla",por:"Suave para niños y cuero cabelludo sensible."}],
  cuerpo_seco:[{k:"manteca corporal",por:"Hidratación profunda y duradera con karité."},{k:"exfoliante de cafe",por:"Renueva y suaviza la piel del cuerpo."}],
  pies:[{k:"balsamo de pies",por:"Repara talones agrietados."}],
  manos:[{k:"pulpa nutritiva",por:"Transforma manos y codos resecos."},{k:"crema solida de manos",por:"Hidratación intensa que dura más."}],
  heridas:[{k:"unguento de matico",por:"Cicatrizante y antibacteriano natural."},{k:"balsamo de calendula",por:"Acelera la curación de roces y pequeñas heridas."}],
  irritacion:[{k:"balsamo de calendula",por:"Calma irritación y enrojecimiento."},{k:"agua de calendula",por:"Alivia irritaciones, incluso en bebés."}],
  sudor:[{k:"desodorantes",v:"crema",por:"Fórmula para alta sudoración, sin químicos agresivos."}],
  exfoliar:[{k:"exfoliante de cafe",por:"Remueve células muertas y atenúa manchas."},{k:"lufas",por:"Exfolia suave y activa la circulación."}],
  aroma:[{k:"perfume solido",por:"Perfume natural, fácil de llevar."},{k:"brumas",por:"Aromas con intención para tu día."}],
  labios_secos:[{k:"balsamo de labios",por:"Repara grietas con manteca de cacao."},{k:"lip gloss",por:"Hidrata y protege con aceite de ricino."}],
  brillo:[{k:"lip gloss",por:"Brillo natural sin sensación pegajosa."}],
  estres:[{k:"roll on",v:"estres",por:"Aceites esenciales para soltar la tensión."},{k:"punto calma",por:"Alivia el estrés con un masaje suave."},{k:"sales de bano",v:"relax",por:"Un baño que relaja cuerpo y mente."}],
  sueno:[{k:"roll on",v:"dormir",por:"Ayuda a relajarte antes de dormir."},{k:"saquitos",v:"antifaz",por:"Calor suave que mejora el descanso."},{k:"brumas",v:"relax",por:"Aroma relajante para tu almohada."}],
  cabeza:[{k:"roll on",v:"jaqueca",por:"Alivia el dolor de cabeza con aceites esenciales."},{k:"punto calma",por:"Masaje en sienes para la jaqueca."}],
  musculos:[{k:"saquitos",v:"lumbar",por:"Calor profundo para dolores y cólicos."},{k:"punto calma",por:"Alivia dolores musculares leves."},{k:"bano relajacion",v:"efervescentes",por:"Relaja el cuerpo en la tina."}],
  nariz:[{k:"inhalador",por:"Descongestiona con aceites esenciales puros."}],
  concentracion:[{k:"roll on",v:"concentracion",por:"Aromas que te ayudan a enfocarte."}],
  regalo:[{k:"secretos de alquimia",v:"completo",por:"Un kit completo para tu ritual."},{k:"bano relajacion",por:"Un momento de spa en casa."}]
};

/* Palabras que la clienta puede escribir en el comentario */
const PALABRAS=[
  [/piel (muy )?seca|cara (muy )?seca|reseca|tirante|deshidrat|aspera|escama|descam/,["seca","deshidratada"]],
  [/grasa|brillo en la cara|brillosa|aceitosa/,["grasa"]],
  [/mixta|zona t/,["mixta"]],
  [/sensible|rojez|rosace|enrojec|irritad|arde|ardor/,["sensible","irritacion"]],
  [/mancha|paño|melasma|pecas/,["manchas"]],
  [/arruga|linea|flacid|madura|edad/,["arrugas","madura"]],
  [/acne|granit|espinilla|poro|barro|puntos negros/,["acne"]],
  [/ojera|bolsa|ojos hinchados/,["ojeras"]],
  [/opaca|apagad|sin brillo|cansad/,["opaca"]],
  [/maquillaje|desmaquill|rimel|mascara/,["maquillaje"]],
  [/pestana/,["pestanas"]],
  [/se me cae|caida|cae el pelo|cae el cabello|cae mucho el pelo|cae mucho el cabello|calvicie|entradas|ralo/,["caida"]],
  [/caspa|pica la cabeza|picazon en la cabeza|cuero cabelludo/,["caspa"]],
  [/pelo graso|cabello graso|se engrasa/,["graso"]],
  [/frizz|esponjad|pelo seco|cabello seco|puntas|quebradi/,["cab_seco"]],
  [/tinte|tenid|decolor|mechas|alisado|keratina/,["tenido"]],
  [/rizo|crespo|ondulad|chino/,["rizado"]],
  [/plancha|secador|rizador|ondulador/,["calor"]],
  [/hij|nino|nina|bebe|guagua/,["ninos"]],
  [/talon|pies|pie |planta del pie/,["pies"]],
  [/mano|codo|rodilla/,["manos"]],
  [/herida|corte|cicatriz|quemadura|roce|rozadura|raspon/,["heridas"]],
  [/picazon|pica|alergia|dermatitis|eczema/,["irritacion"]],
  [/sudo|transpir|olor|axila/,["sudor"]],
  [/celulitis|estria|exfoli/,["exfoliar"]],
  [/perfume|aroma|oler rico/,["aroma"]],
  [/labio|boca seca|comisura/,["labios_secos"]],
  [/estres|ansiedad|nervio|angustia|agobi|tension/,["estres"]],
  [/dormir|duermo|insomnio|sueno|desvel|descans|despierto en la noche/,["sueno"]],
  [/(dolor|duele|duelen|dolia)[a-z]* (de |la |el )?cabeza|cabeza.{0,15}(duele|dolor)|jaqueca|migran|cefalea/,["cabeza"]],
  [/colico|menstrua|regla|espalda|lumbar|cuello|contractura|muscul|dolor/,["musculos"]],
  [/congestion|nariz tapada|resfri|sinusitis|alergia nasal/,["nariz"]],
  [/concentra|estudi|enfoc|memoria/,["concentracion"]],
  [/regalo|regalar|darme un gusto|consentir|mimar/,["regalo"]]
];
const ALERTA=/infecci|pus|sangra|fiebre|hinchaz|embaraz|lactan|alergia fuerte|medicamento|tratamiento medico/;

const ETIQ={};PASOS.forEach(p=>(p.op||[]).forEach(o=>ETIQ[o[0]]=o[1]));
const ZONA_DE={};PASOS.forEach(p=>{if(p.si)(p.op||[]).forEach(o=>ZONA_DE[o[0]]=p.si);});

/* ---------- Estado y vista ---------- */
let T=null, resp={}, idx=0, el=null, cfg={};
const pasosActivos=()=>PASOS.filter(p=>!p.si||(resp.zonas||[]).includes(p.si));

function css(){
  if(document.getElementById("asesora-css")) return;
  const s=document.createElement("style"); s.id="asesora-css";
  s.textContent=`
.as-fondo{position:fixed;inset:0;z-index:80;background:linear-gradient(170deg,#ece2fa 0%,#f8f3ff 55%,#f3ecfb 100%);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#3b2d4f;font-family:"Nunito Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
.as-fondo[hidden]{display:none!important}
.as-caja{position:relative;overflow-x:clip;max-width:560px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;padding:calc(18px + env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) calc(22px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px))}
.as-flor{position:absolute;pointer-events:none;opacity:.5;width:150px;right:-30px;top:20px;transform:rotate(14deg)}
.as-flor.b{left:-40px;right:auto;top:auto;bottom:30px;width:120px;transform:rotate(-20deg)}
.as-top{display:flex;align-items:center;gap:10px;min-height:40px;position:relative;z-index:1}
.as-top .as-x{margin-left:auto}
.as-btn-txt{border:0;background:none;color:#7b4fb0;font-weight:800;padding:8px 4px;font-size:.92rem;cursor:pointer}
.as-x{width:38px;height:38px;border-radius:50%;border:0;background:#fff;color:#7b4fb0;font-size:1.2rem;box-shadow:0 2px 10px rgba(123,79,176,.15);cursor:pointer}
.as-prog{display:flex;gap:5px;flex:1}
.as-prog i{flex:1;height:5px;border-radius:5px;background:#e0d2f4}
.as-prog i.ok{background:#a47ad8}
.as-cuerpo{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;padding-block:14px}
.as-tit{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:600;font-size:clamp(2rem,8vw,2.6rem);line-height:1.05;margin:0 0 10px;color:#7b4fb0;text-wrap:balance}
.as-txt{margin:0 0 18px;color:#6f6382;font-size:1rem;line-height:1.55}
.as-ops{display:grid;gap:9px}
.as-op{display:flex;align-items:center;gap:12px;text-align:left;border:2px solid #e3d7f4;background:#fff;border-radius:18px;padding:13px 14px;font-weight:700;font-size:1rem;color:#3b2d4f;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
.as-op small{display:block;font-weight:500;font-size:.8rem;color:#7d6f8f;margin-top:1px}
.as-op .as-mk{flex:none;width:24px;height:24px;border-radius:50%;border:2px solid #cbb4ec;display:grid;place-items:center;color:#fff;font-size:.85rem}
.as-op.multi .as-mk{border-radius:7px}
.as-op[aria-pressed="true"]{border-color:#a47ad8;background:#f7f2fe}
.as-op[aria-pressed="true"] .as-mk{background:#a47ad8;border-color:#a47ad8}
.as-op:active{transform:scale(.98)}
.as-area{width:100%;min-height:130px;border:2px solid #e3d7f4;border-radius:18px;padding:14px;font:inherit;font-size:1rem;background:#fff;resize:vertical;color:#3b2d4f}
.as-area:focus{outline:none;border-color:#a47ad8}
.as-pie{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;padding-top:10px}
.as-prim{border:0;border-radius:999px;padding:15px 20px;font-weight:800;font-size:1.02rem;background:#7b4fb0;color:#fff;box-shadow:0 6px 18px rgba(123,79,176,.25);cursor:pointer}
.as-prim[disabled]{opacity:.45;cursor:not-allowed}
.as-sec{border:0;border-radius:999px;padding:13px 20px;font-weight:800;background:#fff;color:#7b4fb0;box-shadow:inset 0 0 0 2px #e3d7f4;cursor:pointer}
.as-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px}
.as-chips span{font-size:.78rem;font-weight:700;border-radius:999px;padding:4px 10px;background:#fff;color:#7b4fb0;box-shadow:inset 0 0 0 1.5px #e3d7f4}
.as-rec{display:flex;flex-direction:column;gap:10px}
.as-card{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;background:#fff;border-radius:20px;padding:12px;box-shadow:0 4px 16px rgba(123,79,176,.12)}
.as-card .f{width:64px;height:64px;border-radius:16px;background:#ece2fa center/cover}
.as-card h3{margin:0;font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:1.22rem;line-height:1.1}
.as-card .op-n{font-size:.8rem;color:#7d6f8f;margin-top:2px}
.as-card ul{margin:6px 0 0;padding-left:1.1em;font-size:.86rem;color:#4f4263}
.as-card li::marker{color:#a47ad8}
.as-card .fila{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
.as-card .pr{font-weight:800;color:#7b4fb0;background:#ece2fa;border-radius:999px;padding:4px 10px}
.as-card select{flex:1;min-width:120px;border:1.5px solid #e3d7f4;border-radius:12px;padding:7px 8px;background:#fff;font:inherit;font-size:.86rem;color:#3b2d4f}
.as-card .add{margin-left:auto;border:0;border-radius:999px;padding:8px 14px;font-weight:800;background:#a47ad8;color:#fff;cursor:pointer}
.as-card .add.ok{background:#7f9e7b}
.as-nota{font-size:.8rem;color:#7d6f8f;background:rgba(255,255,255,.7);border-radius:14px;padding:10px 12px;margin:14px 0 0;line-height:1.45}
.as-nota.alerta{background:#fff1ec;color:#a0472f;font-weight:700}
.as-escuche{background:#fff;border-radius:18px;padding:12px 14px;margin:0 0 14px;font-size:.9rem;color:#4f4263;box-shadow:0 2px 12px rgba(123,79,176,.1)}
.as-escuche b{color:#7b4fb0}
@media (prefers-reduced-motion:no-preference){.as-cuerpo{animation:asEntra .35s ease both}@keyframes asEntra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}
`;
  document.head.appendChild(s);
}

function abrir(desdeInicio){
  css(); T=cfg.tienda;
  if(!el){ el=document.createElement("div"); el.className="as-fondo"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Asesora Organa"); document.body.appendChild(el); }
  el.hidden=false; document.documentElement.style.overflow="hidden";
  try{ history.pushState({asesora:1},""); }catch(e){}
  if(desdeInicio){ resp={}; idx=-1; }
  pintar();
}
function cerrar(viaAtras){
  if(!el||el.hidden) return;
  el.hidden=true; document.documentElement.style.overflow=""; guardar("visto",true);
  if(!viaAtras&&history.state&&history.state.asesora){ try{history.back();}catch(e){} }
}
window.addEventListener("popstate",()=>{ if(el&&!el.hidden){ if(idx>0&&idx<pasosActivos().length){ try{history.pushState({asesora:1},"");}catch(e){} idx--; pintar(); } else cerrar(true); } });

function flores(){ return cfg.flor?`<img class="as-flor" src="${esc(cfg.flor)}" alt=""><img class="as-flor b" src="${esc(cfg.flor2||cfg.flor)}" alt="">`:""; }

function pintar(){
  const ps=pasosActivos();
  if(idx===-1) return bienvenida();
  if(idx>=ps.length) return resultados();
  const p=ps[idx], sel=resp[p.id]||(p.tipo==="texto"?"":[]);
  const prog=ps.map((_,i)=>`<i class="${i<=idx?"ok":""}"></i>`).join("");
  let cuerpo;
  if(p.tipo==="texto"){
    cuerpo=`<textarea class="as-area" id="asTxt" placeholder="Ej: Tengo la piel muy seca en invierno y se me cae mucho el pelo…">${esc(sel)}</textarea>`;
  } else {
    cuerpo=`<div class="as-ops" role="group" aria-label="${esc(p.titulo)}">${p.op.map(o=>`<button type="button" class="as-op${p.multi?" multi":""}" data-v="${esc(o[0])}" aria-pressed="${sel.includes(o[0])}"><span class="as-mk" aria-hidden="true">${sel.includes(o[0])?"✓":""}</span><span>${esc(o[1])}${o[2]?`<small>${esc(o[2])}</small>`:""}</span></button>`).join("")}</div>`;
  }
  const ultimo=idx===ps.length-1;
  el.innerHTML=`<div class="as-caja">${flores()}
    <div class="as-top">${idx>0?'<button class="as-btn-txt" id="asAtras" type="button">‹ Atrás</button>':""}<div class="as-prog" aria-hidden="true">${prog}</div><button class="as-x" id="asX" type="button" aria-label="Cerrar">×</button></div>
    <div class="as-cuerpo"><h2 class="as-tit">${esc(p.titulo)}</h2><p class="as-txt">${esc(p.sub||"")}</p>${cuerpo}</div>
    <div class="as-pie"><button class="as-prim" id="asSig" type="button">${ultimo?"Ver mis recomendaciones":"Siguiente"}</button>${p.omitir?'<button class="as-sec" id="asOmitir" type="button">Omitir y ver el catálogo</button>':""}</div></div>`;
  const btnSig=el.querySelector("#asSig");
  const validar=()=>{ if(p.tipo!=="texto") btnSig.disabled=!(resp[p.id]||[]).length; };
  el.querySelectorAll(".as-op").forEach(b=>b.onclick=()=>{
    const v=b.dataset.v; let a=resp[p.id]||[];
    if(p.multi) a=a.includes(v)?a.filter(x=>x!==v):a.concat(v); else a=[v];
    resp[p.id]=a;
    el.querySelectorAll(".as-op").forEach(x=>{const on=a.includes(x.dataset.v);x.setAttribute("aria-pressed",on);x.querySelector(".as-mk").textContent=on?"✓":"";});
    validar();
    if(!p.multi) setTimeout(()=>{idx++;pintar();},180);
  });
  validar();
  btnSig.onclick=()=>{ if(p.tipo==="texto") resp.comentario=(el.querySelector("#asTxt").value||"").trim(); idx++; pintar(); };
  const at=el.querySelector("#asAtras"); if(at) at.onclick=()=>{ if(p.tipo==="texto") resp.comentario=(el.querySelector("#asTxt").value||"").trim(); idx--; pintar(); };
  el.querySelector("#asX").onclick=()=>cerrar();
  const om=el.querySelector("#asOmitir"); if(om) om.onclick=()=>cerrar();
  el.scrollTop=0;
  const f=el.querySelector(".as-op,#asTxt"); if(f&&p.tipo==="texto") f.focus({preventScroll:true});
}

function bienvenida(){
  el.innerHTML=`<div class="as-caja">${flores()}
    <div class="as-top"><button class="as-x" id="asX" type="button" aria-label="Cerrar">×</button></div>
    <div class="as-cuerpo">
      <h2 class="as-tit">Cuéntame qué te pasa y te ayudo a elegir</h2>
      <p class="as-txt">Antes de mostrarte el catálogo, me gustaría entender qué necesitas. Responde unas preguntas rápidas sobre tu piel, tu cabello o cómo te sientes, y te recomendaré solo lo que de verdad te puede ayudar.</p>
    </div>
    <div class="as-pie"><button class="as-prim" id="asEmp" type="button">Empezar · toma 1 minuto</button><button class="as-sec" id="asOmitir" type="button">Prefiero ver el catálogo</button></div></div>`;
  el.querySelector("#asEmp").onclick=()=>{idx=0;pintar();};
  el.querySelector("#asOmitir").onclick=()=>cerrar();
  el.querySelector("#asX").onclick=()=>cerrar();
  el.scrollTop=0;
}

/* ---------- Motor de recomendaciones ---------- */
function etiquetas(){
  const t=new Set();
  ["piel","rostro","cabello","cuerpo","labios","bienestar"].forEach(k=>(resp[k]||[]).forEach(v=>t.add(v)));
  const leidas=new Set(), txt=" "+normal(resp.comentario)+" ";
  if(txt.trim()) PALABRAS.forEach(([re,tags])=>{ if(re.test(txt)) tags.forEach(x=>{ if(!t.has(x)) leidas.add(x); t.add(x); }); });
  return {todas:[...t],leidas:[...leidas]};
}
function buscar(k){
  const ps=(T.datos().productos||[]).filter(p=>p.estado!=="oculto"&&p.estado!=="agotado"&&p.variantes&&p.variantes.length);
  return ps.find(p=>normal(p.nombre).includes(k));
}
function varianteDe(p,v){
  if(!v||p.variantes.length<2) return 0;
  const i=p.variantes.findIndex(x=>normal(x.nombre+" "+(x.detalle||"")).includes(v));
  return i<0?0:i;
}
function recomendar(){
  const {todas}=etiquetas(), mapa=new Map();
  todas.forEach((tag,orden)=>(R[tag]||[]).forEach((r,pos)=>{
    const p=buscar(r.k); if(!p) return;
    let m=mapa.get(p.id);
    if(!m){ m={p,vi:varianteDe(p,r.v),pts:0,por:[],orden:orden*10+pos}; mapa.set(p.id,m); }
    m.pts+=pos===0?3:2; if(!m.por.includes(r.por)) m.por.push(r.por);
  }));
  const lista=[...mapa.values()].sort((a,b)=>b.pts-a.pts||a.orden-b.orden), elegidos=[];
  todas.forEach(tag=>{ const r=(R[tag]||[]).map(x=>buscar(x.k)).find(Boolean); if(!r) return;
    const m=mapa.get(r.id); if(m&&!elegidos.includes(m)) elegidos.push(m); });
  lista.forEach(m=>{ if(elegidos.length<8&&!elegidos.includes(m)) elegidos.push(m); });
  return elegidos.slice(0,Math.max(8,elegidos.length>8?8:elegidos.length)).sort((a,b)=>b.pts-a.pts||a.orden-b.orden);
}
function resumen(){
  const r=leer("respuestas"); if(!r) return "";
  const partes=[];
  if(r.piel&&r.piel.length) partes.push("Piel: "+r.piel.map(v=>ETIQ[v]).join(", "));
  ["rostro","cabello","cuerpo","labios","bienestar"].forEach(k=>{ if(r[k]&&r[k].length) partes.push((k==="rostro"?"Rostro":k==="cabello"?"Cabello":k==="cuerpo"?"Cuerpo":k==="labios"?"Labios":"Bienestar")+": "+r[k].map(v=>ETIQ[v]).join(", ")); });
  if(r.comentario) partes.push("Comentario: \""+r.comentario+"\"");
  return partes.join(" · ");
}

function resultados(){
  guardar("respuestas",resp);
  const {todas,leidas}=etiquetas(), recs=recomendar();
  const chips=todas.filter(t=>ETIQ[t]).map(t=>`<span>${esc(ETIQ[t])}</span>`).join("");
  const alerta=ALERTA.test(normal(resp.comentario));
  const escuche=resp.comentario?`<div class="as-escuche"><b>Leí lo que me contaste.</b> ${leidas.length?`Además de tus respuestas, tomé en cuenta: ${leidas.filter(t=>ETIQ[t]).map(t=>esc(ETIQ[t]).toLowerCase()).join(", ")}.`:"Lo tendremos en cuenta al confirmar tu pedido."}</div>`:"";
  const cards=recs.map((m,i)=>{
    const p=m.p, v=p.variantes[m.vi], op=(v.opcion||p.opcion);
    const sel=op&&op.valores&&op.valores.length?`<select data-i="${i}" aria-label="${esc(op.nombre||"Elige")}">${op.valores.map(x=>`<option>${esc(x)}</option>`).join("")}</select>`:"";
    return `<article class="as-card"><div class="f" style="background-image:url('${esc(p.img)}')"></div><div style="min-width:0">
      <h3>${esc(p.nombre)}</h3>${v.nombre!=="Única"?`<div class="op-n">Te sugiero: <b>${esc(v.nombre)}</b></div>`:""}
      <ul>${m.por.slice(0,2).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <div class="fila"><span class="pr">${fmt(v.precio)}</span>${sel}<button class="add" type="button" data-i="${i}">Agregar</button></div></div></article>`;
  }).join("");
  el.innerHTML=`<div class="as-caja">${flores()}
    <div class="as-top"><button class="as-btn-txt" id="asRehacer" type="button">‹ Responder de nuevo</button><button class="as-x" id="asX" type="button" aria-label="Cerrar">×</button></div>
    <div class="as-cuerpo" style="justify-content:flex-start">
      <h2 class="as-tit">${recs.length?"Esto es lo que te recomiendo":"Gracias por contarme"}</h2>
      ${chips?`<div class="as-chips">${chips}</div>`:""}
      ${escuche}
      ${recs.length?`<p class="as-txt" style="margin-bottom:12px">Elegí solo lo que responde a lo que me contaste. Puedes agregar cada uno o todo de una vez.</p><div class="as-rec">${cards}</div>`:`<p class="as-txt">No encontré un producto específico para eso, pero puedes revisar el catálogo completo o escribirnos y te orientamos.</p>`}
      ${alerta?'<p class="as-nota alerta">Por lo que me cuentas, te sugiero consultar también con un profesional de salud. Nuestros productos son cosmética natural y no reemplazan un tratamiento médico.</p>':'<p class="as-nota">Son recomendaciones de cosmética natural según lo que me contaste. Si tienes una condición de piel persistente, consulta con un dermatólogo.</p>'}
    </div>
    <div class="as-pie">${recs.length?'<button class="as-prim" id="asTodo" type="button">Agregar todo a mi pedido</button>':""}<button class="as-sec" id="asCat" type="button">Ver el catálogo completo</button></div></div>`;
  const agregar=i=>{ const m=recs[i], s=el.querySelector(`select[data-i="${i}"]`); T.agregar(m.p.id,m.vi,s?s.value:null); const b=el.querySelector(`.add[data-i="${i}"]`); if(b){b.textContent="✓ Agregado";b.classList.add("ok");} };
  el.querySelectorAll(".add").forEach(b=>b.onclick=()=>agregar(+b.dataset.i));
  const todo=el.querySelector("#asTodo"); if(todo) todo.onclick=()=>{ recs.forEach((_,i)=>{ const b=el.querySelector(`.add[data-i="${i}"]`); if(!b.classList.contains("ok")) agregar(i); }); cerrar(); setTimeout(()=>T.abrirPedido&&T.abrirPedido(),350); };
  el.querySelector("#asCat").onclick=()=>cerrar();
  el.querySelector("#asX").onclick=()=>cerrar();
  el.querySelector("#asRehacer").onclick=()=>{resp={};idx=0;pintar();};
  el.scrollTop=0;
}

window.Asesora={
  init(c){ cfg=c||{}; },
  abrir(){ abrir(true); },
  /* Se abre al inicio de cada visita (por el flyer o por el link normal). Si recarga en la misma visita, no se repite. */
  abrirSiPrimeraVez(){
    if(/#admin/.test(location.hash)) return;
    let ya=false; try{ ya=sessionStorage.getItem(LS+"-sesion")==="1"; }catch(e){}
    if(ya) return;
    try{ sessionStorage.setItem(LS+"-sesion","1"); }catch(e){}
    abrir(true);
  },
  resumen
};
})();
