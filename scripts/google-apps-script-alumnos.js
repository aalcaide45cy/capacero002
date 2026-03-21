// GESTOR VERCEL A GOOGLE SHEETS PARA ALUMNOS CREADO POR CAPA CERO
// Instrucciones de despliegue rápido:
// 1. Ve a tu Google Sheets de ALUMNOS.
// 2. Haz clic en "Extensiones" > "Apps Script".
// 3. Borra el código que haya allí (function myFunction...) y pega todo este archivo.
// 4. Haz clic en el botón de Guardar (icono de disquete).
// 5. Arriba a la derecha, haz clic en el botón azul "Implementar" > "Nueva implementación".
// 6. Haz clic en el engranaje "Seleccionar tipo" y elige "Aplicación web".
// 7. Configuración requerida:
//    - Descripción: "Receptor API Web Capa Cero"
//    - Ejecutar como: "Yo (tu email)"
//    - Quién tiene acceso: "Cualquier persona" (IMPORTANTE)
// 8. Haz clic en "Implementar" (te pedirá revisar permisos, dile "Avanzado" e "Ir a proyecto (inseguro)" y "Permitir").
// 9. COPIA Y ENVÍAME el enlace enorme que dice "URL de la aplicación web" (empezará por https://script.google.com/macros/...)

function doPost(e) {
  try {
    // Tomamos la pestaña activa de tu Excel (donde ya has puesto las cabeceras)
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Generamos la huella temporal (Fecha de suscripción)
    var timestamp = new Date();
    
    // Añadimos una nueva fila a tu Excel al instante respetando el orden de columnas:
    // A: timestamp, B: nombre, C: apellidos, D: email, E: telefono, F: fecha_nacimiento
    sheet.appendRow([
      timestamp,
      data.nombre || "",
      data.apellidos || "",
      data.email || "",
      data.telefono || "",
      data.fecha_nacimiento || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
