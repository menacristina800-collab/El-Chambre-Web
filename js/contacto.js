// contacto.html: guarda la consulta en Firestore (colección "consultas").
// Cualquier visitante puede enviarla; solo el administrador puede leerla (ver firestore.rules).
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const form = document.querySelector("#form-contacto");
const estado = document.querySelector("#mensaje-contacto");
const RE_TEL = /^[267]\d{3}-?\d{4}$/;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOTIVOS = ["pedido", "evento", "panetones", "tarta", "consulta"];

const mostrar = (texto, tipo) => { estado.textContent = texto; estado.dataset.tipo = tipo; estado.hidden = false; };
const limpiar = () => { estado.hidden = true; form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid")); };

function leer() {
  const v = (n) => (form.elements[n]?.value ?? "").trim();
  const cantidad = v("cantidad");
  return {
    nombre: v("nombre"), telefono: v("telefono"), correo: v("correo"), motivo: v("motivo"),
    fecha: v("fecha"), hora: v("hora"), cantidad: cantidad === "" ? null : Number(cantidad),
    sucursal: form.elements.sucursal.value || "", mensaje: v("mensaje"), acepto: form.elements.acepto.checked
  };
}

// Devuelve { campo: mensaje }. Debe ser igual de estricta que las reglas de Firestore.
function validar(d, ahora = new Date()) {
  const e = {};
  if (d.nombre.length < 3 || d.nombre.length > 60) e.nombre = "El nombre debe tener entre 3 y 60 caracteres.";
  if (!RE_TEL.test(d.telefono)) e.telefono = "El teléfono debe tener 8 dígitos y empezar con 2, 6 o 7.";
  if (d.correo && (!RE_MAIL.test(d.correo) || d.correo.length > 100)) e.correo = "El correo no tiene un formato válido.";
  if (!MOTIVOS.includes(d.motivo)) e.motivo = "Elegí un motivo.";
  if (d.cantidad !== null && (!Number.isInteger(d.cantidad) || d.cantidad < 1 || d.cantidad > 300)) e.cantidad = "La cantidad debe ser un número entero entre 1 y 300.";
  if (!d.sucursal) e.sucursal = "Elegí la sucursal donde recogés.";
  if (d.fecha) {
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const f = new Date(d.fecha + "T00:00:00");
    if (Number.isNaN(f.getTime())) e.fecha = "La fecha no es válida.";
    else if (f < hoy) e.fecha = "La fecha de entrega no puede estar en el pasado.";
    else if (f.getDay() === 0) e.fecha = "Los domingos no abrimos.";
  }
  if (d.hora) {
    const sabado = d.fecha && new Date(d.fecha + "T00:00:00").getDay() === 6;
    if (d.hora < "06:00" || d.hora > "19:00") e.hora = "Atendemos de 6:00 am a 7:00 pm.";
    else if (sabado && (d.hora < "07:00" || d.hora > "17:00")) e.hora = "Los sábados atendemos de 7:00 am a 5:00 pm.";
  }
  if (d.mensaje.length < 10 || d.mensaje.length > 500) e.mensaje = "El mensaje debe tener entre 10 y 500 caracteres.";
  if (!d.acepto) e.acepto = "Necesitamos tu autorización para contactarte.";
  return e;
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  limpiar();
  const datos = leer();
  const errores = validar(datos);
  const campos = Object.keys(errores);
  if (campos.length) {
    campos.forEach((c) => form.querySelectorAll(`[name="${c}"]`).forEach((el) => el.setAttribute("aria-invalid", "true")));
    mostrar(Object.values(errores).join(" "), "error");
    form.querySelector(`[name="${campos[0]}"]`)?.focus();
    return;
  }
  const boton = form.querySelector("button[type=submit]");
  const textoOriginal = boton.textContent;
  boton.disabled = true; boton.textContent = "Enviando…"; mostrar("Enviando tu mensaje…", "info");
  try {
    const { acepto, ...guardar } = datos;
    await addDoc(collection(db, "consultas"), { ...guardar, leida: false, creadoEn: serverTimestamp() });
    location.href = "gracias.html";
  } catch (err) {
    const sinPermiso = err?.code === "permission-denied";
    mostrar(sinPermiso ? "No se pudo enviar: el servidor rechazó el mensaje. Revisá los datos e intentá de nuevo."
                       : "No se pudo enviar tu mensaje. Revisá tu conexión e intentá de nuevo, o escribinos por WhatsApp.", "error");
    boton.disabled = false; boton.textContent = textoOriginal;
  }
});

form.addEventListener("reset", () => setTimeout(limpiar, 0));

export { validar };