import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

const CACHE_KEY_DATA = 'CAPACERO_VIDEOS_CACHE_V17';
const CACHE_KEY_TIME = 'CAPACERO_VIDEOS_CACHE_TIME_V17';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché inteligente (SWR)

// Mapa de respaldo y estadísticas sincronizadas automáticamente desde videos_v4.json
export const fallbackMap = {};
export const YOUTUBE_STATS_MAP = {};
export const YOUTUBE_PUBLISH_DATES = {};

if (Array.isArray(fallbackVideos)) {
  fallbackVideos.forEach(v => {
    if (v && v.youtubeId) {
      fallbackMap[v.youtubeId] = v;
      YOUTUBE_STATS_MAP[v.youtubeId] = {
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0
      };
      if (v.publishedAt) {
        YOUTUBE_PUBLISH_DATES[v.youtubeId] = v.publishedAt;
      }
    }
  });
}

// Mapa de vídeos programados (SOLO se consideran programados si su fecha es futura)
export const SCHEDULED_VIDEOS_MAP = {
  // Las fechas anteriores ya han sido emitidas y pasan a publicadas
};

export const KNOWN_SHORTS = new Set([
  "C4tnZhcznnM", "cPEr2vj8OD8", "XIWrao4uNtU", "74U1uClr5LA",
  "px2XMValBno", "lUI7KoJg40w", "YK1OFjCqjGc", "gRmLRA6tpZw",
  "-Ed4ICmVaZ8", "z905Akv3KHQ", "8PjZFMLb_OM", "oYaSbq6Yjk8",
  "7YgDFlq6uBs", "CRDSsy35JBk", "jomBf3QELNc", "6UoWHgfVIE4",
  "t1PApMmnfSc", "Ry9kz9a1Vgk", "50DYyWhk2kc", "blaXzLq_X2Y",
  "B9mJiZsoMqM", "1hUob2u7IFk", "aFDIc0efS3A", "NLGoMeG6pyc",
  "FA_8foK968Y", "y6s0uvCUtj8", "8ti2uDDbpT8", "Thvfml_AI-Q",
  "Tf7Ons6irt0", "ushUk4xnMn8", "lrfuCbksV1E"
]);

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
 * Normaliza un registro asegurando consistencia y estadísticas reales
 */
export function normalizeVideoRow(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const title = String(raw.Titulo || raw.titulo || raw.Title || raw.title || '').trim();
  const rawUrl = String(raw.URL_Youtube || raw.url_youtube || raw.Youtube || raw.youtubeUrl || raw.URL || '').trim();
  const videoId = raw.youtubeId || extractYouTubeId(rawUrl);
  if (!videoId || KNOWN_SHORTS.has(videoId)) return null;

  const baked = fallbackMap[videoId] || null;
  const stats = YOUTUBE_STATS_MAP[videoId] || null;
  
  let category = String(raw.Categoria || raw.categoria || raw.Category || raw.category || baked?.category || 'Bambu Studio').trim();
  if (baked?.category && !category.toLowerCase().startsWith('curso')) {
    category = baked.category;
  }
  const rawDesc = String(raw.Descripcion || raw.descripcion || raw.Description || raw.description || '').trim();
  const description = (rawDesc && !rawDesc.toLowerCase().includes('vacio') && !rawDesc.toLowerCase().includes('vacío')) ? rawDesc : '';

  const rawTip = String(raw.Consejo_Clave || raw.consejo_clave || raw.Tip || raw.consejoClave || '').trim();
  const consejoClave = (rawTip && !rawTip.toLowerCase().includes('vacio') && !rawTip.toLowerCase().includes('vacío')) ? rawTip : '';

  const downloads = Array.isArray(raw.downloads) ? raw.downloads : extractValidDownloads(raw);

  const rawDestacado = String(raw.Destacado || raw.destacado || raw.isFeatured || '').trim().toUpperCase();
  const isFeatured = rawDestacado === 'SI' || rawDestacado === 'SÍ' || rawDestacado === 'TRUE' || rawDestacado === '1' || rawDestacado === 'YES' || raw.isFeatured === true;

  // Filtrar shorts verticales de YouTube
  const isShort = KNOWN_SHORTS.has(videoId) ||
                  rawUrl.toLowerCase().includes('/shorts/') || 
                  title.toLowerCase().includes('#shorts') || 
                  title.toLowerCase().includes('#short') ||
                  title.toLowerCase().includes('#reels') ||
                  title.toLowerCase().includes('#reel');
  if (isShort) return null;

  const chapterMatch = title.match(/#(\d+(?:\.\d+)?)/);
  const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : (raw.chapterNumber || baked?.chapterNumber || null);
  
  // Si el vídeo es nuevo y aún no está en el archivo pre-horneado, asignar fecha actual para que aparezca arriba
  const publishedAt = baked?.publishedAt || YOUTUBE_PUBLISH_DATES[videoId] || raw.publishedAt || new Date().toISOString();
  
  // 1. Visualizaciones (Prioridad: mayor valor entre Sheet, stats calculadas y pre-horneadas, nunca 0)
  let parsedViews = raw.views !== undefined ? parseInt(String(raw.views).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedViews)) {
    const rawViews = raw.Vistas || raw.vistas || raw.Visualizaciones || raw.visualizaciones || raw.Reproducciones || raw.reproducciones;
    if (rawViews !== undefined && rawViews !== '') {
      parsedViews = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10);
    }
  }
  const sheetViews = (!isNaN(parsedViews) && parsedViews > 0) ? parsedViews : 0;
  const statViews = (stats && stats.views > 0) ? stats.views : 0;
  const bakedViews = (baked && baked.views > 0) ? baked.views : 0;
  const views = Math.max(sheetViews, statViews, bakedViews, 0);

  // 2. Likes
  let parsedLikes = raw.likes !== undefined ? parseInt(String(raw.likes).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedLikes)) {
    const rawLikes = raw.Likes || raw.likes || raw.MeGusta || raw.me_gusta;
    if (rawLikes !== undefined && rawLikes !== '') {
      parsedLikes = parseInt(String(rawLikes).replace(/[^0-9]/g, ''), 10);
    }
  }
  const sheetLikes = (!isNaN(parsedLikes) && parsedLikes > 0) ? parsedLikes : 0;
  const statLikes = (stats && stats.likes > 0) ? stats.likes : 0;
  const bakedLikes = (baked && baked.likes > 0) ? baked.likes : 0;
  const likes = Math.max(sheetLikes, statLikes, bakedLikes, 0);

  // 3. Comentarios
  let parsedComments = raw.comments !== undefined ? parseInt(String(raw.comments).replace(/[^0-9]/g, ''), 10) : NaN;
  if (isNaN(parsedComments)) {
    const rawComments = raw.Comments || raw.comments || raw.Comentarios || raw.comentarios;
    if (rawComments !== undefined && rawComments !== '') {
      parsedComments = parseInt(String(rawComments).replace(/[^0-9]/g, ''), 10);
    }
  }
  const sheetComments = (!isNaN(parsedComments) && parsedComments > 0) ? parsedComments : 0;
  const statComments = (stats && stats.comments > 0) ? stats.comments : 0;
  const bakedComments = (baked && baked.comments > 0) ? baked.comments : 0;
  const comments = Math.max(sheetComments, statComments, bakedComments, 0);

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
  
  // Comprobación de fecha dinámica: SOLO es programado si su fecha de estreno es estrictamente futura
  const scheduledDateCandidate = scheduledConfig?.scheduledDate || raw.Fecha_Estreno || raw.fecha_estreno || (isStateScheduled ? publishedAt : null);
  const scheduledTimestamp = scheduledDateCandidate ? new Date(scheduledDateCandidate).getTime() : NaN;
  const isFuture = !isNaN(scheduledTimestamp) && scheduledTimestamp > Date.now();
  
  const isScheduled = isFuture && (Boolean(scheduledConfig?.isScheduled) || isStateScheduled || Boolean(raw.isScheduled));
  
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
  const thumbnail = (customThumb && customThumb.startsWith('http')) ? customThumb : (baked?.thumbnail || getYouTubeThumbnail(videoId));

  return {
    id: raw.id || baked?.id || `video-${index + 1}`,
    title: title || `Tutorial #${index + 1}`,
    youtubeUrl: rawUrl || `https://www.youtube.com/@CapaCero0`,
    youtubeId: videoId,
    thumbnail,
    category: category || 'Bambu Studio',
    description: description || baked?.description || '',
    consejoClave: consejoClave || baked?.consejoClave || '',
    downloads: (downloads && downloads.length > 0) ? downloads : (baked?.downloads || []),
    isFeatured,
    isScheduled,
    scheduledDateFormatted,
    chapterNumber,
    popularityScore,
    publishedAt,
    views,
    likes,
    comments,
    hasDownloads: (downloads && downloads.length > 0) || Boolean(baked?.downloads?.length),
    hasTip: Boolean(consejoClave || baked?.consejoClave),
    hasDescription: Boolean(description || baked?.description)
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
 * Carga vídeos implementando una estrategia de Caché Inteligente (SWR).
 */
export async function loadV4Videos(forceRefresh = false) {
  const now = Date.now();

  // Limpiar versiones anteriores de caché para forzar datos actualizados
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V13');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V13');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V14');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V14');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V15');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V15');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_V16');
      localStorage.removeItem('CAPACERO_VIDEOS_CACHE_TIME_V16');
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
              const videoMap = new Map();

              results.data
                .filter(row => row && typeof row === 'object')
                .filter(row => {
                  const t = (row.Titulo || row.titulo || '').trim();
                  const u = (row.URL_Youtube || row.url_youtube || '').trim();
                  return t.length > 0 || u.length > 0;
                })
                .forEach((row, idx) => {
                  const norm = normalizeVideoRow(row, idx);
                  if (!norm || !norm.youtubeId) return;

                  if (!videoMap.has(norm.youtubeId)) {
                    videoMap.set(norm.youtubeId, norm);
                  } else {
                    // Fila duplicada en Google Sheets: combinar inteligentemente
                    const prev = videoMap.get(norm.youtubeId);
                    videoMap.set(norm.youtubeId, {
                      ...prev,
                      ...norm,
                      downloads: (norm.downloads && norm.downloads.length > 0) ? norm.downloads : prev.downloads,
                      description: norm.description || prev.description,
                      consejoClave: norm.consejoClave || prev.consejoClave,
                      views: Math.max(prev.views || 0, norm.views || 0),
                      likes: Math.max(prev.likes || 0, norm.likes || 0),
                      comments: Math.max(prev.comments || 0, norm.comments || 0),
                      popularityScore: Math.max(prev.popularityScore || 0, norm.popularityScore || 0)
                    });
                  }
                });

              const formatted = Array.from(videoMap.values());

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
