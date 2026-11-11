// Escapa texto antes de insertarlo con innerHTML.
// Evita que un nombre, nota o producto con etiquetas HTML ejecute código (XSS).
export const esc = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));