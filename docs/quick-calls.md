# Llamadas rápidas (`/qpush`)

Función oculta, aditiva y de uso personal: desde Chrome se envía un teléfono y el iPhone recibe un push. Al tocarlo se abre una PWA con un botón grande «Llamar» (`tel:`).

## Piezas
| Pieza | Dónde |
|---|---|
| PWA, manifest, service worker, iconos y API | `api/_lib/qpush/` (se sirve desde `api/admin.js`, ruta `p=qpush`, para no superar el límite de funciones de Vercel) |
| Reglas de ruta | `vercel.json` (solo `/qpush` y `/qpush/*`) |
| Tablas nuevas | `db/migrations/008_quick_calls.sql` (`call_subscriptions`, `call_history`, `call_pair_codes`, `call_hits`) |
| Extensión de Chrome | `chrome-extension/` |
| Tests | `tests/qpush.test.js` (`npm test`) |

No se modifica ninguna tabla, ruta ni herramienta existente. La ruta no está en menús, ni en `sitemap.xml`, ni en `robots.txt`; se sirve con `noindex` (cabecera `X-Robots-Tag` y meta).

## Variables de entorno (Vercel → Project → Settings → Environment Variables)
| Variable | Qué es |
|---|---|
| `CALL_API_TOKEN` | Secreto largo que eliges tú. Ejemplo para generarlo: `openssl rand -base64 32`. **Obligatoria.** |
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
- `POST send` — `Authorization: Bearer <CALL_API_TOKEN>`, cuerpo `{ number, raw, source_url }`. Valida y normaliza (+34 si no hay prefijo) y envía el push.
- `POST subscribe` — Bearer con el token **o** `{ code }` de un solo uso (10 min). Devuelve una clave de dispositivo que la PWA usa para ver/borrar el historial.
- `POST pair` (Bearer) genera el código de emparejamiento; `GET ping` (Bearer) prueba la conexión; `GET history` y `POST delete` usan `X-Device-Key`.
- CORS solo para `chrome-extension://<id>` (Authorization y Content-Type, preflight `OPTIONS`).
- Límites: 10 intentos fallidos por 15 min y por IP → 429; 30 envíos por minuto → 429. El token no se registra en logs.
- Se guardan solo las suscripciones push y los últimos 20 números.

## Guía de pruebas manuales
1. **Despliegue**: abre `https://capacero3d.com/qpush/`, `…/manifest.webmanifest` (Content-Type `application/manifest+json`) y `…/sw.js` (`text/javascript`, `Service-Worker-Allowed`).
2. **Instalar la PWA en el iPhone (iOS 16.4+)**: en Safari abre `https://capacero3d.com/qpush/` → Compartir → **Añadir a pantalla de inicio** → abre la app desde el icono (las notificaciones solo funcionan con la app instalada).
3. **Raíz y subcarpeta**: la ruta por defecto es subcarpeta (`/qpush`). Para probar otra, `npm run qpush:base -- /prueba`, `BASE_PATH=/prueba` en Vercel, redespliega e instala de nuevo; comprueba que el manifest tiene `scope: "/prueba/"`. Vuelve a `/qpush` al terminar. (La raíz `/` solo con un despliegue propio.)
4. **Emparejar**: en las opciones de la extensión pulsa *Código de emparejamiento*; en la app del iPhone escríbelo y pulsa **Activar notificaciones** (toque del usuario → permiso de iOS).
5. **Push**: en Chrome selecciona un teléfono (p. ej. `600 11 22 33`) → clic derecho → *Llamar con iPhone*. En el iPhone llega la notificación; al tocarla se abre la app con el botón **Llamar**.
6. **Extensión**: prueba con (a) un teléfono seleccionado, (b) un enlace `tel:` y (c) un texto con número con espacios/guiones/paréntesis; también un texto sin número (debe avisar) y un enlace a una página con teléfono.
7. **Historial**: en la app, botón *Llamar* de cada número y *Borrar* / *Borrar todo*.

## Limitaciones de iOS
- Web Push solo funciona con la PWA **instalada** en la pantalla de inicio (iOS 16.4 o superior); en Safari normal no hay push.
- El permiso de notificaciones se debe pedir tras un toque del usuario (el botón lo hace así).
- iOS no permite marcar automáticamente: hace falta un toque en «Llamar». Tocar la notificación abre la app, no inicia la llamada.
- La PWA instalada tiene su propio almacenamiento: hay que emparejarla desde la app instalada, no desde Safari.
- Si se borra la app o se revoca el permiso, hay que volver a emparejar. Los avisos pueden retrasarse con el modo Concentración o ahorro de batería.
- Si la suscripción caduca, el servidor la elimina al primer fallo y se responde `502`; basta con emparejar de nuevo.
