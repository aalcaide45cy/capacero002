import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

const CACHE_KEY_DATA = 'CAPACERO_VIDEOS_CACHE_V16';
const CACHE_KEY_TIME = 'CAPACERO_VIDEOS_CACHE_TIME_V16';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché inteligente (SWR)

// Mapa de vídeos programados con sus fechas de estreno reales de YouTube (RNWxu9tsB-k y STc2U-cqecQ ya están estrenados)
export const SCHEDULED_VIDEOS_MAP = {
  'ozlbqVkcinE': { isScheduled: true, scheduledDate: '2026-09-14T18:00:00Z', label: 'Estreno el día 14 de septiembre' },
  'mzItWgN4a5c': { isScheduled: true, scheduledDate: '2026-09-21T18:00:00Z', label: 'Estreno el día 21 de septiembre' },
  '3BtSMuvl8BQ': { isScheduled: true, scheduledDate: '2026-09-28T18:00:00Z', label: 'Estreno el día 28 de septiembre' },
  'IFTgPS3a6v8': { isScheduled: true, scheduledDate: '2026-10-05T18:00:00Z', label: 'Estreno el día 5 de octubre' }
};

// Fechas de publicación reales de YouTube para ordenación cronológica exacta
const YOUTUBE_PUBLISH_DATES = {
  'EdGZKop2NcE': '2026-09-08T18:00:00Z', // Bocetos Fusion 360 (PUBLICADO HOY)
  'STc2U-cqecQ': '2026-09-07T18:00:00Z', // #11 No Hagas Esto al Cortar (PUBLICADO)
  'xf4K9wCJzdU': '2026-09-01T17:30:06Z', // Logotipos en Fusion 360 (PUBLICADO)
  'RNWxu9tsB-k': '2026-08-31T18:00:00Z', // #10 Escala, rota y posiciona (PUBLICADO)
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
  'nPaTKz9Zqcs': '2026-03-15T16:39:01Z', // AMS Multicolor
  'IFTgPS3a6v8': '2026-10-05T18:00:00Z', // #15 Textos y Modificadores (PROGRAMADO)
  '3BtSMuvl8BQ': '2026-09-28T18:00:00Z', // #14 Pintar Objetos (PROGRAMADO)
  'mzItWgN4a5c': '2026-09-21T18:00:00Z', // #13 Montaje de Objetos (PROGRAMADO)
  'ozlbqVkcinE': '2026-09-14T18:00:00Z'  // #12 Grupos y Jerarquías (PROGRAMADO)
};

// Estadísticas de YouTube reales y actualizadas en directo
export const YOUTUBE_STATS_MAP = {
  "EdGZKop2NcE": { "views": 32, "likes": 12, "comments": 2 },
  "STc2U-cqecQ": { "views": 745, "likes": 24, "comments": 4 },
  "xf4K9wCJzdU": { "views": 791, "likes": 13, "comments": 5 },
  "RNWxu9tsB-k": { "views": 553, "likes": 15, "comments": 2 },
  "utIYIcUG0tM": { "views": 9429, "likes": 210, "comments": 9 },
  "sIzQPJSVdvo": { "views": 450, "likes": 29, "comments": 4 },
  "D6zKWJAS6G0": { "views": 834, "likes": 48, "comments": 11 },
  "PCbMinEbUd4": { "views": 5374, "likes": 283, "comments": 24 },
  "hZvIHMnxb3w": { "views": 311, "likes": 18, "comments": 5 },
  "9otbdJPW1WA": { "views": 363, "likes": 29, "comments": 17 },
  "-uD_McDZ3Qk": { "views": 434, "likes": 24, "comments": 9 },
  "oDGtU6Z2VYM": { "views": 2229, "likes": 134, "comments": 27 },
  "-ZIU1pywxiQ": { "views": 870, "likes": 59, "comments": 9 },
  "OHLka3HAwn0": { "views": 2977, "likes": 199, "comments": 19 },
  "fpvQEW7-9vo": { "views": 274, "likes": 10, "comments": 0 },
  "DNouZLKOnpk": { "views": 451, "likes": 25, "comments": 5 },
  "w-DRE8UtD9s": { "views": 6324, "likes": 379, "comments": 17 },
  "zXLmMLsKLe4": { "views": 614, "likes": 35, "comments": 7 },
  "kYbpS-vwqJM": { "views": 2510, "likes": 167, "comments": 16 },
  "v3SFbjI8BEE": { "views": 1329, "likes": 78, "comments": 14 },
  "cfs1ctvUC-8": { "views": 464, "likes": 22, "comments": 5 },
  "lP0FvQZ6uwk": { "views": 7571, "likes": 424, "comments": 54 },
  "YUMNakCgUJs": { "views": 526, "likes": 31, "comments": 6 },
  "hVCS-uyGflk": { "views": 711, "likes": 29, "comments": 6 },
  "1ol3BaUnJ8Y": { "views": 422, "likes": 24, "comments": 7 },
  "nPaTKz9Zqcs": { "views": 3371, "likes": 90, "comments": 14 },
  "3BtSMuvl8BQ": { "views": 2, "likes": 3, "comments": 0 },
  "ozlbqVkcinE": { "views": 0, "likes": 1, "comments": 4 },
  "mzItWgN4a5c": { "views": 0, "likes": 2, "comments": 0 },
  "IFTgPS3a6v8": { "views": 0, "likes": 0, "comments": 0 }
};

// Mapa de respaldo pre-horneado desde fallbackVideos
const fallbackMap = {};
if (Array.isArray(fallbackVideos)) {
  fallbackVideos.forEach(v => {
    if (v && v.youtubeId) fallbackMap[v.youtubeId] = v;
  });
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
  const publishedAt = YOUTUBE_PUBLISH_DATES[videoId] || raw.publishedAt || new Date(Date.now() + (index * 1000)).toISOString();
  
  const stats = YOUTUBE_STATS_MAP[videoId] || { views: 0, likes: 0, comments: 0 };
  const baked = fallbackMap[videoId] || null;
  
  let parsedViews = raw.views !== undefined ? parseInt(String(raw.views).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedViews)) {
    const rawViews = raw.Vistas || raw.vistas || raw.Visualizaciones || raw.visualizaciones || raw.Reproducciones || raw.reproducciones;
    if (rawViews !== undefined && rawViews !== '') {
      parsedViews = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10);
    }
  }
  const statViews = stats.views || 0;
  const bakedViews = baked?.views || 0;
  const sheetViews = (!isNaN(parsedViews) && parsedViews > 0) ? parsedViews : 0;
  const views = Math.max(statViews, bakedViews, sheetViews);

  let parsedLikes = raw.likes !== undefined ? parseInt(String(raw.likes).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedLikes)) {
    const rawLikes = raw.Likes || raw.likes || raw.MeGusta || raw.me_gusta;
    if (rawLikes !== undefined && rawLikes !== '') {
      parsedLikes = parseInt(String(rawLikes).replace(/[^0-9]/g, ''), 10);
    }
  }
  const statLikes = stats.likes || 0;
  const bakedLikes = baked?.likes || 0;
  const sheetLikes = (!isNaN(parsedLikes) && parsedLikes > 0) ? parsedLikes : 0;
  const likes = Math.max(statLikes, bakedLikes, sheetLikes);

  let parsedComments = raw.comments !== undefined ? parseInt(String(raw.comments).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedComments)) {
    const rawComments = raw.Comments || raw.comments || raw.Comentarios || raw.comentarios;
    if (rawComments !== undefined && rawComments !== '') {
      parsedComments = parseInt(String(rawComments).replace(/[^0-9]/g, ''), 10);
    }
  }
  const statComments = stats.comments || 0;
  const bakedComments = baked?.comments || 0;
  const sheetComments = (!isNaN(parsedComments) && parsedComments > 0) ? parsedComments : 0;
  const comments = Math.max(statComments, bakedComments, sheetComments);

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

  const isStateScheduled = /programad|estreno|proximamente/i.test(rawScheduled) || /programad|estreno/i.test(rawDestacado);
  
  // Comprobación de fecha dinámica
  const scheduledDateCandidate = scheduledConfig?.scheduledDate || raw.Fecha_Estreno || raw.fecha_estreno || null;
  const scheduledTimestamp = scheduledDateCandidate ? new Date(scheduledDateCandidate).getTime() : NaN;
  const isFuture = !isNaN(scheduledTimestamp) && scheduledTimestamp > Date.now();
  
  const isScheduled = Boolean(scheduledConfig?.isScheduled) || isStateScheduled || Boolean(raw.isScheduled) || isFuture;
  
  let scheduledDateFormatted = null;
  if (isScheduled) {
    if (scheduledConfig?.label) {
      scheduledDateFormatted = scheduledConfig.label;
    } else if (scheduledDateCandidate && isFuture) {
      scheduledDateFormatted = formatScheduledDate(scheduledDateCandidate);
    } else {
      scheduledDateFormatted = 'Estreno Próximamente';
    }
  }

  const popularityScore = raw.popularityScore !== undefined ? raw.popularityScore : ((likes * 10) + Math.round(views / 10) + (isFeatured ? 500 : 0));

  const customThumb = String(raw.Miniatura || raw.miniatura || raw.Thumbnail || raw.thumbnail || '').trim();
  const thumbnail = (customThumb && customThumb.startsWith('http')) ? customThumb : getYouTubeThumbnail(videoId);

  return {
    id: raw.id || `video-${index + 1}`,
    title: title || `Tutorial #${index + 1}`,
    youtubeUrl: rawUrl || `https://www.youtube.com/@CapaCero0`,
    youtubeId: videoId,
    thumbnail,
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

export function formatScheduledDate(rawDate) {
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
  const now = Date.now();

  // Limpiar versiones anteriores de caché para evitar que persistan estadísticas obsoletas
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V13');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V13');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V14');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V14');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V15');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V15');
    } catch (e) {}
  }

  // 1. Comprobar caché local válido de los últimos 5 minutos
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cachedTimeStr = localStorage.getItem(CACHE_KEY_TIME);
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      const cachedTime = cachedTimeStr ? parseInt(cachedTimeStr, 10) : 0;

      if (cachedData && cachedTime && (now - cachedTime < CACHE_TTL_MS)) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-normalizar para verificar si algún vídeo programado ya se estrenó
          const refreshed = parsed.map((v, idx) => normalizeVideoRow(v, idx)).filter(Boolean);
          refreshed.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          return refreshed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché local de vídeos:', e);
    }
  }

  // 2. Si no hay caché o pasaron más de 5 minutos, consultar Google Sheets
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
                  localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
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
