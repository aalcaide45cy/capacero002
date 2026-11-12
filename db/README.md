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

La compilación (`scripts/update-videos.js`) lee los vídeos de la tabla `videos` (los marcados `hidden` no se publican).
Sin acceso a Neon se parte del último `src/data/videos_v4.json` guardado y solo se refrescan las estadísticas.
## Módulo privado /dieta

Tablas `diet_*` (migración `007_dieta.sql`). La interfaz es `src/components/Dieta/DietaApp.jsx` y la API JSON vive en `api/_lib/dieta/`
(se sirve desde `api/admin.js` con la ruta `/api/dieta/*` para no añadir otra función de Vercel).

- Acceso: solo el propietario del panel `/admin`. Se entra con el mismo email, contraseña y código TOTP; la sesión de dieta es
  independiente (`diet_sessions`, cookie `__Host-cc_diet` HttpOnly/Secure/SameSite=Strict, hash del token en Neon, rotación cada 24 h).
  «Mantener sesión» = 30 días; sin marcar, 12 horas. No hay variables de entorno nuevas.
- Los alimentos se siembran **sin valores nutricionales** (no se inventan): se cargan en `/dieta` → Alimentos con su fuente.
- Pruebas: `npm test` (motor de cálculo) y `TEST_DATABASE_URL=<postgres de PRUEBA> npm run test:integration` (recorrido completo; borra el esquema public de esa base).
- Olvido de contraseña: igual que el panel (procedimiento de propietario de `/admin`); «Cerrar todas las sesiones» en Ajustes revoca las de dieta.
