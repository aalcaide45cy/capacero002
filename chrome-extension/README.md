# Llamar con iPhone (extensión de Chrome, Manifest V3)

Selecciona un teléfono, un enlace o un texto en Chrome, clic derecho → **Llamar con iPhone** y llega a la app del iPhone. Si es un teléfono, al tocar la notificación aparece el botón grande «Llamar».

## Instalación (modo desarrollador)
1. Descarga el ZIP desde la página `/qpush/` de la web (botón «Descargar extensión») y descomprímelo. También sirve esta carpeta `chrome-extension/`.
2. Abre `chrome://extensions` y activa **Modo de desarrollador**.
3. **Cargar descomprimida** y elige la carpeta `llamar-con-iphone` (o `chrome-extension/`).
4. Abre las **Opciones** de la extensión (clic en su icono) y pulsa **Vincular iPhone**: aparece un QR.
5. En el iPhone, abre la app **Llamadas rápidas** (instalada desde Safari con «Añadir a pantalla de inicio»), pulsa **Escanear QR** y apunta al código. Queda vinculado; no hay que escribir ningún token.

(Chrome no permite instalar extensiones con un clic fuera de la Chrome Web Store.)

## Uso
- Selecciona un teléfono (con espacios, guiones, puntos o paréntesis) → clic derecho → **Llamar con iPhone**.
- Clic derecho sobre un enlace `tel:` → igual.
- Selecciona un enlace o un texto cualquiera → igual: la app lo guarda en la lista y, si es un enlace, muestra «Abrir».
- Clic derecho sobre un enlace normal → se lee esa página y, si tiene un teléfono, se envía; si no, se envía el enlace. La primera vez en cada sitio Chrome pide permiso para leerlo.
- Atajo opcional: `Alt+Shift+L` envía la selección (se cambia en `chrome://extensions/shortcuts`).
- El resultado aparece como notificación y badge (`OK`, `?` no válido, `ERR` error).

## Permisos
`contextMenus`, `storage`, `activeTab`, `scripting`, `notifications` y acceso a `capacero3d.com` / `www.capacero3d.com`. Otros sitios son permisos opcionales que solo se piden al leer una página de otro dominio o cambiar la URL base.

La vinculación crea una clave propia de esta instalación (se guarda en `chrome.storage`, nunca en el código). Los iconos se regeneran con `python3 scripts/qpush-icons.py`.
