import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'videos_v4.json');

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

function extractYouTubeId(url) {
  if (!url) return '';
  const clean = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : '';
}

function extractValidDownloads(row) {
  if (!row || typeof row !== 'object') return [];
  const candidates = [
    row.Enlace_Descarga || row.enlace_descarga || row['Enlace de Descarga'] || row['Enlace_descarga'],
    row.Enlace_Descarga2 || row.enlace_descarga2 || row['Enlace de Descarga 2'] || row['Enlace_descarga2'],
    row.Enlace_Descarga3 || row.enlace_descarga3 || row['Enlace de Descarga 3'] || row['Enlace_descarga3']
  ];
  return candidates
    .map((url, idx) => {
      const cleanUrl = String(url || '').trim();
      if (!cleanUrl || cleanUrl === '-' || cleanUrl.toLowerCase().includes('vacio') || cleanUrl.toLowerCase().includes('vacío')) {
        return null;
      }
      return {
        id: idx + 1,
        url: cleanUrl,
        label: `Descargar Recurso ${idx + 1}`
      };
    })
    .filter(Boolean);
}

function getPopularityScore(title, isFeatured) {
  const t = (title || '').toLowerCase();
  if (isFeatured || t.includes('costura')) return 100;
  if (t.includes('dinero') || t.includes('warping') || t.includes('gigante')) return 95;
  if (t.includes('tiempo') || t.includes('ahorra') || t.includes('mitad')) return 90;
  if (t.includes('perfiles de impresión') || t.includes('ajustes clave')) return 85;
  if (t.includes('textos feos') || t.includes('alta resolución')) return 80;
  if (t.includes('boquillas') || t.includes('high-flow')) return 75;
  if (t.includes('algolaser') || t.includes('pixi')) return 70;
  if (t.includes('chatgpt') || t.includes('ia')) return 65;
  if (t.includes('ams') || t.includes('multicolor')) return 60;
  if (t.includes('fusion') || t.includes('360')) return 55;
  if (t.includes('secretos') || t.includes('sabías')) return 50;
  return 30;
}

function normalizeVideoRow(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const title = String(raw.Titulo || raw.titulo || raw.Title || '').trim();
  const rawUrl = String(raw.URL_Youtube || raw.url_youtube || raw.Youtube || raw.URL || '').trim();
  const videoId = extractYouTubeId(rawUrl);
  
  const category = String(raw.Categoria || raw.categoria || raw.Category || 'Bambu Studio').trim();
  const rawDesc = String(raw.Descripcion || raw.descripcion || raw.Description || '').trim();
  const description = (rawDesc && !rawDesc.toLowerCase().includes('vacio') && !rawDesc.toLowerCase().includes('vacío')) ? rawDesc : '';

  const rawTip = String(raw.Consejo_Clave || raw.consejo_clave || raw.Tip || '').trim();
  const consejoClave = (rawTip && !rawTip.toLowerCase().includes('vacio') && !rawTip.toLowerCase().includes('vacío')) ? rawTip : '';

  const downloads = extractValidDownloads(raw);

  const rawDestacado = String(raw.Destacado || raw.destacado || '').trim().toUpperCase();
  const isFeatured = rawDestacado === 'SI' || rawDestacado === 'SÍ' || rawDestacado === 'TRUE' || rawDestacado === '1' || rawDestacado === 'YES';

  // Filtrar shorts verticales de YouTube
  const isShort = rawUrl.toLowerCase().includes('/shorts/') || 
                  title.toLowerCase().includes('#shorts') || 
                  title.toLowerCase().includes('#short');
  if (isShort) return null;

  const chapterMatch = title.match(/#(\d+(?:\.\d+)?)/);
  const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : null;
  const popularityScore = getPopularityScore(title, isFeatured);

  return {
    id: raw.id || `video-${index + 1}`,
    title: title || `Tutorial #${index + 1}`,
    youtubeUrl: rawUrl || `https://www.youtube.com/@CapaCero0`,
    youtubeId: videoId,
    thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '/logo-capa-cero-small.png',
    category: category || 'Bambu Studio',
    description,
    consejoClave,
    downloads,
    isFeatured,
    chapterNumber,
    popularityScore,
    hasDownloads: downloads.length > 0,
    hasTip: Boolean(consejoClave),
    hasDescription: Boolean(description)
  };
}

async function main() {
  console.log('🚀 Iniciando descarga de Videoteca V4 desde Google Sheets...');
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) throw new Error('CSV vacío');

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || !Array.isArray(results.data)) {
          console.error('❌ Formato de datos no válido');
          return;
        }

        const validVideos = results.data
          .filter(row => row && typeof row === 'object')
          .filter(row => {
            const t = (row.Titulo || row.titulo || '').trim();
            const u = (row.URL_Youtube || row.url_youtube || '').trim();
            return t.length > 0 || u.length > 0;
          })
          .map((row, idx) => normalizeVideoRow(row, idx))
          .filter(Boolean)
          .reverse(); // Último añadido en Google Sheets -> Primero en la web

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validVideos, null, 2));
        console.log(`✨ Generados ${validVideos.length} vídeos estáticos en src/data/videos_v4.json\n`);
      },
      error: (err) => {
        console.error('🔥 Error parseando CSV de vídeos:', err);
      }
    });
  } catch (error) {
    console.warn('⚠️ No se pudo descargar la hoja de vídeos (usando existente):', error.message);
  }
}

main();
