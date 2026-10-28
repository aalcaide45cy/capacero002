# Base de datos (Neon)

Postgres en Neon, región Frankfurt. Ramas: `production` (web real) y `dev` (pruebas / vistas previas de Vercel).

- `DATABASE_URL`: rol `app_web` con pooler (solo leer/escribir datos). Lo usan la web, `api/cron-sync.js` y la compilación.
- `DATABASE_URL_MIGRATIONS`: rol `migrator` (cambiar estructura). Solo para `npm run db:migrate` y `npm run db:import`.
- Ambas variables están en Vercel como sensibles (producción -> rama `production`, preview -> rama `dev`). Nunca van en el repo.

## Búsqueda automática de vídeos nuevos

`api/cron-sync.js` consulta el canal en YouTube (API con `YOUTUBE_API_KEY`, o RSS si no hay clave), guarda en la tabla `videos`
los vídeos nuevos que no son Shorts y, si hay alguno, lanza un despliegue con `VERCEL_DEPLOY_HOOK_URL`.
Se protege con `CRON_SECRET` (cabecera `Authorization: Bearer ...`). Lo llaman Vercel Cron (1 vez al día) y
`.github/workflows/cron-sync.yml` (cada hora, necesita el secreto `CRON_SECRET` en GitHub).

La compilación (`scripts/update-videos.js`) sigue leyendo la hoja y además añade los vídeos que estén en Neon y no en la hoja;
un vídeo marcado `hidden` en Neon se oculta.
