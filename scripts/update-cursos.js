import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'cursos.json');

// URL del Excel de Cursos proporcionada
const CURSOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT-fgibdZUdSbWqmtvtFIEgmGBAcsvLr2gYxsfj50z0WFoMifZYnqO5z-JwdryyH0mdwKxxnytZbeEB/pub?output=xlsx";

async function main() {
    console.log('🚀 Iniciando descarga de Cursos desde Google Sheets...');

    try {
        const response = await fetch(CURSOS_URL);
        if (!response.ok) throw new Error('Fallo al descargar el Excel de cursos');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const allCursos = [];

        // Leer cada pestaña (cada curso)
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            
            // Extraer en modo array simple [[A1, B1], [A2, B2]...]
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            const row = {};
            let lastKey = "";
            
            for (const r of rows) {
                if (r && r.length >= 1) {
                    const keyRaw = r[0] ? String(r[0]).trim() : "";
                    const val = r[1] !== undefined ? String(r[1]).trim() : "";
                    
                    if (keyRaw) {
                        row[keyRaw] = val;
                        lastKey = keyRaw;
                    } else if (val && lastKey) {
                        // Bullet point continuation mode
                        row[lastKey] = row[lastKey] + "\n" + val;
                    }
                }
            }

            // Si después de escanear la hoja verticalmente no hay ID ni Nombre, salta
            if (!row.id || !row.name) {
                console.log(`⚠️ Saltando pestaña "${sheetName}": Falta 'id'/'name'.`);
                continue;
            }

            // Formateo de tipos base
            row.id = row.id.toString();
            row.name = row.name.toString();
            row.tag = row.tag ? row.tag.toString() : null;
            row.description = row.description ? row.description.toString() : "";
            row.video_url = row.video_url ? row.video_url.toString() : "";
            row.image_url = row.image_url ? row.image_url.toString() : "";
            row.price = row.price || '';
            row.udemy_link = row.udemy_link || '';
            row.discount_price = row.discount_price || '';
            row.order = row.order !== undefined && row.order !== "" ? parseInt(row.order) : Infinity;

            // Se pushea el objeto raw ENTERO (incluyendo todos los Custom Keys del Excel frontalmente)
            allCursos.push(row);
        }

        // Ordenar globalmente por la prioridad 'order' que marque el usuario
        allCursos.sort((a, b) => a.order - b.order);

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allCursos, null, 2));
        console.log(`✨ Generados ${allCursos.length} cursos dinámicos en src/data/cursos.json\n`);

    } catch (error) {
        console.error('🔥 Error Fatal en los Cursos:', error);
        process.exit(1);
    }
}

main();
