# Guía de Google Analytics 4 (GA4) - CAPA CERO

He integrado Google Analytics 4 para que puedas medir el comportamiento de tus usuarios de forma detallada.

## 📊 ¿Qué estamos midiendo?

He configurado eventos automáticos para las acciones más importantes:

### 1. Búsquedas Realizadas
- **Evento**: `search`
- **Dato**: El término que la gente escribe en el buscador.
- **En Tiempo Real**: Ve a **Resumen en tiempo real > Tarjeta de Eventos > search > search_term**.
- **En Histórico (mañana)**: Ve a **Informes > Interacción > Eventos > search > Tarjeta de search_term**.

### 2. Clicks en Productos
- **Evento**: `select_content`
- **Dónde verlo**: Haz clic en el evento en la misma sección de informes para ver qué productos son los más populares.

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

---

## � Tip: Cómo usar el DebugView para pruebas

Para ver tus propios clics en tiempo real exactamente como los recibe Google:

1. Ve a **Administración** > **Visualización de datos** > **DebugView**.
2. Realiza una búsqueda en tu web.
3. En el panel, verás aparecer el evento `search`.
4. Pincha en el evento y entra en la pestaña **Parámetros** > **search_term**. ¡Ahí verás lo que acabas de escribir!
