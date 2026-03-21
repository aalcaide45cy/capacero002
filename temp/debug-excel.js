import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'Capa Cero - Cursos.xlsx');
try {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    console.log("Pestaña encontrada:", sheetName);
    console.log("Contenido Extraído (Columna A -> Columna B):");
    let count = 0;
    for (const r of rows) {
        if (r && (r[0] || r[1])) {
            count++;
            const colA = r[0] ? String(r[0]).trim() : "[Vacía]";
            const colB = r[1] ? String(r[1]).trim().substring(0, 70).replace(/\n/g, '\\n') + (String(r[1]).length > 70 ? '...' : '') : "[Vacía]";
            console.log(`${String(count).padStart(2, ' ')}. [${colA}] => ${colB}`);
        }
    }
} catch(e) {
    console.error("Error reading excel:", e);
}
