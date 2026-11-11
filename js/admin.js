import { db } from "./firebase.js";
import { requireUser } from "./session.js";
import { esc } from "./utils.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const $ = s => document.querySelector(s), money = n => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(n);
await requireUser({ admin: true });
let productos = [], pedidos = [];
const say = (t, err = false) => { $("#mensaje-producto").textContent = t; $("#mensaje-producto").dataset.tipo = err ? "error" : "ok"; };
async function cargarProductos() {
    const snap = await getDocs(collection(db, "productos")); productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const term = $("#buscar-productos").value.toLowerCase();
    const list = productos.filter(p => (p.nombre + " " + p.categoria).toLowerCase().includes(term));
    $("#lista-productos").innerHTML = list.length ? list.map(p => `<article class="product-card"><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p><p>${esc(p.categoria)} · <strong>${money(p.precio)}</strong></p><span class="badge">${p.activo ? "Activo" : "Inactivo"}</span><div class="actions"><button data-edit="${esc(p.id)}">Editar</button><button class="btn-secondary" data-toggle="${esc(p.id)}">${p.activo ? "Desactivar" : "Activar"}</button><button class="btn-secondary" data-delete="${esc(p.id)}">Eliminar</button></div></article>`).join("") : '<p class="empty">No hay productos.</p>';
}
$("#form-producto").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.currentTarget, id = f.elements.id.value, data = { nombre: f.nombre.value.trim(), precio: Number(f.precio.value), categoria: f.categoria.value, descripcion: f.descripcion.value.trim(), activo: true, actualizadoEn: serverTimestamp() };
    if (!data.nombre || !Number.isFinite(data.precio) || data.precio <= 0) return say("Revisá el nombre y el precio.", true);
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true; say("Guardando…");
    try { if (id) { const old = productos.find(p => p.id === id); data.activo = old?.activo ?? true; await updateDoc(doc(db, "productos", id), data); say("Producto actualizado."); } else { data.creadoEn = serverTimestamp(); await addDoc(collection(db, "productos"), data); say("Producto agregado."); } f.reset(); f.elements.id.value = ""; $("#titulo-form-producto").textContent = "Agregar producto"; await cargarProductos(); }
    catch (err) { say("No se pudo guardar. Revisá permisos de administrador.", true); } finally { btn.disabled = false; }
});
$("#lista-productos").addEventListener("click", async e => {
    const edit = e.target.dataset.edit, toggle = e.target.dataset.toggle, del = e.target.dataset.delete;
    try {
        if (edit) { const p = productos.find(x => x.id === edit), f = $("#form-producto"); f.elements.id.value = p.id; f.nombre.value = p.nombre; f.precio.value = p.precio; f.categoria.value = p.categoria; f.descripcion.value = p.descripcion || ""; $("#titulo-form-producto").textContent = "Editar producto"; scrollTo({ top: 0, behavior: "smooth" }); }
        if (toggle) { const p = productos.find(x => x.id === toggle); await updateDoc(doc(db, "productos", toggle), { activo: !p.activo }); await cargarProductos(); }
        if (del && confirm("¿Eliminar este producto definitivamente?")) { await deleteDoc(doc(db, "productos", del)); await cargarProductos(); }
    } catch (err) { say("No se pudo completar la operación. Verificá permisos.", true); }
});
$("#cancelar-edicion").addEventListener("click", () => { $("#form-producto").elements.id.value = ""; $("#titulo-form-producto").textContent = "Agregar producto"; });
$("#buscar-productos").addEventListener("input", cargarProductos);
$("#cargar-demo").addEventListener("click", async () => {
    if (!confirm("Se agregarán los productos de demostración. ¿Continuar?")) return;
    const btn = $("#cargar-demo"); btn.disabled = true;
    try {
        const ya = await getDocs(collection(db, "productos"));
        if (!ya.empty) { say("El catálogo ya tiene productos. No se duplicó la carga.", true); return; }
        const response = await fetch("../firebase/productos-iniciales.json");
        if (!response.ok) throw new Error("No se pudo leer el catálogo inicial");
        const data = await response.json();
        for (const p of data) await addDoc(collection(db, "productos"), { ...p, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
        say("Catálogo inicial cargado correctamente."); await cargarProductos();
    } catch (err) { say("No se pudo cargar el catálogo. Verificá permisos y conexión.", true); }
    finally { btn.disabled = false; }
});
async function cargarPedidos() {
    const snap = await getDocs(query(collection(db, "pedidos"), orderBy("creadoEn", "desc"))); pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const estado = $("#filtro-estado").value, rows = pedidos.filter(p => !estado || p.estado === estado);
    $("#resumen").textContent = `${pedidos.length} pedidos registrados · ${money(pedidos.filter(p => p.estado !== "Cancelado").reduce((a, p) => a + (Number(p.total) || 0), 0))} en pedidos no cancelados`;
    $("#lista-admin-pedidos").innerHTML = rows.length ? `<table><thead><tr><th>Cliente / Producto</th><th>Recogida</th><th>Total</th><th>Estado</th><th>Actualizar</th></tr></thead><tbody>${rows.map(p => `<tr><td>${esc(p.cliente) || "Cliente"}<br>${esc(p.productoNombre)} × ${esc(p.cantidad)}</td><td>${esc(p.sucursal)}<br>${esc(p.fecha)} ${esc(p.hora)}</td><td>${money(p.total)}</td><td>${esc(p.estado)}</td><td><select data-status="${esc(p.id)}" aria-label="Estado del pedido"><option ${p.estado === "Pendiente" ? "selected" : ""}>Pendiente</option><option ${p.estado === "Preparando" ? "selected" : ""}>Preparando</option><option ${p.estado === "Listo" ? "selected" : ""}>Listo</option><option ${p.estado === "Entregado" ? "selected" : ""}>Entregado</option><option ${p.estado === "Cancelado" ? "selected" : ""}>Cancelado</option></select></td></tr>`).join("")}</tbody></table>` : '<p class="empty">No hay pedidos para este filtro.</p>';
}
$("#lista-admin-pedidos").addEventListener("change", async e => { const id = e.target.dataset.status; if (!id) return; try { await updateDoc(doc(db, "pedidos", id), { estado: e.target.value, actualizadoEn: serverTimestamp() }); await cargarPedidos(); } catch (err) { alert("No se pudo actualizar el estado. Revisá las reglas."); } });
$("#filtro-estado").addEventListener("change", cargarPedidos);
const MOTIVOS = { pedido: "Pedido para recoger", evento: "Reunión o evento", panetones: "Panetones", tarta: "Tarta de manzana", consulta: "Consulta general" };
async function cargarConsultas() {
    const snap = await getDocs(query(collection(db, "consultas"), orderBy("creadoEn", "desc"))); const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#resumen-consultas").textContent = `${lista.length} consultas · ${lista.filter(c => !c.leida).length} sin leer`;
    $("#lista-consultas").innerHTML = lista.length ? lista.map(c => `<article class="order-card"><span class="badge">${c.leida ? "Leída" : "Nueva"}</span><h3>${esc(c.nombre)}</h3><p>${esc(MOTIVOS[c.motivo] || c.motivo)} · Tel. ${esc(c.telefono)}${c.correo ? " · " + esc(c.correo) : ""}</p><p>${esc(c.mensaje)}</p><p class="muted">${[c.sucursal, c.fecha, c.hora, c.cantidad ? c.cantidad + " uds." : ""].filter(Boolean).map(esc).join(" · ")}</p><div class="actions"><button class="btn-secondary" data-leida="${esc(c.id)}" data-valor="${c.leida ? "0" : "1"}">${c.leida ? "Marcar como nueva" : "Marcar como leída"}</button><button class="btn-secondary" data-borrar-consulta="${esc(c.id)}">Eliminar</button></div></article>`).join("") : '<p class="empty">No hay consultas.</p>';
}
$("#lista-consultas").addEventListener("click", async e => {
    const leida = e.target.dataset.leida, borrar = e.target.dataset.borrarConsulta;
    try {
        if (leida) { await updateDoc(doc(db, "consultas", leida), { leida: e.target.dataset.valor === "1" }); await cargarConsultas(); }
        if (borrar && confirm("¿Eliminar esta consulta?")) { await deleteDoc(doc(db, "consultas", borrar)); await cargarConsultas(); }
    } catch (err) { alert("No se pudo actualizar la consulta. Revisá las reglas."); }
});
try { await cargarProductos(); await cargarPedidos(); } catch (e) { say("Error al cargar información. Confirmá que este usuario tenga rol admin.", true); }
try { await cargarConsultas(); } catch (e) { $("#resumen-consultas").textContent = "No se pudieron cargar las consultas."; }