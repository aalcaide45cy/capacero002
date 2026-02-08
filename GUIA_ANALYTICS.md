# Guía de Google Analytics 4 (GA4) - CAPA CERO

He integrado Google Analytics 4 para que puedas medir el comportamiento de tus usuarios de forma detallada.

## 📊 ¿Qué estamos midiendo?

He configurado eventos automáticos para las acciones más importantes:

### 1. BúsquedasRealizadas
- **Evento**: `search`
- **Dato**: El término que la gente escribe en el buscador (ej: "PLA", "Ender 3").
- **Nota**: He añadido un retraso inteligente (debounce) para que solo se guarde la palabra completa y no cada letra que escriben.

### 2. Clicks en Productos
- **Evento**: `select_content`
- **Datos**: Nombre del producto, su categoría y el ID.
- **Utilidad**: Sabrás qué tarjetas "venden" más o despiertan más curiosidad.

### 3. Filtros y Categorías
- **Evento**: `select_category` y `select_filter`
- **Datos**: Qué categorías (Filamentos, Electrónica...) o filtros (Top, Oferta, Nuevo) se activan.

### 4. Redes Sociales
- **Evento**: `click_social`
- **Datos**: Si han pinchado en TikTok o YouTube desde el encabezado.

---

## 🚀 Cómo ver los datos

1. Entra en [Google Analytics](https://analytics.google.com/).
2. Ve a **Informes** > **Interacción** > **Eventos**.
3. Ahí verás la lista de eventos mencionados arriba. 
4. Para ver de qué países vienen, edad o dispositivos: Ve a **Informes** > **Atributos del usuario** o **Tecnología**.

---

## 🛠️ Configuración Técnica
- **Measurement ID**: `G-Y8RT9QWCD9`
- **Archivo Principal**: `index.html` (contiene el script de carga).
- **Lógica de Eventos**: `src/utils/analytics.js` y componentes individuales.
