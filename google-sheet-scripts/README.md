# Google Sheet Scripts — Capa Cero 3D Backend

Este directorio contiene la copia de referencia del backend de Google Apps Script (`Codigo.txt`) asociado a la Google Sheet de **Capa Cero 3D** (https://www.capacero3d.com).

## ⚠️ Seguridad y Secretos

1. **Repo Público:** Este repositorio es público. **Bajo ninguna circunstancia** deben introducirse claves privadas o contraseñas en `Codigo.txt` ni en ningún archivo versionado en Git.
2. **Propiedades del Script (Script Properties):** Todos los secretos y credenciales residen en el almacenamiento cifrado de Google Apps Script (`PropertiesService.getScriptProperties()`):
   - `VAPID_PRIVATE_KEY`: Clave privada para la firma de notificaciones Web Push VAPID (ES256).
   - `STATS_API_TOKEN`: Token de seguridad compartido entre Vercel Serverless (`/api/stats-proxy`) y Google Apps Script para proteger el acceso a estadísticas privadas (`action=push_stats`, etc.).

## 🚀 Despliegue con Clasp

El proyecto se gestiona y despliega mediante **clasp** (`@google/clasp`):

1. **Autenticación:**
   ```bash
   npx @google/clasp login
   ```
2. **Descargar código remoto (Pull):**
   ```bash
   npx @google/clasp pull
   ```
3. **Subir código (Push):**
   ```bash
   npx @google/clasp push
   ```
4. **Actualizar despliegue web existente (sin cambiar la URL `/exec`):**
   ```bash
   # Ver IDs de despliegue
   npx @google/clasp deployments

   # Actualizar la versión de la implementación activa
   npx @google/clasp deploy -i <DEPLOYMENT_ID> -d "Actualización de seguridad V4"
   ```

## 📡 Endpoints Públicos vs Protegidos

- **Públicos:**
  - `action=vault_pull` / `vault_push` / `vault_delete`: Sincronización de progreso y notas del alumno entre dispositivos.
  - `action=qr_sync_poll` / `qr_sync_init` / `qr_sync_exchange`: Emparejamiento por QR entre móvil y PC.
  - `action=latest_notification`: Comprobación periódica por el Service Worker de la PWA.
  - Telemetría general y registro de suscripciones push.
- **Protegidos con `STATS_API_TOKEN`:**
  - `action=push_stats`: Desglose detallado de suscriptores, dispositivos y métricas internas del canal.
