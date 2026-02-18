export const SHEETS_CONFIG = {
    // Interruptor Maestro: 
    // true = La web carga productos desde Google Sheets
    // false = La web carga productos desde los archivos JSON locales (src/data/*.json)
    isActive: true,

    // true = Usa el archivo src/data/products.json generado (¡VELOCIDAD MÁXIMA!)
    // false = Usa la conexión en tiempo real (más lento)
    STATIC_BUILD: true,

    // Enlace PUBLICADO de Google Sheets (Archivo completo)
    // 1. Ve a Archivo > Compartir > Publicar en la web
    // 2. En "Enlace", selecciona "Todo el documento" y "Libro de Microsoft Excel (.xlsx)"
    // 3. Copia el enlace y pégalo aquí abajo:
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQddaGtXYpaJNMMIthwPDiB4U4_mN-0Ca9TRAjk5udQSd0ohCtwZUeTYewi1b1SNgAO-48T9sFJSg_7/pub?output=xlsx" // PEGA AQUÍ TU ENLACE XLSX PUBLICADO
};
