import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const formLogin = document.querySelector("#form-login");
const formRegistro = document.querySelector("#form-registro");
const mensaje = document.querySelector("#mensaje");
const say = (txt, error=false) => { if(mensaje){mensaje.textContent=txt; mensaje.dataset.tipo=error?"error":"ok";} };

if (formRegistro) {
  formRegistro.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = formRegistro.nombre.value.trim();
    const email = formRegistro.email.value.trim();
    const password = formRegistro.password.value;
    if (password.length < 8) return say("La contraseña debe tener al menos 8 caracteres.", true);
    const btn = formRegistro.querySelector("button[type=submit]");
    btn.disabled = true; say("Creando cuenta…");
    try {
      const cred = await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(cred.user,{displayName:nombre});
      // El rol siempre se crea como cliente. Nunca se acepta un rol desde el formulario.
      await setDoc(doc(db,"usuarios",cred.user.uid),{nombre,email,rol:"cliente",creadoEn:serverTimestamp()});
      location.href = "pages/pedidos.html";
    } catch(err) { say(errorText(err),true); }
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
      const snap=await getDoc(doc(db,"usuarios",auth.currentUser.uid));
      location.href = snap.exists() && snap.data().rol==="admin" ? "pages/admin.html" : "pages/pedidos.html";
    } catch(err){say(errorText(err),true);}
    finally{btn.disabled=false;}
  });
}
function errorText(err){
 const map={"auth/invalid-credential":"Correo o contraseña incorrectos.","auth/email-already-in-use":"Ese correo ya está registrado.","auth/invalid-email":"El correo no es válido.","auth/weak-password":"La contraseña es demasiado débil.","auth/too-many-requests":"Demasiados intentos. Probá más tarde.","permission-denied":"No tenés permisos para realizar esta acción."};
 return map[err.code] || "Ocurrió un error. Revisá tu conexión y la configuración de Firebase.";
}
export { say, errorText };
