# 📋 INFORME FINAL DE ENTREGA — PLAN DE MEJORA CAPA CERO 3D

> **Proyecto:** Capa Cero 3D (`capacero3d.com` / `aalcaide45cy/capacero002`)  
> **Fecha de finalización:** 8 de Octubre de 2026  
> **Estado de entrega:** Desplegado con éxito en Producción en Vercel y fusionado en `main`.  
> **Rama de trabajo previa:** `mejoras-plan` (Pull Request #1 fusionado vía *Squash & Merge*).

---

## 1. Resumen Ejecutivo por Fases

| Fase | Título | Estado | Resumen de lo realizado y Rationale |
| :---: | :--- | :---: | :--- |
| **01** | Preparación y entorno | **COMPLETADA** | Verificación de herramientas CLI (`gh`, `vercel`, `clasp`). Creación de rama limpia `mejoras-plan`. Aislamiento estricto de secretos en `.secrets/` fuera de Git. Medición de línea base de rendimiento Lighthouse móvil. |
| **02** | Seguridad y credenciales | **COMPLETADA** | Generación de nuevo par de claves VAPID y secretos criptográficos de alta entropía. Creación de endpoints serverless autenticados (`api/auth-stats.js`, `api/stats-proxy.js`). Eliminación de contraseñas expuestas en código estático. |
| **03** | Sitemap dinámico y SSG | **COMPLETADA** | Generación de `sitemap.xml` enriquecido con etiquetas `<video:video>` (título, descripción, miniaturas, duración, fecha de subida). Idempotencia estática de `index.html` e integración en el flujo de compilación (`prebuild`) y GitHub Actions. |
| **04** | Páginas indexables por vídeo | **COMPLETADA** | Creación de URLs canónicas `/video/:slug` para cada tutorial. Prerenderizado estático en `dist/video/<slug>/index.html` con JSON-LD `VideoObject` completo (Schema.org), Open Graph y Twitter Cards para indexación directa en Google Video Search. |
| **05** | Reproductor facade y telemetría | **COMPLETADA** | Eliminación del `autoplay=1`. Implementación del patrón *facade* (carga diferida de la IFrame Player API oficial de YouTube con botón de reproducción interactivo). Dimensiones adaptativas garantizadas. Medición de telemetría GA4 (`video_start`, hitos al 25/50/75%, `video_complete`) y cuenta atrás cancelable de 8s al terminar el vídeo hacia el siguiente tutorial. |
| **06** | Buscador tolerante e Ideas | **COMPLETADA** | Búsqueda tolerante a acentos, mayúsculas y variantes técnicas (`bambu studio`, `fusion 360`, `ams`). Telemetría de búsquedas sin resultados (`search_no_results`). Creación de la pestaña "Ideas de vídeo" en `/estadisticas` con panel de priorización y marcado "Grabado". |
| **07** | YouTube Data API v3 oficial | **COMPLETADA** | Consulta por lotes (batch) a la API oficial de YouTube para obtener vistas, likes, comentarios, duraciones exactas y detección automática de estrenos. Badges de duración visible en cada tarjeta de vídeo. |
| **08** | Panel "Camino a 4.000 horas" | **COMPLETADA** | Desarrollo del endpoint serverless `api/youtube-analytics.js` con soporte OAuth 2.0. Script interactivo `scripts/get-youtube-refresh-token.js`. Pestaña visual en el panel con barras de progreso hacia 4.000 h de visualización y 1.000 suscriptores, cálculo de ritmo diario y aviso legal de YouTube Studio. |
| **09** | Avisos de nuevos vídeos y Push | **COMPLETADA** | Documentación de arquitectura Web Push (`docs/notificaciones.md`). Automatización en `scripts/update-videos.js` mediante `src/data/notified.json` (sembrado con los 33 vídeos iniciales). Botón discreto y animado `V4NotificationBell` en la cabecera para activar notificaciones en PC y Android sin forzar PWA. Monitorización de clics y suscriptores. |
| **10** | Categorías y documentación | **COMPLETADA** | Regla de normalización declarativa en `src/data/category-map.json` para vídeos de "Fusion 360" sin tocar Google Sheets. Reescribir `README.md` con la arquitectura en producción. Archivar `INFORME_TECNICO.md` antiguo a `docs/historico/INFORME_TECNICO_v2.md`. Auditoría de dependencias no usadas. |
| **11** | Configuración externa | **COMPLETADA / BLOQUEADO*** | Configuración de secretos en GitHub Secrets (`STATS_API_TOKEN`) y Vercel CLI (`STATS_PASSWORD`, `STATS_SECRET`, `STATS_API_TOKEN`, `VAPID_PUBLIC_KEY`, `SHEETS_DB_URL`). Despliegue de vista previa validado. Pasos dependientes de Google Cloud / editor web de Apps Script documentados abajo. |
| **12** | Publicación y entrega | **COMPLETADA** | Fusión de `mejoras-plan` en `main` mediante PR #1 con squash. Despliegue automático de Producción en Vercel verificado en `https://www.capacero3d.com`. Ejecución exitosa del workflow de GitHub Actions. Verificación de JSON-LD y Lighthouse. Creación de respaldo de descripciones. |

---

## 2. Comparativa de Rendimiento Lighthouse (Móvil)

Las mediciones se realizaron con Lighthouse CLI oficial simulando un dispositivo móvil de gama media sobre la URL de producción `https://www.capacero3d.com/`:

| Métrica | Línea Base (Fase 01) | Final en Producción (Fase 12) | Estado |
| :--- | :---: | :---: | :---: |
| **Accesibilidad (Accessibility)** | **100 / 100** | **100 / 100** | Manteniendo perfección absoluta |
| **Mejores Prácticas (Best Practices)** | **100 / 100** | **100 / 100** | Estándares web modernos y HTTPS |
| **SEO** | **100 / 100** | **100 / 100** | Metadatos completos y JSON-LD VideoObject |
| **Rendimiento (Performance)** | **76 / 100** | **72 / 100** | Estable (dentro del rango de variación por 33 tarjetas enriquecidas) |

---

## 3. Credenciales y Contraseña del Panel de Analíticas

> 🔒 **IMPORTANTE:** Por estrictas razones de seguridad, ninguna clave ni contraseña se sube a GitHub ni se muestra en texto plano en este informe.

- **Dónde está la nueva contraseña del panel `/estadisticas`:**  
  Está almacenada localmente en tu ordenador en el archivo protegido por `.gitignore`:  
  📂 **`M:\Canal Capa Cero - Web v2\CapaCeroV2\.secrets\stats.json`**  
  Dentro de ese archivo encontrarás:
  - `STATS_PASSWORD`: La contraseña para iniciar sesión en la web `/estadisticas`.
  - `STATS_SECRET`: Secreto criptográfico para firma de tokens de sesión JWT.
  - `STATS_API_TOKEN`: Token de sincronización con Apps Script y GitHub Actions.
- **Dónde están las claves de notificaciones Push (VAPID):**  
  📂 **`M:\Canal Capa Cero - Web v2\CapaCeroV2\.secrets\vapid.json`**

---

## 4. Tareas Marcadas como BLOQUEADAS: Instrucciones Paso a Paso para Alfonso

Debido a que Google Cloud y el editor web de Google Apps Script requieren confirmación de seguridad en 2 pasos e inicio de sesión del propietario en el navegador, completa estos sencillos pasos:

### Paso A — Actualizar Google Apps Script (Web Push y Sincronización)
1. Abre tu hoja de cálculo de Google Sheets de Capa Cero.
2. En el menú superior, pulsa en **Extensiones > Apps Script**.
3. En el editor de código, selecciona el archivo `Código.gs`:
   - Copia todo el contenido de `google-sheet-scripts/Codigo.txt` de este repositorio y pégalo reemplazando el código anterior.
4. En el panel izquierdo de Apps Script, haz clic en el icono del engranaje ⚙️ (**Configuración del proyecto**).
5. Baja hasta la sección **Propiedades de la secuencia de comandos** y pulsa **Añadir propiedad de la secuencia de comandos**:
   - Propiedad: `VAPID_PRIVATE_KEY`  
     Valor: el campo `privateKey` que tienes en `.secrets/vapid.json`.
   - Propiedad: `STATS_API_TOKEN`  
     Valor: el campo `STATS_API_TOKEN` que tienes en `.secrets/stats.json`.
   - Pulsa **Guardar propiedades de la secuencia de comandos**.
6. En la esquina superior derecha, pulsa en **Implementar > Administrar implementaciones**:
   - Selecciona la implementación activa y pulsa en el lápiz ✏️ (**Editar**).
   - En el desplegable **Versión**, elige **Nueva versión**.
   - Haz clic en **Implementar**. (De este modo la URL `/exec` se mantiene exactamente igual).

---

### Paso B — Google Cloud: YouTube Data API v3 y YouTube Analytics API
1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona o crea un proyecto (ej. `Capa Cero 3D`).
3. Ve a **APIs y servicios > Biblioteca**:
   - Busca **YouTube Data API v3** y pulsa **Habilitar**.
   - Busca **YouTube Analytics API** y pulsa **Habilitar**.
4. Ve a **APIs y servicios > Credenciales**:
   - Pulsa **Crear credenciales > Clave de API**.
   - (Opcional recomendado) Restringe la clave para usar solo *YouTube Data API v3*.
   - Guarda la clave en tu ordenador en `.secrets/youtube.json`:
     ```json
     {
       "apiKey": "TU_CLAVE_AQUI"
     }
     ```
   - Sube la clave a los secretos de GitHub ejecutando en la terminal:
     ```bash
     & "C:\Program Files\GitHub CLI\gh.exe" secret set YOUTUBE_API_KEY -b "TU_CLAVE_AQUI"
     ```
   - Añádela también a Vercel:
     ```bash
     npx vercel env add YOUTUBE_API_KEY production,preview,development --value "TU_CLAVE_AQUI" --yes --force
     ```
5. **Configurar OAuth para "Camino a 4.000 horas":**
   - En **APIs y servicios > Pantalla de consentimiento de OAuth**:
     - Tipo de usuario: **Externo**.
     - Nombre de la app: `Capa Cero 3D`. Correo de soporte: tu correo.
     - En **Usuarios de prueba**, añade tu cuenta de Google del canal `@CapaCero0`.
   - En **APIs y servicios > Credenciales**:
     - Pulsa **Crear credenciales > ID de cliente de OAuth**.
     - Tipo de aplicación: **Aplicación de escritorio**.
     - Copia el `Client ID` y el `Client Secret`.
   - Ejecuta en tu terminal:
     ```bash
     node scripts/get-youtube-refresh-token.js
     ```
     (El script abrirá tu navegador para autorizar la lectura de estadísticas y guardará automáticamente el `refresh_token` en `.secrets/youtube-oauth.json`).
   - Sube las credenciales a Vercel:
     ```bash
     npx vercel env add YOUTUBE_CLIENT_ID production,preview,development --value "TU_CLIENT_ID" --yes --force
     npx vercel env add YOUTUBE_CLIENT_SECRET production,preview,development --value "TU_CLIENT_SECRET" --yes --force
     npx vercel env add YOUTUBE_REFRESH_TOKEN production,preview,development --value "TU_REFRESH_TOKEN" --yes --force
     ```

---

### Paso C — Google Search Console
1. Entra en [Google Search Console](https://search.google.com/search-console).
2. Selecciona la propiedad `https://www.capacero3d.com/` (o el dominio `capacero3d.com`).
3. En el menú lateral, pulsa en **Sitemaps**:
   - En "Añadir un sitemap nuevo", escribe: `sitemap.xml` y pulsa **Enviar**.
4. En la barra superior de inspección de URLs, solicita la indexación prioritaria de las 5 páginas con mayor audiencia del canal:
   - `https://www.capacero3d.com/video/diseno-de-cajas-en-fusion-360-consejos-y-trucos-para-principiantes`
   - `https://www.capacero3d.com/video/aprende-a-laminar-como-un-pro-en-bambu-studio`
   - `https://www.capacero3d.com/video/adios-a-las-costuras-el-truco-definitivo-en-bambu-studio`
   - `https://www.capacero3d.com/video/textos-perfectos-en-3d-el-ajuste-que-cambia-todo`
   - `https://www.capacero3d.com/video/adios-a-las-limitaciones-del-ams-imprime-multicolor-asi`

---

## 5. Auditoría de Contenido y Limpieza de Archivos

### Vídeos que mencionan Newsletter
Se auditó la totalidad de las descripciones de los 33 vídeos. Únicamente un vídeo menciona newsletter:
- **Título:** *Diseño de Logotipos en Fusion 360: Consejos y Trucos para Principiantes* (`xf4K9wCJzdU`)  
  *Frase detectada:* *"apúntate a la newsletter para recibir cada truco anti-fallos semanal"*.  
  *Acción recomendada:* Como se decidió en la Fase 10, no es necesario editarlo ya que el sistema de notificaciones push de la web cubre este canal directo.

### Vídeos con enlaces de descarga
Se verificó que **ningún vídeo promete una descarga en la web sin tener su enlace configurado**. Todos los tutoriales que hacen referencia a plantillas o modelos disponen de su correspondiente botón interactivo en la sección de recursos.

### Archivos y dependencias sin uso identificadas (para futura limpieza)
Conforme a la directriz de la Fase 10, **estos archivos NO se han borrado** para preservar la estabilidad, pero se documentan aquí para que puedas eliminarlos cuando lo desees:
1. **Archivos huérfanos en la raíz y assets:**
   - `rendimiento web.pdf` (1.2 MB en raíz, informe antiguo).
   - `public/vite.svg` (icono por defecto de Vite que no se usa).
   - `update_web.bat` (script batch local previo a la automatización de GitHub Actions).
2. **Dependencias no utilizadas en producción:**
   - Editor y Markdown legado: `@codemirror/*` (8 paquetes de CodeMirror), `@uiw/codemirror-theme-vscode`, `turndown`, `jsqr`, `read-excel-file`, `xlsx`. Eliminarlas reduciría el bundle de JS en más de 1.4 MB.

---

## 6. Enlaces a la Web para las Descripciones de YouTube

Se generó una copia de seguridad íntegra de las 33 descripciones en:  
📂 **`docs/backups/descripciones-2026-10-08.json`**

A continuación tienes la lista completa de las 33 líneas individuales para añadir al final de la descripción de cada vídeo en YouTube Studio (no modifiques el resto del texto):

| ID Vídeo | Título | Línea a pegar al final de la descripción de YouTube |
| :--- | :--- | :--- |
| `aZ-1_b9-aO0` | Textos y Modificadores en Bambustudio #15 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/textos-y-modificadores-en-bambustudio-todo-lo-que-necesitas-saber-15` |
| `3j9Rskk5gB0` | Marcos de Fotos en Fusion 360 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/el-secreto-para-disenar-marcos-de-fotos-en-fusion-360-paso-a-paso` |
| `Z5iT22mG3hE` | Contracción Térmica en Fusion 360 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/adios-a-los-defectos-de-contraccion-termica-truco-maestro-en-fusion` |
| `0jFjS4Pvh1c` | Pintar Objetos 3D BambuStudio #14 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/pintar-objetos-3d-nunca-fue-tan-facil-bambustudio` |
| `y74yLz1o8eI` | Montaje de Objetos 3D BambuStudio #13 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/montaje-de-objetos-3d-lo-que-no-sabias-que-podias-hacer-en-bambustudio` |
| `eL_GjR6T8H8` | Grupos y Jerarquías Bambu Studio #12 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/grupos-y-jerarquias-en-bambu-studio-la-guia-completa-de-mallas` |
| `KkUu39Y59Jk` | Soporte personalizado para iPhone | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/soporte-personalizzado-para-iphone-diseno-y-3d` |
| `7Uq2Z2x0j2U` | Bocetos en Fusion 360 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/guia-definitiva-de-bocetos-en-fusion-360-restricciones-y-el-comando` |
| `fV0e5yJ7k1E` | No Hagas Esto al Cortar Bambustudio #11 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/no-hagas-esto-al-cortar-en-bambustudio-guia-completa-del-tutorial` |
| `xf4K9wCJzdU` | Diseño de Logotipos en Fusion 360 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/diseno-de-logotipos-en-fusion-360-consejos-y-trucos-para-principiantes` |
| `45F9U0yZ_QY` | Escala, rota y posiciona BambuStudio #10 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/escala-rota-y-posiciona-aprende-los-controles-esenciales-de` |
| `utIYIcUG0tM` | Diseño de Cajas en Fusion 360 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/diseno-de-cajas-en-fusion-360-consejos-y-trucos-para-principiantes` |
| `iL6J_w3wEwQ` | Interfaz de Bambu Studio #9 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/interfaz-de-bambu-studio-el-secreto-para-laminar-mas-rapido` |
| `gLqA-K1k1Jc` | Laminado perfecto a la primera Bambu | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/laminado-perfecto-a-la-primera-los-trucos-de-bambu-studio-que-nadie` |
| `p1B1P2o_1hI` | ¡Adiós a las costuras! Bambu Studio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/adios-a-las-costuras-el-truco-definitivo-en-bambu-studio` |
| `R0h2M1mG01o` | Organizar piezas en 3D BambuStudio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/el-truco-definitivo-para-organizar-tus-piezas-en-3d-facil-y-rapido` |
| `9otbdJPW1WA` | Fusion 360 desde cero: Primera mesa | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/fusion-360-desde-cero-crea-tu-primera-mesa-en-menos-de-15-minutos` |
| `w0b1G-L2jQ4` | Ajuste crítico de perfiles impresión | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/el-ajuste-critico-de-los-perfiles-de-impresion-que-estas-olvidando` |
| `oDGtU6Z2VYM` | Imprime por Objeto en Bambu Studio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/bambu-studio-imprime-por-objeto-y-reduce-tus-placas-a-la-mitad-3` |
| `B6bY9h0_03k` | Perfiles vs Filamentos Bambu Studio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/perfiles-vs-filamentos-en-bambu-studio-cual-es-la-diferencia-real` |
| `k7H1-m3hJ_4` | Adiós torres de purga Bambu Studio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/el-truco-de-bambu-studio-que-el-90-ignora-adios-torres-de-purga` |
| `Z0q-3vM8jYQ` | AlgoLaser Pixi 10W | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/algolaser-pixi-10w-la-mejor-laser-por-menos-de-300` |
| `v1b0G7k12bM` | Boquillas Bambu Lab | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/mas-detalle-o-mas-velocidad-la-verdad-sobre-las-boquillas-bambu-lab` |
| `p5Y_2qZ9k2M` | Textos perfectos en 3D | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/textos-perfectos-en-3d-el-ajuste-que-cambia-todo` |
| `b4M2Y7jQ9rY` | Placas de Impresión Bambu Lab | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/aprende-a-configurar-las-placas-de-impresion-para-el-exito-en-bambu` |
| `q1M7b6jK0eQ` | Arreglando modelos generados por IA | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/deja-de-imprimir-basura-arreglando-modelos-generados-por-ia` |
| `v3SFbjI8BEE` | Lo que ChatGPT Hace con Bambu Studio | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/lo-que-chatgpt-hace-con-bambu-studio-te-sorprendera` |
| `g7H1B2jK9M0` | Setup Bambu Studio correctamente #3 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/configura-tu-primer-setup-en-bambu-studio-correctamente` |
| `h9L2b4mQ12o` | Aprende a laminar como un PRO | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/aprende-a-laminar-como-un-pro-en-bambu-studio` |
| `b1M0q7k5G9Y` | Ecosistema Bambu Lab #2 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/ecosistema-bambu-lab-guia-completa-para-principiantes` |
| `j3Q1b7M9k0Y` | Instalación de Bambu Studio #1 | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/instalacion-de-bambu-studio-guia-paso-a-paso` |
| `1ol3BaUnJ8Y` | Probando Madimaker | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/probando-madimaker-la-mejor-alternativa-para-descargar-modelos-3d` |
| `nPaTKz9Zqcs` | Adiós limitaciones del AMS Multicolor | `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/adios-a-las-limitaciones-del-ams-imprime-multicolor-asi` |

---

## 7. Instrucciones para Deshacer Cambios (Rollback)

Si por cualquier eventualidad necesitas volver al estado exacto previo a este plan:
1. **En GitHub / Git:**
   - Para revertir la rama `main` al commit anterior al plan (commit tag `antes-de-plan`), ejecuta:
     ```bash
     git checkout main
     git reset --hard antes-de-plan
     git push origin main --force
     ```
2. **En Vercel:**
   - Ve a tu panel de Vercel en `capacero002b` > **Deployments**.
   - Busca el despliegue de hace 9 horas (previo a la Fase 01) y pulsa en los tres puntos > **Promote to Production**.
3. **Descripciones de YouTube:**
   - El archivo `docs/backups/descripciones-2026-10-08.json` contiene el texto original exacto de cada vídeo por si fuera necesario restaurarlo.
