import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function requireUser({ admin = false } = {}) {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub(); // solo interesa el estado inicial; evita redirecciones dobles al cerrar sesión
      if (!user) { location.href = "../login.html"; return; }
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const profile = snap.exists() ? snap.data() : { rol: "cliente", nombre: user.displayName || user.email };
        if (admin && profile.rol !== "admin") { alert("Esta sección es exclusiva para administración."); location.href = "pedidos.html"; return; }
        if (profile.rol !== "admin") document.querySelectorAll('a[href$="admin.html"]').forEach(a => a.remove());
        const name = document.querySelector("[data-user-name]");
        if (name) name.textContent = profile.nombre || user.email;
        const logout = document.querySelector("[data-logout]");
        if (logout) logout.addEventListener("click", async () => { await signOut(auth); location.href = "../index.html"; });
        resolve({ user, profile });
      } catch (e) { alert("No se pudo validar tu acceso. Revisá las reglas de Firestore."); location.href = "../login.html"; }
    });
  });
}