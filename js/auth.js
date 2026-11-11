import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, deleteUser } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const formLogin = document.querySelector("#form-login");
const formRegistro = document.querySelector("#form-registro");
const mensaje = document.querySelector("#mensaje");
const say = (txt, error=false) => { if(mensaje){mensaje.textContent=txt; mensaje.dataset.tipo=error?"error":"ok";} };
const pausa = ms => new Promise(r => setTimeout(r, ms));

// Nombre válido para las reglas (2 a 60 caracteres)
const nombreValido = (nombre, email) => {
  const base = (nombre || (email || "").split("@")[0] || "").trim().slice(0, 60);
  return base.length >= 2 ? base : "Cliente";
};

// Guarda el perfil en Firestore con un reintento. El rol SIEMPRE es "cliente":
// nunca se acepta un rol desde el formulario (las reglas también lo exigen).
async function guardarPerfil(user, nombre) {
  const datos = { nombre: nombreValido(nombre, user.email), email: user.email, rol: "cliente", creadoEn: serverTimestamp() };
  let ultimoError;
  for (let intento = 0; intento < 2; intento++) {
    try { await setDoc(doc(db, "usuarios", user.uid), datos); return datos; }
    catch (err) { ultimoError = err; await pausa(500); }
  }
  throw ultimoError;
}

// Devuelve el perfil; si no existe (registro anterior incompleto) lo crea como cliente.
async function obtenerOCrearPerfil(user) {
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  if (snap.exists()) return snap.data();
  try { return await guardarPerfil(user, user.displayName); }
  catch { return { rol: "cliente" }; } // no bloquea el acceso; session.js también lo trata como cliente
}

if (formRegistro) {
  formRegistro.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = formRegistro.nombre.value.trim();
    const email = formRegistro.email.value.trim();
    const password = formRegistro.password.value;
    if (nombre.length < 2 || nombre.length > 60) return say("El nombre debe tener entre 2 y 60 caracteres.", true);
    if (password.length < 8) return say("La contraseña debe tener al menos 8 caracteres.", true);
    const btn = formRegistro.querySelector("button[type=submit]");
    btn.disabled = true; say("Creando cuenta…");
    let cred = null;
    try {
      cred = await createUserWithEmailAndPassword(auth,email,password);
      try { await updateProfile(cred.user,{displayName:nombre}); } catch { /* el nombre también queda en Firestore */ }
      await guardarPerfil(cred.user, nombre);
      location.href = "pages/pedidos.html";
    } catch(err) {
      if (cred) {
        // La cuenta se creó en Authentication pero falló el perfil en Firestore: se deshace para no dejarla incompleta.
        try { await deleteUser(cred.user); say("No pudimos completar el registro y no se creó la cuenta. Intentá de nuevo en unos minutos.", true); }
        catch { say("Tu cuenta se creó pero falta completar el perfil. Iniciá sesión y se completará automáticamente.", true); }
      } else say(errorText(err),true);
    }
    finally { btn.disabled=false; }
  });
}
if (formLogin) {
  formLogin.addEventListener("submit", async e => {
    e.preventDefault();
    const btn=formLogin.querySelector("button[type=submit]");
    btn.disabled=true; say("Ingresando…");
    try {
      await signInWithEmailAndPassword(auth,formLogin.email.value.trim(),formLogin.password.value);
      const perfil = await obtenerOCrearPerfil(auth.currentUser);
      location.href = perfil.rol==="admin" ? "pages/admin.html" : "pages/pedidos.html";
    } catch(err){say(errorText(err),true);}
    finally{btn.disabled=false;}
  });
}
function errorText(err){
 const map={"auth/invalid-credential":"Correo o contraseña incorrectos.","auth/email-already-in-use":"Ese correo ya está registrado.","auth/invalid-email":"El correo no es válido.","auth/weak-password":"La contraseña es demasiado débil.","auth/too-many-requests":"Demasiados intentos. Probá más tarde.","permission-denied":"No tenés permisos para realizar esta acción.","auth/network-request-failed":"Sin conexión. Revisá tu internet."};
 return map[err.code] || "Ocurrió un error. Revisá tu conexión y la configuración de Firebase.";
}
export { say, errorText };