# Llamadas rápidas (`/qpush`)

Función oculta, aditiva y de uso personal: desde Chrome (clic derecho) se envía un teléfono, un enlace o un texto y el iPhone recibe un push. Si es un teléfono, al tocarlo se abre la PWA con un botón grande «Llamar» (`tel:`); la app guarda además la lista de lo enviado.

**Vinculación por QR:** la extensión muestra un QR y la app del iPhone lo escanea; no hay que escribir ningún token. Cada extensión tiene su propia clave y solo envía a los iPhone que ha vinculado.

## Piezas
| Pieza | Dónde |
|---|---|
| PWA, manifest, service worker, iconos y API | `api/_lib/qpush/` (se sirve desde `api/admin.js`, ruta `p=qpush`, para no superar el límite de funciones de Vercel) |
| Reglas de ruta | `vercel.json` (solo `/qpush` y `/qpush/*`) |
| Tablas nuevas | `db/migrations/008_quick_calls.sql` y `009_quick_calls_links.sql` (`call_subscriptions`, `call_history`, `call_links`, `call_link_codes`, `call_hits`) |
| Extensión de Chrome | `chrome-extension/` |
| Tests | `tests/qpush.test.js` (`npm test`) |

No se modifica ninguna tabla, ruta ni herramienta existente. La ruta no está en menús, ni en `sitemap.xml`, ni en `robots.txt`; se sirve con `noindex` (cabecera `X-Robots-Tag` y meta).

## Variables de entorno (Vercel → Project → Settings → Environment Variables)
| Variable | Qué es |
|---|---|
| `CALL_API_TOKEN` | **Opcional.** Token de administrador: permite enviar a todos los iPhone vinculados (p. ej. con `curl`). Para el uso normal no hace falta. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Ya existen en el proyecto (las usan las notificaciones del panel) y se reutilizan. Si no existieran: `npx web-push generate-vapid-keys`. |
| `BASE_PATH` | Ruta de montaje. Por defecto `/qpush`. |
| `CALL_SLUG` | Alternativa a `BASE_PATH`: si no hay `BASE_PATH`, la ruta es `/<CALL_SLUG>`. |
| `CALL_EXTENSION_ID` | Opcional: id de la extensión; si se define, CORS solo admite ese id. |

Después de añadir o cambiar variables hay que volver a desplegar. Los secretos nunca están en el código.

## Cambiar la ruta (raíz o subcarpeta)
`BASE_PATH` se usa para todo: página, API, manifest (`id`, `start_url`, `scope` con `/` final), service worker (`<BASE>/sw.js`, scope `<BASE>/`, cabecera `Service-Worker-Allowed`), iconos y enlaces. Como `vercel.json` es estático, la ruta se fija también ahí con:

```
npm run qpush:base -- /otra-ruta     # subcarpeta
npm run qpush:base -- /              # raíz (solo en un despliegue propio: tapa el resto del sitio)
```
Luego pon `BASE_PATH` con el mismo valor en Vercel, redespliega, y en la extensión cambia la URL base. Si `BASE_PATH` y `vercel.json` no coinciden, la API responde un error de configuración explícito. Hay que reinstalar la PWA en el iPhone si cambia la ruta.

## API (`{BASE_PATH}/api/call/...`)
- `POST link/start` — sin autenticación (límite 10/hora por IP). La extensión recibe `{ key, code, url, qr }`: su clave propia (solo se guarda el hash) y un código de un solo uso (10 min) con su QR en SVG.
- `POST link/code` (Bearer clave) — nuevo QR para vincular otro iPhone. `GET link/status` (Bearer clave) — nº de iPhone vinculados.
- `POST link/claim` — el iPhone envía `{ code, endpoint, p256dh, auth }`; el código se consume y el iPhone queda asociado a esa extensión. Devuelve la clave del dispositivo.
- `POST send` — `Authorization: Bearer <clave de la extensión>`, cuerpo `{ number | text, raw, source_url }`. Con `number` valida y normaliza (+34 si no hay prefijo). Con `text` clasifica: contiene teléfono → `phone`; URL → `url`; si no, `text`. Envía el push solo a los iPhone de esa extensión.
- `GET history` / `POST delete` — con `X-Device-Key` (el iPhone ve y borra lo de su extensión).
- `subscribe` (Bearer `CALL_API_TOKEN`) y `ping`: uso administrativo opcional.
- CORS solo para `chrome-extension://<id>` (Authorization y Content-Type, preflight `OPTIONS`).
- Límites: 10 intentos fallidos por 15 min y por IP → 429; 30 envíos por minuto → 429. Las claves no se registran en logs.
- Se guardan solo las suscripciones push, las claves (hash) y los últimos 20 envíos por extensión.

## Guía de pruebas manuales
1. **Despliegue**: abre `https://capacero3d.com/qpush/`, `…/manifest.webmanifest` (Content-Type `application/manifest+json`) y `…/sw.js` (`text/javascript`, `Service-Worker-Allowed`).
2. **Instalar la PWA en el iPhone (iOS 16.4+)**: en Safari abre `https://capacero3d.com/qpush/` → Compartir → **Añadir a pantalla de inicio** → abre la app desde el icono (las notificaciones solo funcionan con la app instalada).
3. **Raíz y subcarpeta**: la ruta por defecto es `/qpush`. Para probar otra: `npm run qpush:base -- /prueba`, `BASE_PATH=/prueba` en Vercel, redespliega e instala de nuevo; el manifest debe tener `scope: "/prueba/"`. Vuelve a `/qpush` al terminar.
4. **Extensión**: descarga el ZIP desde la página, cárgalo en `chrome://extensions` (modo desarrollador) y en sus Opciones pulsa **Vincular iPhone**.
5. **Vincular**: en la app del iPhone pulsa **Escanear QR** (acepta notificaciones y cámara) y apunta al QR de Chrome. Las Opciones muestran «✓ iPhone vinculado». Alternativa sin cámara: escribir el código de 8 letras.
6. **Push**: botón **Enviar prueba** en las Opciones; después, selecciona un teléfono (p. ej. `600 11 22 33`) → clic derecho → *Llamar con iPhone*. Toca la notificación: se abre la app con el botón **Llamar**.
7. **Extensión con distintos datos**: (a) un teléfono seleccionado, (b) un enlace `tel:`, (c) texto con número con espacios/guiones/paréntesis, (d) un enlace normal, (e) un texto sin número. En la app, los teléfonos tienen «Llamar», los enlaces «Abrir» y el texto se muestra tal cual.
8. **Lista**: botones de borrar por elemento y «Borrar todo».

## Limitaciones de iOS
- Web Push solo funciona con la PWA **instalada** en la pantalla de inicio (iOS 16.4 o superior); en Safari normal no hay push.
- El permiso de notificaciones se debe pedir tras un toque del usuario (el botón lo hace así).
- iOS no permite marcar automáticamente: hace falta un toque en «Llamar». Tocar la notificación abre la app, no inicia la llamada.
- La PWA instalada tiene su propio almacenamiento: hay que vincularla desde la app instalada (con su escáner de QR), no desde Safari. Si escaneas el QR con la cámara nativa del iPhone se abre Safari: abre entonces la app instalada y usa su escáner.
- Si se borra la app o se revoca el permiso, hay que volver a vincular. Los avisos pueden retrasarse con el modo Concentración o ahorro de batería.
- Si la suscripción caduca, el servidor la elimina al primer fallo y se responde `502`; basta con vincular de nuevo.
