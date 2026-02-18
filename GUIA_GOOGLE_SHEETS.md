# Guía de Gestión con Google Sheets - CAPA CERO

Esta guía explica cómo gestionar los productos de tu web usando una hoja de cálculo de Google Sheets.

## 1. Estructura de la Hoja de Cálculo

Tu hoja de cálculo debe tener pestañas con el nombre `Marketplace - Categoria`.
Ejemplos:
- `Amazon - 🧵 Filamentos`
- `AliExpress - 🛠️ Herramientas`

### Columnas Obligatorias

| Columna | Descripción | Ejemplo |
| :--- | :--- | :--- |
| **id** | Identificador único (opcional, se genera auto si falta) | `Amz-001` |
| **name** | Nombre del producto | `Filamento PLA+` |
| **image1** | URL de la imagen principal | `https://amazon.com/foto.jpg` |
| **price** | Precio (texto libre) | `19.99€` |
| **showPrice** | ¿Mostrar precio? (`TRUE`/`FALSE`) | `FALSE` |
| **link** | Tu enlace de afiliado | `https://amzn.to/xyz` |
| **description** | Breve descripción | `Filamento de alta calidad...` |

### Columnas Opcionales
- `image2` ... `image10`: Imágenes adicionales para el carrusel.
- `tag`: Etiqueta destacada (ej: `🔥 TOP`, `💶 ECONOMICO`).
- `buttonText`: Texto del botón (ej: `¡VER OFERTA!`).
- `order`: Número para ordenar (1, 2, 3...).
- `carouselInterval`: Velocidad del pase de fotos (ms).

## 2. Cómo Publicar los Cambios

Para que la web pueda leer tu Excel, necesitas publicarlo como archivo XLSX.

1.  En Google Sheets, ve a **Archivo** > **Compartir** > **Publicar en la web**.
2.  En "Enlace", selecciona **"Todo el documento"**.
3.  En el formato (a la derecha), selecciona **"Libro de Microsoft Excel (.xlsx)"**.
4.  Dale a **Publicar** y copia el enlace.
5.  Pega ese enlace en `src/config/sheets.js` en tu código.

## 3. Trucos y Consejos

- **Precios Ocultos**: Si dejas la celda `showPrice` vacía o pones `FALSE`, el precio no se verá y el botón estará centrado.
- **Imágenes**: Usa enlaces directos a las imágenes (botón derecho > copiar dirección de imagen en Amazon/AliExpress).
- **Orden**: Si quieres que un producto salga el primero, ponle `order: 1`.

---

## ⚡ Truco Final: Botón "Actualizar Web" (Automático)

Para que la web sea **instantánea**, ahora funciona descargando las fotos a tu servidor.
Cada vez que cambies algo aquí, necesitas "avisar" a la web para que se actualice.

### ¿Cómo crear el botón mágico?

1.  En tu Google Sheet, ve a **Extensiones** > **Apps Script**.
2.  Borra el código que salga y pega este exactamente:

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('🚀 ACTUALIZAR WEB')
      .addItem('🔄 Publicar Cambios Ahora', 'triggerBuild')
      .addToUi();
}

function triggerBuild() {
  // Tu Enlace Secreto de Vercel
  var url = "https://api.vercel.com/v1/integrations/deploy/prj_V2xLnaHpATOiIzAtXmDWEXGPcH0k/90UdgKdpTU";
  var options = {
    "method": "post"
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    Browser.msgBox("✅ ¡Éxito! La web se está actualizando.\\n\\nLas fotos nuevas y precios estarán listos en 1 minuto.");
  } catch (e) {
    Browser.msgBox("❌ Error: " + e.toString());
  }
}
```

3.  Dale al icono del **Disquete (Guardar)** y ponle de nombre "Actualizador".
4.  Cierra la pestaña de Apps Script y **refresca (F5)** tu hoja de cálculo.
5.  ¡Magia! ✨ Verás un nuevo menú arriba llamado **🚀 ACTUALIZAR WEB**.

### ¿Cómo se usa?
1.  Cambias un precio o añades una foto.
2.  Vas al menú **🚀 ACTUALIZAR WEB** > **🔄 Publicar Cambios Ahora**.
3.  Esperas el mensajito de "Éxito".
4.  Te vas a tomar un café ☕. En 1 minuto, tu web estará nueva.
