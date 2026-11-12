import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Las páginas protegidas arrancan ocultas (ver <style> en su <head>) y solo se muestran
// cuando la sesión y el rol ya fueron verificados. Así nadie ve contenido sin iniciar sesión.
const mostrarPagina = () => { document.body.style.visibility = "visible"; };
// replace() reemplaza la entrada del historial: el botón "Atrás" ya no vuelve a una página protegida.
const irA = (url) => location.replace(url);

// Si el navegador restaura la página desde su caché al volver atrás (por ejemplo, después de
// cerrar sesión), se recarga para que se vuelva a comprobar la sesión.
window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });

export function requireUser({ admin = false } = {}) {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub(); // solo interesa el estado inicial; evita redirecciones dobles al cerrar sesión
      if (!user) { irA("../login.html"); return; }
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const profile = snap.exists() ? snap.data() : { rol: "cliente", nombre: user.displayName || user.email };
        if (admin && profile.rol !== "admin") { alert("Esta sección es exclusiva para administración."); irA("pedidos.html"); return; }
        if (profile.rol !== "admin") document.querySelectorAll('a[href$="admin.html"]').forEach(a => a.remove());
        const name = document.querySelector("[data-user-name]");
        if (name) name.textContent = profile.nombre || user.email;
        const logout = document.querySelector("[data-logout]");
        if (logout) logout.addEventListener("click", async () => { await signOut(auth); irA("../index.html"); });
        mostrarPagina();
        resolve({ user, profile });
      } catch (e) { alert("No se pudo validar tu acceso. Revisá las reglas de Firestore."); irA("../login.html"); }
    });
  });
}