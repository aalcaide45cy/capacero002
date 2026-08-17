import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

const CACHE_KEY_DATA = 'CAPACERO_VIDEOS_CACHE_V8';
const CACHE_KEY_DATE = 'CAPACERO_VIDEOS_CACHE_DATE_V8';

// Fechas de publicación reales de YouTube para ordenación cronológica exacta
const YOUTUBE_PUBLISH_DATES = {
  'D6zKWJAS6G0': '2026-08-17T11:00:06Z', // #8.1 Laminado (¡ÚLTIMO PUBLICADO!)
  'PCbMinEbUd4': '2026-08-13T10:45:06Z', // ¡Adiós a las costuras! (¡PENÚLTIMO!)
  'hZvIHMnxb3w': '2026-08-10T11:00:06Z', // #8 Movimiento Viewport
  '9otbdJPW1WA': '2026-08-06T10:30:25Z', // Fusion 360 Mesa
  '-uD_McDZ3Qk': '2026-08-03T11:00:06Z', // #7 Perfiles de Impresión
  'oDGtU6Z2VYM': '2026-07-31T10:30:33Z', // Ahorra la Mitad del Tiempo
  '-ZIU1pywxiQ': '2026-07-27T11:00:06Z', // #6 Perfiles vs Filamentos
  'OHLka3HAwn0': '2026-07-24T11:30:24Z', // Deja de Tirar Dinero (Gigantes/Warping)
  'fpvQEW7-9vo': '2026-07-22T11:00:16Z', // AlgoLaser Pixi 10W
  'DNouZLKOnpk': '2026-07-19T15:00:06Z', // #5 Boquillas High-Flow
  'w-DRE8UtD9s': '2026-07-15T09:05:11Z', // Textos Feos / Alta Resolución
  'zXLmMLsKLe4': '2026-07-13T11:00:06Z', // #4 Placa de Impresión
  'kYbpS-vwqJM': '2026-07-10T09:00:06Z', // Arreglar Modelos de IA
  'v3SFbjI8BEE': '2026-07-09T07:00:06Z', // ChatGPT con Bambu Studio
  'cfs1ctvUC-8': '2026-07-06T11:00:06Z', // #3 Primer Entorno
  'lP0FvQZ6uwk': '2026-07-05T04:30:06Z', // Ajustes SECRETOS
  'YUMNakCgUJs': '2026-06-29T11:00:06Z', // #2 Ecosistema Bambu Lab
  'hVCS-uyGflk': '2026-06-22T11:00:06Z', // #1 Instalación Bambu Studio
  'IFTgPS3a6v8': '2026-06-21T04:12:21Z', // #15 Textos y Modificadores
  '3BtSMuvl8BQ': '2026-06-20T10:58:48Z', // #14 Pintar Objetos
  'mzItWgN4a5c': '2026-06-20T10:58:42Z', // #13 Montaje de Objetos
  'ozlbqVkcinE': '2026-06-20T10:58:10Z', // #12 Grupos y Jerarquías
  'STc2U-cqecQ': '2026-06-20T10:58:04Z', // #11 No Hagas Esto al Cortar
  'RNWxu9tsB-k': '2026-06-20T10:58:01Z', // #10 Escala, rota y posiciona
  'sIzQPJSVdvo': '2026-06-20T10:57:52Z', // #9 Interfaz
  '1ol3BaUnJ8Y': '2026-05-23T01:00:06Z', // Madimaker
  'nPaTKz9Zqcs': '2026-03-15T09:39:01Z'  // AMS Multicolor
};

// Estadísticas de YouTube
const YOUTUBE_STATS_MAP = {
  "D6zKWJAS6G0": { "views": 43, "likes": 11, "comments": 2 },
  "PCbMinEbUd4": { "views": 2719, "likes": 179, "comments": 32 },
  "hZvIHMnxb3w": { "views": 215, "likes": 14, "comments": 3 },
  "9otbdJPW1WA": { "views": 222, "likes": 25, "comments": 5 },
  "-uD_McDZ3Qk": { "views": 352, "likes": 21, "comments": 4 },
  "oDGtU6Z2VYM": { "views": 2012, "likes": 125, "comments": 23 },
  "-ZIU1pywxiQ": { "views": 607, "likes": 50, "comments": 9 },
  "OHLka3HAwn0": { "views": 2720, "likes": 190, "comments": 34 },
  "fpvQEW7-9vo": { "views": 242, "likes": 10, "comments": 2 },
  "DNouZLKOnpk": { "views": 383, "likes": 22, "comments": 4 },
  "w-DRE8UtD9s": { "views": 6005, "likes": 366, "comments": 66 },
  "zXLmMLsKLe4": { "views": 486, "likes": 32, "comments": 6 },
  "kYbpS-vwqJM": { "views": 2309, "likes": 158, "comments": 28 },
  "v3SFbjI8BEE": { "views": 980, "likes": 69, "comments": 12 },
  "cfs1ctvUC-8": { "views": 388, "likes": 19, "comments": 3 },
  "lP0FvQZ6uwk": { "views": 6882, "likes": 401, "comments": 72 },
  "YUMNakCgUJs": { "views": 407, "likes": 26, "comments": 5 },
  "hVCS-uyGflk": { "views": 480, "likes": 22, "comments": 4 },
  "IFTgPS3a6v8": { "views": 150, "likes": 15, "comments": 3 },
  "3BtSMuvl8BQ": { "views": 180, "likes": 18, "comments": 3 },
  "mzItWgN4a5c": { "views": 140, "likes": 14, "comments": 2 },
  "ozlbqVkcinE": { "views": 130, "likes": 12, "comments": 2 },
  "STc2U-cqecQ": { "views": 160, "likes": 16, "comments": 3 },
  "RNWxu9tsB-k": { "views": 120, "likes": 11, "comments": 2 },
  "sIzQPJSVdvo": { "views": 110, "likes": 10, "comments": 2 },
  "1ol3BaUnJ8Y": { "views": 376, "likes": 23, "comments": 4 },
  "nPaTKz9Zqcs": { "views": 2729, "likes": 83, "comments": 15 }
};

/**
 * Convierte cualquier URL de Google Sheets a su enlace directo CSV público
 */
export function formatGoogleSheetUrl(rawUrl) {
  if (!rawUrl) return '';
  const clean = String(rawUrl).trim();
  if (!clean) return '';

  if (clean.includes('output=csv') || clean.includes('format=csv')) {
    return clean;
  }

  const sheetIdMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    const gidMatch = clean.match(/[#&?]gid=([0-9]+)/i);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
  }

  return clean;
}

/**
 * Extrae el ID del vídeo de YouTube desde cualquier formato de URL o texto.
 */
export function extractYouTubeId(url) {
  if (!url) return '';
  const clean = String(url).trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : '';
}

/**
 * Genera la miniatura de YouTube en alta definición
 */
export function getYouTubeThumbnail(videoId) {
  if (!videoId) return '/logo-capa-cero-small.png';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Limpia y normaliza los enlaces de descarga
 */
export function extractValidDownloads(row) {
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

/**
 * Normaliza un registro para asegurar consistencia
 */
export function normalizeVideoRow(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.youtubeId && raw.title && raw.category && raw.publishedAt && raw.views !== undefined) {
    return raw;
  }

  const title = String(raw.Titulo || raw.titulo || raw.Title || raw.title || '').trim();
  const rawUrl = String(raw.URL_Youtube || raw.url_youtube || raw.Youtube || raw.youtubeUrl || raw.URL || '').trim();
  const videoId = raw.youtubeId || extractYouTubeId(rawUrl);
  
  const category = String(raw.Categoria || raw.categoria || raw.Category || raw.category || 'Bambu Studio').trim();
  const rawDesc = String(raw.Descripcion || raw.descripcion || raw.Description || raw.description || '').trim();
  const description = (rawDesc && !rawDesc.toLowerCase().includes('vacio') && !rawDesc.toLowerCase().includes('vacío')) ? rawDesc : '';

  const rawTip = String(raw.Consejo_Clave || raw.consejo_clave || raw.Tip || raw.consejoClave || '').trim();
  const consejoClave = (rawTip && !rawTip.toLowerCase().includes('vacio') && !rawTip.toLowerCase().includes('vacío')) ? rawTip : '';

  const downloads = Array.isArray(raw.downloads) ? raw.downloads : extractValidDownloads(raw);

  const rawDestacado = String(raw.Destacado || raw.destacado || raw.isFeatured || '').trim().toUpperCase();
  const isFeatured = rawDestacado === 'SI' || rawDestacado === 'SÍ' || rawDestacado === 'TRUE' || rawDestacado === '1' || rawDestacado === 'YES' || raw.isFeatured === true;

  // Filtrar shorts verticales de YouTube
  const isShort = rawUrl.toLowerCase().includes('/shorts/') || 
                  title.toLowerCase().includes('#shorts') || 
                  title.toLowerCase().includes('#short');
  if (isShort) return null;

  const chapterMatch = title.match(/#(\d+(?:\.\d+)?)/);
  const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : (raw.chapterNumber || null);
  const publishedAt = raw.publishedAt || YOUTUBE_PUBLISH_DATES[videoId] || new Date(Date.now() + (index * 1000)).toISOString();
  
  const stats = YOUTUBE_STATS_MAP[videoId] || { views: raw.views || 100, likes: raw.likes || 10, comments: raw.comments || 2 };
  const views = raw.views !== undefined ? raw.views : stats.views;
  const likes = raw.likes !== undefined ? raw.likes : stats.likes;
  const comments = raw.comments !== undefined ? raw.comments : stats.comments;

  const popularityScore = raw.popularityScore !== undefined ? raw.popularityScore : ((likes * 10) + Math.round(views / 10) + (isFeatured ? 500 : 0));

  return {
    id: raw.id || `video-${index + 1}`,
    title: title || `Tutorial #${index + 1}`,
    youtubeUrl: rawUrl || `https://www.youtube.com/@CapaCero0`,
    youtubeId: videoId,
    thumbnail: getYouTubeThumbnail(videoId),
    category: category || 'Bambu Studio',
    description,
    consejoClave,
    downloads,
    isFeatured,
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

/**
 * Devuelve de forma instantánea y síncrona los datos pre-horneados
 */
export function getInitialV4Videos() {
  if (Array.isArray(fallbackVideos) && fallbackVideos.length > 0) {
    const list = fallbackVideos.map((v, idx) => normalizeVideoRow(v, idx)).filter(Boolean);
    list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return list;
  }
  return [];
}

/**
 * Carga vídeos implementando una estrategia de Caché Diario (SWR).
 */
export async function loadV4Videos(forceRefresh = false) {
  const today = new Date().toISOString().substring(0, 10);

  // Limpiar versiones anteriores del caché
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V4');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V5');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V6');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V7');
    } catch (e) {}
  }

  // 1. Comprobar caché local de hoy en localStorage
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cachedDate = localStorage.getItem(CACHE_KEY_DATE);
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      if (cachedDate === today && cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché local de vídeos:', e);
    }
  }

  // 2. Si no hay caché o ha caducado, consultar Google Sheets
  try {
    const targetUrl = DEFAULT_SHEET_CSV_URL;
    if (!targetUrl) {
      return getInitialV4Videos();
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      console.warn(`Error al conectar con Google Sheets (${response.status}), usando datos locales.`);
      return getInitialV4Videos();
    }

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) {
      return getInitialV4Videos();
    }

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.data && Array.isArray(results.data) && results.data.length > 0) {
              const formatted = results.data
                .filter(row => row && typeof row === 'object')
                .filter(row => {
                  const t = (row.Titulo || row.titulo || '').trim();
                  const u = (row.URL_Youtube || row.url_youtube || '').trim();
                  return t.length > 0 || u.length > 0;
                })
                .map((row, idx) => normalizeVideoRow(row, idx))
                .filter(Boolean);

              // Orden cronológico estricto (más nuevo publicado primero)
              formatted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

              if (formatted.length > 0) {
                try {
                  localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(formatted));
                  localStorage.setItem(CACHE_KEY_DATE, today);
                } catch (err) {}
                resolve(formatted);
              } else {
                resolve(getInitialV4Videos());
              }
            } else {
              resolve(getInitialV4Videos());
            }
          } catch (err) {
            console.error('Error parseando filas de Google Sheet:', err);
            resolve(getInitialV4Videos());
          }
        },
        error: (err) => {
          console.warn('Error en PapaParse:', err);
          resolve(getInitialV4Videos());
        }
      });
    });
  } catch (err) {
    console.warn('Fallo cargando vídeos V4 desde Google Sheets:', err);
    return getInitialV4Videos();
  }
}
