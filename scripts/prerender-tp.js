import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Genera dist/tp/index.html a partir del index.html compilado, con el manifest y los metadatos
// propios del Teleprompter. Safari (iPhone) lee el manifest al cargar la página, así que para que
// "Añadir a pantalla de inicio" abra /tp el HTML debe traerlo ya enlazado desde el servidor.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const TEMPLATE_FILE = path.resolve(DIST_DIR, 'index.html');
const OUTPUT_DIR = path.resolve(DIST_DIR, 'tp');

if (!fs.existsSync(TEMPLATE_FILE)) {
  console.error(`❌ No se encontró ${TEMPLATE_FILE}. Debes compilar con Vite antes.`);
  process.exit(1);
}

let html = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

const replacements = [
  [/<title>[\s\S]*?<\/title>/i, '<title>Teleprompter · Capa Cero 3D</title>'],
  [/<link\s+rel="manifest"[^>]*>/i, '<link rel="manifest" href="/tp.webmanifest" />'],
  [/<meta\s+name="apple-mobile-web-app-title"[^>]*>/i, '<meta name="apple-mobile-web-app-title" content="Teleprompter" />'],
  [/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />'],
  [/<meta\s+name="viewport"[^>]*>/i, '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover" />'],
  [/<meta\s+name="description"[\s\S]*?>/i, '<meta name="description" content="Teleprompter para leer guiones y grabarte a la vez." />'],
  [/<link\s+rel="canonical"[^>]*>\s*/i, ''],
  [/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, ''],
];

for (const [pattern, value] of replacements) {
  html = html.replace(pattern, value);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html, 'utf-8');
console.log('✅ Generado dist/tp/index.html para el Teleprompter');
