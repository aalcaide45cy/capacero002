# 🎬 Capa Cero 3D — Plataforma Web y Videoteca Oficial

> Portal web oficial, videoteca de recursos y centro de aprendizaje de impresión 3D del canal [Capa Cero 3D](https://www.capacero3d.com).

---

## 🏗️ Arquitectura del Proyecto

La plataforma combina la velocidad y seguridad de un sitio estático (**SSG - Static Site Generation**) con la agilidad de un **CMS No-Code basado en Google Sheets**, enriquecido dinámicamente mediante APIs oficiales de Google y funciones serverless.

```text
Google Sheets (CMS) ──┐
YouTube Data API v3 ──┼─► scripts/update-videos.js ──► src/data/videos_v4.json ──┐
Category Map Rules  ──┘                                                          │
                                                                                 ▼
Vite Build ──► scripts/prerender-videos.js ──► dist/video/<slug>/index.html ──► Vercel CDN
                                                                                 ▲
Google Apps Script (Web Push & Telemetría) ◄── api/youtube-analytics.js (OAuth) ─┘
```

### 1. Frontend & UI
- **React 18** + **Vite 7** + **Tailwind CSS**.
- **V4Hub**: Videoteca interactiva con buscador tolerante a fallos técnicos y tildes, filtros por temática, visualización de duraciones reales y reproductor optimizado mediante patrón *facade* (carga bajo demanda de la IFrame Player API de YouTube sin bloquear el renderizado inicial).
- **V4NotificationBell**: Sistema discreto de activación de notificaciones Web Push para Escritorio y Android sin obligar a instalar la PWA (con guía nativa para Safari en iOS).
- **AnalyticsDashboard (`/estadisticas`)**: Panel de métricas con acceso protegido. Muestra telemetría en tiempo real, generador de ideas de vídeo a partir de búsquedas de usuarios, monitorización de Web Push y el panel "Camino a 4.000 horas" conectado a YouTube Analytics API.

### 2. Páginas Indexables por Vídeo (SSG)
- Cada tutorial cuenta con su propia URL permanente: `/video/:slug` (ej. `/video/textos-y-modificadores-en-bambustudio-todo-lo-que-necesitas-saber-15`).
- Generadas en fase de compilación mediante `scripts/prerender-videos.js`.
- Incluyen marcado estructurado `VideoObject` (Schema.org), etiquetas Open Graph y Twitter Cards completas, y enlace canónico para indexación óptima en Google y Google Video Search.

### 3. Sincronización & Scripts Build-time
- **`scripts/update-videos.js`**: Descarga la hoja de Google Sheets, consulta por lotes a la **YouTube Data API v3** para obtener vistas, likes, comentarios, duraciones exactas y detección de estrenos, normaliza categorías según `src/data/category-map.json`, y dispara notificaciones push para nuevos lanzamientos controlados por `src/data/notified.json`.
- **`scripts/update-seo-sitemap.js`**: Genera un `sitemap.xml` enriquecido con la extensión `<video:video>` para cada publicación.
- **`scripts/prerender-videos.js`**: Prerenderiza los HTML estáticos de cada vídeo en `dist/video/<slug>/index.html`.
- **`scripts/get-youtube-refresh-token.js`**: Utilidad interactiva CLI para generar el refresh token de OAuth 2.0 requerido por YouTube Analytics.

### 4. Funciones Serverless (Vercel)
- **`api/youtube-analytics.js`**: Endpoint serverless que renueva tokens OAuth 2.0 para consultar en tiempo real las horas de visualización hacia la monetización (últimos 365 días, caducidad en 30 días, ritmo diario).
- **`api/subscribe.js`**: Captación segura con validación honeypot antispam.

---

## 🗺️ Rutas Principales

| Ruta | Descripción | Indexable |
| :--- | :--- | :---: |
| `/` | Portada y Videoteca principal (V4Hub) con todos los recursos | Sí |
| `/video/:slug` | Página estática dedicada para cada tutorial y sus descargas | Sí |
| `/estadisticas` | Panel privado de analíticas y Camino a 4.000 horas | No (`noindex`) |
| `/privacidad-cookies` | Política de privacidad y panel de preferencias de cookies | Sí |
| `/sitemap.xml` | Mapa del sitio con extensión de vídeo XML para buscadores | Sí |

---

## 🔐 Variables de Entorno

Configura estas variables en tu entorno local (`.env.local`) y en el panel de **Vercel** o **GitHub Secrets**:

| Variable | Dónde se usa | Propósito |
| :--- | :--- | :--- |
| `YOUTUBE_API_KEY` | GitHub Actions / Build | Clave de YouTube Data API v3 para extraer estadísticas y duraciones |
| `STATS_API_TOKEN` | Vercel / Apps Script / Web | Token secreto para autenticar el panel `/estadisticas` y peticiones |
| `SHEETS_DB_URL` | Build / Cliente | URL del despliegue Web App de Google Apps Script |
| `VAPID_PUBLIC_KEY` | Cliente Web (`.env.local`) | Clave pública VAPID para suscripción al servicio Web Push en el navegador |
| `VAPID_PRIVATE_KEY` | Google Apps Script | Clave privada VAPID para firmar el envío de notificaciones push |
| `VAPID_SUBJECT` | Google Apps Script | Correo de contacto administrativo para el protocolo Web Push |
| `YOUTUBE_CLIENT_ID` | Vercel Serverless | Client ID de Google Cloud OAuth 2.0 para YouTube Analytics |
| `YOUTUBE_CLIENT_SECRET` | Vercel Serverless | Client Secret de Google Cloud OAuth 2.0 para YouTube Analytics |
| `YOUTUBE_REFRESH_TOKEN` | Vercel Serverless | Refresh Token permanente para consultar YouTube Analytics API |
| `GA_MEASUREMENT_ID` | Cliente Web | Identificador de flujo de Google Analytics 4 (`G-XXXXXXXXXX`) |

---

## 🚀 Guía: Cómo Publicar un Nuevo Vídeo

Para publicar un nuevo vídeo en la web no es necesario tocar el código fuente:

1. **Sube el vídeo a YouTube** como lo haces habitualmente.
2. **Abre la hoja de cálculo de Google Sheets** de Capa Cero y añade una nueva fila con:
   - `Titulo`: Título del vídeo (incluyendo número de capítulo `#XX` si pertenece a un curso).
   - `URL_Youtube`: Enlace completo del vídeo de YouTube.
   - `Categoria`: Ej. `Curso BambuStudio`, `Modelado 3D`, `Perfiles y Calibración`, etc. (Los vídeos con *"Fusion 360"* en el título se mapean automáticamente a la categoría `Fusion 360`).
   - `Descripcion`: Resumen técnico del tutorial.
   - `Consejo_Clave`: Tip destacado para la tarjeta del vídeo.
   - `Enlace_Descarga`: (Opcional) Enlace a MakerWorld, Drive, Printables o plantilla.
   - `Destacado`: `SI` o `NO` para fijarlo en la cabecera.
3. **Publicación automática:**
   - La acción programada de GitHub Actions (`update-youtube-stats.yml`) corre cada 6 horas.
   - Detecta la nueva fila, consulta las duraciones y estadísticas en YouTube, genera la página `/video/<slug>`, actualiza el `sitemap.xml`, notifica vía Web Push a los suscriptores y despliega la web en Vercel.
4. **Publicación inmediata (manual):**
   - Ve a la pestaña **Actions** en el repositorio de GitHub y pulsa **Run workflow** en "Actualizar Estadísticas de YouTube".
   - O bien, desde tu entorno local, ejecuta:
     ```bash
     npm run build
     ```
     y realiza `git push` a la rama principal.

---

## 💻 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Sincronizar datos y vídeos desde Google Sheets y YouTube
npm run update-data

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Compilar para producción (actualiza datos, SEO y genera páginas estáticas)
npm run build

# 5. Previsualizar la compilación de producción
npm run preview
```
