import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'videos_v4.json');

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

// Mapa de vídeos programados con sus fechas de estreno reales de YouTube
const SCHEDULED_VIDEOS_MAP = {
  'RNWxu9tsB-k': { isScheduled: true, scheduledDate: '2026-08-31T18:00:00Z', label: 'Estreno el día 31 de agosto' },
  'STc2U-cqecQ': { isScheduled: true, scheduledDate: '2026-09-07T18:00:00Z', label: 'Estreno el día 7 de septiembre' },
  'ozlbqVkcinE': { isScheduled: true, scheduledDate: '2026-09-14T18:00:00Z', label: 'Estreno el día 14 de septiembre' },
  'mzItWgN4a5c': { isScheduled: true, scheduledDate: '2026-09-21T18:00:00Z', label: 'Estreno el día 21 de septiembre' },
  '3BtSMuvl8BQ': { isScheduled: true, scheduledDate: '2026-09-28T18:00:00Z', label: 'Estreno el día 28 de septiembre' },
  'IFTgPS3a6v8': { isScheduled: true, scheduledDate: '2026-10-05T18:00:00Z', label: 'Estreno el día 5 de octubre' }
};

// Fechas reales de publicación de YouTube para ordenación cronológica exacta
const YOUTUBE_PUBLISH_DATES = {
  'IFTgPS3a6v8': '2026-10-05T18:00:00Z', // #15 Textos y Modificadores (PROGRAMADO)
  '3BtSMuvl8BQ': '2026-09-28T18:00:00Z', // #14 Pintar Objetos (PROGRAMADO)
  'mzItWgN4a5c': '2026-09-21T18:00:00Z', // #13 Montaje de Objetos (PROGRAMADO)
  'ozlbqVkcinE': '2026-09-14T18:00:00Z', // #12 Grupos y Jerarquías (PROGRAMADO)
  'STc2U-cqecQ': '2026-09-07T18:00:00Z', // #11 No Hagas Esto al Cortar (PROGRAMADO)
  'RNWxu9tsB-k': '2026-08-31T18:00:00Z', // #10 Escala, rota y posiciona (PROGRAMADO)
  'utIYIcUG0tM': '2026-08-25T17:45:06Z', // Cajas Fusion 360 (PUBLICADO)
  'sIzQPJSVdvo': '2026-08-24T18:00:06Z', // #9 Interfaz (PUBLICADO)
  'D6zKWJAS6G0': '2026-08-17T18:00:06Z', // #8.1 Laminado
  'PCbMinEbUd4': '2026-08-13T17:45:06Z', // ¡Adiós a las costuras!
  'hZvIHMnxb3w': '2026-08-10T18:00:06Z', // #8 Movimiento Viewport
  '9otbdJPW1WA': '2026-08-06T17:30:25Z', // Fusion 360 Mesa
  '-uD_McDZ3Qk': '2026-08-03T18:00:06Z', // #7 Perfiles de Impresión
  'oDGtU6Z2VYM': '2026-07-31T17:30:33Z', // Ahorra la Mitad del Tiempo
  '-ZIU1pywxiQ': '2026-07-27T18:00:06Z', // #6 Perfiles vs Filamentos
  'OHLka3HAwn0': '2026-07-24T18:30:24Z', // Deja de Tirar Dinero (Gigantes/Warping)
  'fpvQEW7-9vo': '2026-07-22T18:00:16Z', // AlgoLaser Pixi 10W
  'DNouZLKOnpk': '2026-07-19T22:00:06Z', // #5 Boquillas High-Flow
  'w-DRE8UtD9s': '2026-07-15T16:05:11Z', // Textos Feos / Alta Resolución
  'zXLmMLsKLe4': '2026-07-13T18:00:06Z', // #4 Placa de Impresión
  'kYbpS-vwqJM': '2026-07-10T16:00:06Z', // Arreglar Modelos de IA
  'v3SFbjI8BEE': '2026-07-09T14:00:06Z', // ChatGPT con Bambu Studio
  'cfs1ctvUC-8': '2026-07-06T18:00:06Z', // #3 Primer Entorno
  'lP0FvQZ6uwk': '2026-07-05T11:30:06Z', // Ajustes SECRETOS
  'YUMNakCgUJs': '2026-06-29T18:00:06Z', // #2 Ecosistema Bambu Lab
  'hVCS-uyGflk': '2026-06-22T18:00:06Z', // #1 Instalación Bambu Studio
  '1ol3BaUnJ8Y': '2026-05-23T08:00:06Z', // Madimaker
  'nPaTKz9Zqcs': '2026-03-15T16:39:01Z'  // AMS Multicolor
};

// Estadísticas de YouTube reales y actualizadas en directo
const YOUTUBE_STATS_MAP = {
  "lP0FvQZ6uwk": { "views": 7183, "likes": 417, "comments": 72 },
  "utIYIcUG0tM": { "views": 6621, "likes": 168, "comments": 4 },
  "w-DRE8UtD9s": { "views": 6186, "likes": 378, "comments": 66 },
  "PCbMinEbUd4": { "views": 4774, "likes": 274, "comments": 32 },
  "nPaTKz9Zqcs": { "views": 3027, "likes": 87, "comments": 15 },
  "OHLka3HAwn0": { "views": 2892, "likes": 197, "comments": 34 },
  "kYbpS-vwqJM": { "views": 2435, "likes": 164, "comments": 28 },
  "oDGtU6Z2VYM": { "views": 2158, "likes": 133, "comments": 23 },
  "v3SFbjI8BEE": { "views": 1142, "likes": 76, "comments": 12 },
  "-ZIU1pywxiQ": { "views": 712, "likes": 55, "comments": 9 },
  "D6zKWJAS6G0": { "views": 682, "likes": 46, "comments": 2 },
  "hVCS-uyGflk": { "views": 568, "likes": 25, "comments": 4 },
  "zXLmMLsKLe4": { "views": 538, "likes": 34, "comments": 6 },
  "YUMNakCgUJs": { "views": 463, "likes": 29, "comments": 5 },
  "cfs1ctvUC-8": { "views": 429, "likes": 21, "comments": 3 },
  "DNouZLKOnpk": { "views": 417, "likes": 24, "comments": 4 },
  "1ol3BaUnJ8Y": { "views": 409, "likes": 24, "comments": 4 },
  "-uD_McDZ3Qk": { "views": 402, "likes": 23, "comments": 4 },
  "sIzQPJSVdvo": { "views": 330, "likes": 28, "comments": 2 },
  "9otbdJPW1WA": { "views": 305, "likes": 28, "comments": 5 },
  "hZvIHMnxb3w": { "views": 277, "likes": 16, "comments": 3 },
  "fpvQEW7-9vo": { "views": 262, "likes": 10, "comments": 2 },
  "RNWxu9tsB-k": { "views": 0, "likes": 0, "comments": 0 },
  "STc2U-cqecQ": { "views": 0, "likes": 0, "comments": 0 },
  "ozlbqVkcinE": { "views": 0, "likes": 0, "comments": 0 },
  "mzItWgN4a5c": { "views": 0, "likes": 0, "comments": 0 },
  "3BtSMuvl8BQ": { "views": 0, "likes": 0, "comments": 0 },
  "IFTgPS3a6v8": { "views": 0, "likes": 0, "comments": 0 }
};

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

async function fetchLiveYouTubeStats(videoId) {
  if (!videoId) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    const viewMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/) || html.match(/itemprop="interactionCount"\s+content="(\d+)"/);
    const views = viewMatch ? parseInt(viewMatch[1], 10) : null;

    const likeMatch = html.match(/"likeCount"\s*:\s*"(\d+)"/) || html.match(/"defaultText":\s*\{\s*"accessibility":\s*\{\s*"accessibilityData":\s*\{\s*"label":\s*"([\d.,]+)\s*me gusta"/i);
    let likes = null;
    if (likeMatch) {
      const parsed = parseInt(likeMatch[1].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) likes = parsed;
    }

    const commentMatch = html.match(/"commentCount"\s*:\s*\{\s*"simpleText"\s*:\s*"([\d.,]+)"/) || html.match(/"totalCommentsCount"\s*:\s*"(\d+)"/);
    let comments = null;
    if (commentMatch) {
      const parsed = parseInt(commentMatch[1].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) comments = parsed;
    }

    const dateMatch = html.match(/"publishDate"\s*:\s*"([^"]+)"/) || html.match(/"datePublished":\s*"([^"]+)"/);
    const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : null;

    return { views, likes, comments, publishedAt };
  } catch (e) {
    return null;
  }
}

function normalizeVideoRow(raw, index = 0, liveStats = null) {
  if (!raw || typeof row !== 'object' && !raw) return null;

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
  const publishedAt = liveStats?.publishedAt || YOUTUBE_PUBLISH_DATES[videoId] || new Date(Date.now() + (index * 1000)).toISOString();
  
  const stats = YOUTUBE_STATS_MAP[videoId] || { views: 0, likes: 0, comments: 0 };
  const views = liveStats?.views !== null && liveStats?.views !== undefined ? liveStats.views : (stats.views || 0);
  const likes = liveStats?.likes !== null && liveStats?.likes !== undefined ? liveStats.likes : (stats.likes || 0);
  const comments = liveStats?.comments !== null && liveStats?.comments !== undefined ? liveStats.comments : (stats.comments || 0);
  
  const scheduledConfig = SCHEDULED_VIDEOS_MAP[videoId];
  const rawScheduled = String(
    raw.Programado || raw.programado || 
    raw.Fecha_Estreno || raw.fecha_estreno || 
    raw.Estreno || raw.estreno || 
    raw.Fecha_Programada || raw.fecha_programada || 
    raw.Fecha_Publicacion || raw.fecha_publicacion ||
    raw.Fecha || raw.fecha ||
    raw.Estado || raw.estado || ''
  ).trim();

  const isStateScheduled = /programad|estreno|proximamente/i.test(rawScheduled);
  
  // Comprobación de fecha dinámica: SOLO es programado si su fecha es futura respecto a Date.now()
  const scheduledDateCandidate = scheduledConfig?.scheduledDate || raw.Fecha_Estreno || raw.fecha_estreno || (isStateScheduled ? publishedAt : null);
  const scheduledTimestamp = scheduledDateCandidate ? new Date(scheduledDateCandidate).getTime() : (publishedAt ? new Date(publishedAt).getTime() : NaN);
  const isFuture = !isNaN(scheduledTimestamp) && scheduledTimestamp > Date.now();
  
  const isScheduled = isFuture && (Boolean(scheduledConfig?.isScheduled) || isStateScheduled || Boolean(raw.isScheduled));
  
  let scheduledDateFormatted = null;
  if (isScheduled) {
    if (scheduledConfig?.label) {
      scheduledDateFormatted = scheduledConfig.label;
    } else {
      scheduledDateFormatted = formatScheduledDate(scheduledDateCandidate || publishedAt);
    }
  }

  // Popularity Score ponderado con vistas y likes reales
  const popularityScore = (likes * 10) + Math.round(views / 10) + (isFeatured ? 500 : 0);

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
    isScheduled,
    scheduledDateFormatted,
    chapterNumber,
    popularityScore,
    publishedAt,
    views,
    likes,
    comments,
    hasDownloads: downloads.length > 0,
    hasTip: Boolean(consejoClave),
    hasDescription: Boolean(description)
  };
}

function formatScheduledDate(rawDate) {
  if (!rawDate) return 'Estreno Próximamente';
  const str = String(rawDate).trim();
  if (str.toLowerCase().includes('estreno') || str.toLowerCase().includes('el día') || str.toLowerCase().includes('el dia')) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const options = { day: 'numeric', month: 'long' };
      const formatted = d.toLocaleDateString('es-ES', options);
      return `Estreno el día ${formatted}`;
    }
  } catch (e) {}
  return `Estreno el día ${str}`;
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
      complete: async (results) => {
        if (!results.data || !Array.isArray(results.data)) {
          console.error('❌ Formato de datos no válido');
          return;
        }

        const rows = results.data
          .filter(row => row && typeof row === 'object')
          .filter(row => {
            const t = (row.Titulo || row.titulo || '').trim();
            const u = (row.URL_Youtube || row.url_youtube || '').trim();
            return t.length > 0 || u.length > 0;
          });

        console.log(`📊 Procesando ${rows.length} vídeos y obteniendo estadísticas en tiempo real...`);

        const validVideos = [];
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rawUrl = String(row.URL_Youtube || row.url_youtube || row.Youtube || row.URL || '').trim();
          const videoId = extractYouTubeId(rawUrl);
          const liveStats = await fetchLiveYouTubeStats(videoId);
          const normalized = normalizeVideoRow(row, idx, liveStats);
          if (normalized) validVideos.push(normalized);
        }

        // Orden cronológico estricto (más nuevo publicado primero)
        validVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validVideos, null, 2));
        console.log(`✨ Generados ${validVideos.length} vídeos con estadísticas reales de YouTube en src/data/videos_v4.json`);
        console.log(`🎬 Vídeo #1 (Hero y primero de lista): ${validVideos[0]?.title} (${validVideos[0]?.views} visualizaciones)`);
        console.log(`🎬 Vídeo #2: ${validVideos[1]?.title} (${validVideos[1]?.views} visualizaciones)\n`);
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
