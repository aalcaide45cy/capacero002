# Llamar con iPhone (extensión de Chrome, Manifest V3)

Selecciona un teléfono, un texto con número o un enlace (`tel:` o una URL) y el iPhone recibe una notificación push. Al tocarla se abre la app **Llamadas rápidas** con un botón grande «Llamar».

## Instalación (modo desarrollador)
1. Abre `chrome://extensions` y activa **Modo de desarrollador**.
2. **Cargar descomprimida** y elige esta carpeta `chrome-extension/`.
3. Abre las **Opciones** de la extensión (clic en su icono) y rellena:
   - **URL base**: `https://capacero3d.com/qpush` (admite raíz o subcarpeta; las barras finales se normalizan).
   - **Token**: el valor de `CALL_API_TOKEN` configurado en Vercel. Se guarda solo en `chrome.storage`.
4. Pulsa **Probar conexión**. Para emparejar el iPhone pulsa **Código de emparejamiento** y escríbelo en la app del iPhone.

## Uso
- Selecciona texto con un teléfono → clic derecho → **Llamar con iPhone**.
- Clic derecho sobre un enlace `tel:` → **Llamar con iPhone**.
- Clic derecho sobre un enlace normal → se lee esa página y se envía el primer teléfono (prefiere enlaces `tel:`). La primera vez en cada sitio Chrome pide permiso para leerlo.
- Atajo opcional: `Alt+Shift+L` envía la selección (se cambia en `chrome://extensions/shortcuts`).
- El resultado aparece como notificación y como badge (`OK`, `?` número no válido, `ERR` error).

## Permisos
`contextMenus`, `storage`, `activeTab`, `scripting`, `notifications` y acceso a `capacero3d.com` / `www.capacero3d.com`. Los demás sitios son permisos opcionales que se piden solo cuando lees una página de otro dominio o configuras otra URL base.

Los iconos se regeneran con `python3 scripts/qpush-icons.py` desde la raíz del repositorio.
