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

            // Construir el objeto raw fila a fila (Clave en Col A, Valor en Col B)
            const row = {};
            let lastKey = "";
            
            for (const r of rows) {
                if (r && r.length >= 1) {
                    const keyRaw = r[0] ? String(r[0]).trim() : "";
                    const val = r[1] !== undefined ? String(r[1]).trim() : "";
                    
                    if (keyRaw) {
                        const key = keyRaw.toLowerCase();
                        // Comprobamos si tiene pinta de ser una clave legítima (con guión bajo o palabra clave base)
                        const isSystemKey = key.includes('_') || ['id', 'name', 'tag', 'description', 'price', 'order'].includes(key);
                        
                        if (isSystemKey) {
                            row[key] = val;
                            lastKey = key;
                        } else if (lastKey.endsWith('_desc')) {
                            // El usuario ha pegado accidentalmente su viñeta en la Columna A en vez de B
                            const bulletContent = val ? `${keyRaw} ${val}` : keyRaw;
                            row[lastKey] = row[lastKey] + "\n" + bulletContent;
                        }
                    } else if (val && lastKey.endsWith('_desc')) {
                        // Modo correcto: Columna A vacía, viñeta en Columna B
                        row[lastKey] = row[lastKey] + "\n" + val;
                    }
                }
            }

            // Si después de escanear la hoja verticalmente no hay ID ni Nombre, se ignora
            if (!row.id || !row.name) {
                console.log(`⚠️ Saltando pestaña "${sheetName}": Estructura vertical inválida o falta 'id'/'name'.`);
                continue;
            }

            allCursos.push({
                id: row.id.toString(),
                name: row.name.toString(),
                tag: row.tag ? row.tag.toString() : null,
                description: row.description ? row.description.toString() : "",
                video_url: row.video_url ? row.video_url.toString() : "",
                image_url: row.image_url ? row.image_url.toString() : "",
                udemy_link: row.udemy_link || '',
                price: row.price || '',
                discount_price: row.discount_price || '',
                order: row.order !== undefined && row.order !== "" ? parseInt(row.order) : Infinity,
                
                // Nuevos campos dinámicos para la Landing Page (Estilo Masterdevs)
                hero_subtitle: row.hero_subtitle || '',
                modules_title: row.modules_title || '',
                module_1_title: row.module_1_title || '',
                module_1_desc: row.module_1_desc || '',
                module_2_title: row.module_2_title || '',
                module_2_desc: row.module_2_desc || '',
                module_3_title: row.module_3_title || '',
                module_3_desc: row.module_3_desc || '',
                module_4_title: row.module_4_title || '',
                module_4_desc: row.module_4_desc || '',
                module_5_title: row.module_5_title || '',
                module_5_desc: row.module_5_desc || '',
                module_6_title: row.module_6_title || '',
                module_6_desc: row.module_6_desc || '',
                features_title: row.features_title || '',
                features_desc: row.features_desc || ''
            });
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
