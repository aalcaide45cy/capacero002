# Capa Cero 3D: web y videoteca

Web oficial del canal [Capa Cero 3D](https://www.capacero3d.com): videoteca, página propia por vídeo y herramientas internas.

## Arquitectura

Sitio estático (React + Vite + Tailwind) desplegado en Vercel, con funciones serverless en `api/` y base de datos Postgres en Neon. No depende de Google Sheets ni de Apps Script.

```text
YouTube (API o RSS) ──► api/cron-sync.js ──► Neon (tabla videos) ──► scripts/update-videos.js ──► src/data/videos_v4.json
                                                                                                      │
Vite build ──► scripts/prerender-videos.js ──► dist/video/<slug>/index.html ──► Vercel ◄──────────────┘
```

- **Vídeos:** `api/cron-sync.js` busca vídeos nuevos del canal y los guarda en Neon. Si hay alguno, lanza un despliegue y encola el aviso push. `scripts/update-videos.js` lee Neon en cada compilación, refresca estadísticas con la YouTube Data API y genera `src/data/videos_v4.json`. Sin acceso a Neon (por ejemplo en la Action de GitHub sin `DATABASE_URL`), parte del último JSON guardado y solo refresca estadísticas.
- **Páginas por vídeo:** `scripts/prerender-videos.js` genera `dist/video/<slug>/index.html` con `VideoObject`, Open Graph y canónica. `scripts/update-seo-sitemap.js` genera el `sitemap.xml`.
- **Base de datos:** estructura en `db/migrations/` (se aplica en el `prebuild`). Más detalle en `db/README.md`.

## Rutas

| Ruta | Qué es | Indexable |
| :--- | :--- | :---: |
| `/` | Portada y videoteca | Sí |
| `/video/:slug` | Página de cada vídeo | Sí |
| `/politica-privacidad` | Privacidad y cookies | Sí |
| `/tp`, `/tp/monitor`, `/tp/monitor-obs` | Teleprompter y monitor de cámara remota | No |
| `/editor` | Editor Markdown | No |
| `/estadisticas` | Panel privado de analíticas (contraseña) | No |
| `/admin` | Panel de administración (contraseña + TOTP) | No |

## Funciones serverless (`api/`)

| Función | Para qué |
| :--- | :--- |
| `admin.js` | Panel `/admin` |
| `cron-sync.js` | Alta automática de vídeos nuevos (protegida con `CRON_SECRET`) |
| `track.js` | Visitas y detalle de sesiones (tablas `visits` y `analytics_sessions`) |
| `stats.js` | Datos de `/estadisticas`: sesiones, suscriptores push, ideas e importación de histórico |
| `auth-stats.js` | Inicio de sesión de `/estadisticas` |
| `youtube-analytics.js` | Horas de visualización (YouTube Analytics, OAuth) |
| `vault.js` | Sincronización de notas y progreso entre dispositivos y por QR (tabla `vaults`) |
| `push-subscribe.js` | Alta de suscripciones push |
| `collab.js` | Formulario de colaboraciones |
| `models.js` | Modelos de MakerWorld de la portada |
| `tp-rtc.js` | Conexión de la cámara remota del teleprompter |
| `counter.js` | Contador de ficheros del editor |

## Variables de entorno

Se configuran en Vercel (y `YOUTUBE_API_KEY`, `DATABASE_URL` y `CRON_SECRET` también como secretos de GitHub para las Actions). Nunca van en el repo.

| Variable | Uso |
| :--- | :--- |
| `DATABASE_URL` | Conexión a Neon (rol de la web) |
| `DATABASE_URL_MIGRATIONS` | Conexión a Neon para migraciones |
| `YOUTUBE_API_KEY` | Estadísticas y duraciones de YouTube |
| `CRON_SECRET` | Protege `api/cron-sync` |
| `VERCEL_DEPLOY_HOOK_URL` | Despliegue automático al detectar un vídeo nuevo |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Avisos push |
| `STATS_PASSWORD`, `STATS_SECRET` | Acceso a `/estadisticas` |
| `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` | YouTube Analytics (`scripts/get-youtube-refresh-token.js` genera el token) |
| `ADMIN_EMAIL`, `ADMIN_ENC_KEY` | Panel `/admin` |
| `COLLAB_LEGACY_WEBHOOK` | Opcional: reenvío por correo de los mensajes de colaboración |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Opcional: contador del editor |

## Publicar un vídeo nuevo

No hay que tocar nada: al subirlo a YouTube, `api/cron-sync` lo detecta, lo guarda en Neon, despliega la web y envía el aviso push. Desde `/admin` también se puede añadir un vídeo por su enlace.

## Desarrollo local

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # migraciones, datos, sitemap, compilación y páginas estáticas
npm run preview    # ver la compilación
```
