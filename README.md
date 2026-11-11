# El Chambre — Desafío Práctico II

Aplicación de panadería construida con HTML5, CSS3 y JavaScript nativo (módulos ES). Firebase proporciona autenticación, base de datos remota y hosting.

## Procesos
1. Registro/inicio/cierre de sesión.
2. Clientes crean pedidos y consultan su propio historial. Cualquier visitante puede enviar una consulta desde `contacto.html`; el admin las ve, marca como leídas o elimina en el panel.
3. Administradores gestionan productos (crear, consultar, editar, desactivar y eliminar) y actualizan el estado de los pedidos.

## Roles
- `cliente`: puede crear pedidos y leer únicamente sus propios pedidos.
- `admin`: administra catálogo y consulta/actualiza todos los pedidos.

**No existe selector de rol en el registro.** Toda cuenta nueva se crea como `cliente`. Para designar administradores, se debe modificar manualmente el documento del usuario desde Firebase Console, después de verificar su identidad.

## Configuración local
1. Crear un proyecto en https://console.firebase.google.com/.
2. Agregar una aplicación web y copiar la configuración del SDK.
3. Pegar los valores en `js/firebase-config.js`.
4. En Authentication > Sign-in method, habilitar Email/Password.
5. Crear Firestore Database.
6. Publicar las reglas de `firestore.rules` (Firestore > Rules).
7. Abrir la carpeta en VS Code y ejecutar con Live Server (no abrir los HTML con `file://`).
8. Entrar a `registro.html` y crear la cuenta que será cliente.
9. Para promover una cuenta a admin: Firestore > `usuarios` > documento cuyo ID sea el UID de Authentication > cambiar `rol` de `cliente` a `admin`. Nunca habilitar que el usuario elija su rol en el formulario.
10. Iniciar sesión con esa cuenta y abrir `pages/admin.html`.
11. En `pages/admin.html` tocar **Cargar catálogo inicial** (lee `firebase/productos-iniciales.json` y crea 10 productos; no duplica si ya hay productos). Luego se pueden crear, editar, desactivar y eliminar más.

## Publicación
- Proyecto de Firebase: `chambre-web` (ya indicado en `.firebaserc`).
- Instalar Firebase CLI: `npm install -g firebase-tools`
- Iniciar sesión: `firebase login`
- Publicar reglas y hosting: `firebase deploy`
- La URL será la que muestre Firebase CLI, normalmente `https://PROJECT_ID.web.app`.

## Estructura relevante
- `js/firebase-config.js`: configuración pública del SDK (reemplazar marcadores).
- `js/firebase.js`: inicializa Firebase.
- `js/auth.js`: registro e inicio de sesión.
- `js/session.js`: protección de páginas y cierre de sesión.
- `js/utils.js`: `esc()`, escape de HTML.
- `js/contacto.js`: formulario de contacto; guarda las consultas en Firestore (`consultas`).
- `js/pedidos.js`: alta y consulta de pedidos del cliente.
- `js/admin.js`: CRUD de productos y actualización de estados.
- `firestore.rules`: autorización real en Firestore.
- `pages/pedidos.html`: portal del cliente.
- `pages/admin.html`: panel administrativo.

## Seguridad y notas
- La configuración web de Firebase identifica el proyecto; no es una contraseña. La seguridad real está en Authentication y Firestore Rules.
- No colocar claves privadas, service accounts ni secretos en JavaScript.
- El primer admin se asigna desde Firebase Console. La interfaz por sí sola no concede privilegios.
- Si el registro crea la cuenta pero falla al guardar el perfil, `auth.js` reintenta y, si sigue fallando, borra la cuenta recién creada; si un usuario antiguo no tiene perfil, se crea como cliente al iniciar sesión.
- No hay `package.json`: el sitio carga Firebase 10.14.1 desde la CDN de Google (módulos ES nativos), sin npm ni bundler.
- Las reglas impiden que un cliente cree su perfil como admin y limitan la lectura de pedidos a su propietario.
- El navegador calcula el total solo para mostrarlo; las reglas de Firestore lo vuelven a verificar contra el precio real del producto (activo, mismo precio y total = precio × cantidad), así que un cliente no puede guardar un importe inventado. No se usa backend propio, según las condiciones del desafío.
- Todo dato que viene de Firestore y se pinta con `innerHTML` pasa por `esc()` (`js/utils.js`) para evitar inyección de HTML/JS (XSS).
- Las cuentas de prueba (cliente y admin) se entregan por Moodle; no se publican contraseñas en el repositorio.
- Los productos con precio “Precio en tienda” del menú original se omiten del pedido en línea hasta definirles precio.

## Datos iniciales
Se cargan con el botón **Cargar catálogo inicial** del panel de administración (fuente: `firebase/productos-iniciales.json`). Cada producto tiene `nombre`, `precio`, `categoria`, `descripcion` y `activo`.

## Prueba rápida
- Crear cliente A y cliente B.
- Crear un pedido con A y verificar que B no pueda leerlo.
- Crear/promover un admin y verificar que ve todos los pedidos.
- Como admin, crear/editar/desactivar/eliminar un producto.
- Cambiar estados de pedidos y comprobar que el cliente ve el nuevo estado.
- Probar formularios vacíos, cantidad fuera de rango y fechas pasadas.

## Importante
La integración no queda activa hasta reemplazar la configuración de Firebase, crear Firestore, publicar las reglas y cargar los datos iniciales. El sitio original se conserva; se agregan las pantallas de cuenta y gestión.
