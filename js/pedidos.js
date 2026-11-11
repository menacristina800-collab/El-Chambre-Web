import {db,auth} from "./firebase.js";
import {requireUser} from "./session.js";
import {esc} from "./utils.js";
import {collection,query,where,getDocs,addDoc,doc,getDoc,serverTimestamp,orderBy} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("es-SV",{style:"currency",currency:"USD"}).format(n);
let productos=[];
const msg=(t,err=false)=>{ $("#mensaje").textContent=t;$("#mensaje").dataset.tipo=err?"error":"ok"; };
const {user}=await requireUser();
$("#fecha").min=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
try{
 const ps=await getDocs(query(collection(db,"productos"),where("activo","==",true)));
 productos=ps.docs.map(d=>({id:d.id,...d.data()}));
 $("#producto").innerHTML='<option value="">Elegí un producto</option>'+productos.map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)} — ${money(p.precio)}</option>`).join("");
 if(!productos.length) $("#producto").innerHTML='<option value="">No hay productos disponibles</option>';
} catch(e){msg("No se pudieron cargar los productos. Revisá la conexión.",true);}
$("#form-pedido").addEventListener("submit",async e=>{
 e.preventDefault(); const f=e.currentTarget, p=productos.find(x=>x.id===f.producto.value), cantidad=Number(f.cantidad.value);
 if(!p)return msg("Seleccioná un producto válido.",true);
 if(!Number.isInteger(cantidad)||cantidad<1||cantidad>30)return msg("La cantidad debe estar entre 1 y 30.",true);
 const fecha=f.fecha.value, hora=f.hora.value;
 if(!fecha||!hora)return msg("Completá fecha y hora.",true);
 const d=new Date(fecha+"T"+hora+":00");
 if(Number.isNaN(d.getTime())||d.getTime()<Date.now())return msg("Elegí una fecha y hora futuras.",true);
 if(hora<"06:00"||hora>"19:00")return msg("La recogida debe ser entre 6:00 am y 7:00 pm.",true);
 if(d.getDay()===0)return msg("Los domingos no abrimos. Elegí otro día.",true);
 if(d.getDay()===6&&(hora<"07:00"||hora>"17:00"))return msg("Los sábados atendemos de 7:00 am a 5:00 pm.",true);
 const btn=f.querySelector("button");btn.disabled=true;msg("Guardando tu pedido…");
 try{
  await addDoc(collection(db,"pedidos"),{usuarioId:user.uid,cliente:user.displayName||user.email,productoId:p.id,productoNombre:p.nombre,precioUnitario:Number(p.precio),cantidad,total:Number((p.precio*cantidad).toFixed(2)),sucursal:f.sucursal.value,fecha,hora,nota:f.nota.value.trim(),estado:"Pendiente",creadoEn:serverTimestamp()});
  f.reset();msg("¡Pedido guardado! Ya aparece en Mis pedidos.");await cargarPedidos();
 }catch(err){msg("No se pudo guardar el pedido. Verificá tu conexión o permisos.",true);}
 finally{btn.disabled=false;}
});
async function cargarPedidos(){
 const box=$("#lista-pedidos");box.innerHTML='<p class="empty">Cargando…</p>';
 try{
  const snap=await getDocs(query(collection(db,"pedidos"),where("usuarioId","==",user.uid)));
  let rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.creadoEn?.seconds||0)-(a.creadoEn?.seconds||0));
  const filtro=$("#buscar-pedidos").value.trim().toLowerCase();rows=rows.filter(x=>(x.estado||"").toLowerCase().includes(filtro));
  box.innerHTML=rows.length?rows.map(o=>`<article class="order-card"><span class="badge">${esc(o.estado)}</span><h3>${esc(o.productoNombre)}</h3><p>${o.cantidad} × ${money(o.precioUnitario)}</p><p class="price">${money(o.total)}</p><p>${esc(o.sucursal)} · ${esc(o.fecha)} · ${esc(o.hora)}</p><p class="muted">${esc(o.nota)||"Sin notas"}</p></article>`).join(""):'<p class="empty">Todavía no tenés pedidos que mostrar.</p>';
 }catch(e){box.innerHTML='<p class="empty">No se pudieron consultar tus pedidos.</p>';}
}
$("#buscar-pedidos").addEventListener("input",cargarPedidos);
await cargarPedidos();