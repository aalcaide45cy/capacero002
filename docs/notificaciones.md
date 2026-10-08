# Arquitectura de Notificaciones Push y Web Push — Capa Cero 3D

## 1. Resumen del Sistema

Capa Cero 3D cuenta con una infraestructura de notificaciones Web Push propia (100% self-hosted), sin intermediarios como OneSignal ni servicios de pago de terceros. 

Las notificaciones se entregan directamente a través de los servidores oficiales de push de los fabricantes (Google FCM para Android y navegadores Chromium, Apple APNs para Safari en iOS/macOS, y Mozilla autopush para Firefox), firmadas criptográficamente con el protocolo estándar **VAPID (Voluntary Application Server Identification)** según las especificaciones RFC 8292 y RFC 8291.

---

## 2. Componentes del Sistema

### A. Cliente Web y Service Worker (`public/sw.js`, `src/utils/pushManager.js`)
1. **Suscripción en Cliente**:
   - El cliente comprueba compatibilidad con `PushManager` y `Notification`.
   - Convierte la clave pública VAPID (`VAPID_PUBLIC_KEY`) de base64 URL-safe a `Uint8Array`.
   - Llama a `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
   - Envía el objeto de suscripción (`endpoint`, claves criptográficas `p256dh` y `auth`, geolocalización estimada por IP y datos del dispositivo) a Google Apps Script (`action=push_subscription`).

2. **Recepción en Segundo Plano (`public/sw.js`)**:
   - El evento `push` recibe la señal de activación.
   - Si el paquete incluye payload JSON cifrado, lo procesa directamente; si es un ping de sincronización, consulta de inmediato el endpoint `?action=latest_notification` en Google Apps Script.
   - Construye y muestra la notificación en el sistema operativo mediante `self.registration.showNotification` con vibración, icono oficial de Capa Cero y enlace de destino.

3. **Interacción del Usuario (`notificationclick`)**:
   - Cierra la notificación activa en el sistema.
   - Si la aplicación web ya está abierta en una pestaña, la enfoca y navega al destino (`/video/<slug>`).
   - Si no está abierta, abre una nueva ventana con el destino.

---

### B. Backend en Google Apps Script (`google-sheet-scripts/Codigo.txt`)
El backend centraliza la base de datos de dispositivos y la lógica de envío de mensajes.

1. **Estructura de Base de Datos (Hojas de Cálculo)**:
   - **`Suscripciones_Push`**:
     - Columnas: `Timestamp`, `ID_Sesion`, `Endpoint`, `Clave_p256dh`, `Clave_auth`, `Pais`, `Codigo_Pais`, `Bandera`, `Region`, `Dispositivo`, `Sistema_Operativo`, `Navegador`, `PWA_Instalada`, `Estado` (`ACTIVO` o `CADUCADA`).
   - **`Historial_Notificaciones`**:
     - Registra cada envío: `Fecha`, `Título`, `Mensaje`, `URL_Destino`, `Móviles_Enviados`, `PCs_Enviados`, `Total_Enviados`, `Caducados_Detectados`.

2. **Criptografía VAPID (Curva Elíptica P-256 / ES256)**:
   - Implementa operaciones en curva elíptica con aritmética de enteros gigantes (`BigInt`) para compatibilidad estricta con el motor V8 de Apps Script.
   - Genera el token JWT firmado con la clave privada `VAPID_PRIVATE_KEY` (almacenada de forma segura en `ScriptProperties`).
   - Extrae el dominio de destino (`audience`) del endpoint del navegador y firma la cabecera `Authorization: vapid t=<jwt>, k=<VAPID_PUBLIC_KEY>`.

3. **Despacho Masivo (`procesarEnvioPushDesdeModal`)**:
   - Guarda los datos del aviso en la propiedad `latest_notification`.
   - Itera por todas las suscripciones activas en `Suscripciones_Push`.
   - Realiza la petición HTTP POST directa con `UrlFetchApp.fetch(endpoint, options)` hacia los servidores de Google, Apple o Mozilla.
   - Si el endpoint responde con un error HTTP 410 (Gone) o 404 (Not Found), marca automáticamente el dispositivo como `CADUCADA` en la hoja para no reintentar envíos inútiles.

---

## 3. Formas de Envío

### A. Envío Manual desde Google Sheets
En el menú superior de la hoja de cálculo:
`🎥 Capa Cero > 📲 Enviar Notificación Push (PWA/Web)`
Se abre un diálogo modal donde el editor introduce el título, el mensaje y el enlace. Al pulsar enviar, se despacha a todos los suscriptores activos en tiempo real.

### B. Envío Automático por Vídeo Nuevo (`notify_new_video`)
A partir de la **Fase 09**:
- El workflow de sincronización (`scripts/update-videos.js`) detecta la publicación de un vídeo nuevo (no programado).
- Comprueba si el ID del vídeo ya fue notificado en `src/data/notified.json`.
- Si es nuevo, llama al endpoint de Google Apps Script con la acción `notify_new_video` protegida mediante `token=STATS_API_TOKEN`:
  - Título: `Nuevo vídeo: <Título del vídeo>`
  - Mensaje: `Ya disponible en Capa Cero 3D. Pulsa para ver el tutorial.`
  - Enlace: `https://www.capacero3d.com/video/<slug>`
- Añade el ID a `src/data/notified.json` y realiza commit para no duplicar avisos.

---

## 4. Particularidades por Plataforma

1. **Escritorio (Windows, Mac, Linux)**:
   - Compatible directamente en Chrome, Edge, Firefox y Opera.
   - No requiere instalar la PWA; basta con otorgar permiso de notificaciones en el navegador.

2. **Android**:
   - Compatible al 100% tanto desde el navegador Chrome como con la PWA instalada en pantalla de inicio.

3. **iOS (iPhone e iPad)**:
   - Política estricta de Apple WebKit (iOS 16.4+): Apple exige que la aplicación esté añadida a la pantalla de inicio ("Añadir a pantalla de inicio" desde el menú Compartir de Safari) para poder activar el permiso de Web Push.
   - La aplicación detecta si el usuario está en iOS y muestra la guía interactiva paso a paso en caso necesario.
