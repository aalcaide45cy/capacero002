import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

const CACHE_KEY_DATA = 'CAPACERO_VIDEOS_CACHE_V4';
const CACHE_KEY_DATE = 'CAPACERO_VIDEOS_CACHE_DATE_V4';

/**
 * Convierte cualquier URL de Google Sheets a su enlace directo CSV público
 */
export function formatGoogleSheetUrl(rawUrl) {
  if (!rawUrl) return '';
  const clean = String(rawUrl).trim();
  if (!clean) return '';

  // Si ya es un enlace pub?output=csv o export?format=csv
  if (clean.includes('output=csv') || clean.includes('format=csv')) {
    return clean;
  }

  // Si es un enlace normal de Google Sheets (ej: https://docs.google.com/spreadsheets/d/1abc.../edit#gid=0)
  const sheetIdMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    // Extraer gid si existe
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
  
  // Si ya es un ID de 11 caracteres alfanuméricos
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Regex para capturar ID en youtube.com/watch?v=, youtu.be/, shorts/, embed/
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
 * Limpia y normaliza los enlaces de descarga, descartando valores vacíos o nulos
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
 * Normaliza un registro para asegurar que los campos vacíos no generen etiquetas vacías
 */
export function normalizeVideoRow(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  // Si ya viene normalizado desde el build estático o caché
  if (raw.youtubeId && raw.title && raw.category) {
    return raw;
  }

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

  // Extraer número de capítulo si tiene formato #1, #2, #8.1, #15
  const chapterMatch = title.match(/#(\d+(?:\.\d+)?)/);
  const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : null;

  // Detección de vídeos populares / esenciales
  const popularKeywords = ['costura', 'tiempo', 'dinero', 'warping', 'calibrac', 'perfil', 'boquilla', 'algolaser', 'secretos', 'ams', 'resistencia', 'calidad', 'truco'];
  const tLower = title.toLowerCase();
  const isPopular = isFeatured || popularKeywords.some(kw => tLower.includes(kw));

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
    isPopular,
    hasDownloads: downloads.length > 0,
    hasTip: Boolean(consejoClave),
    hasDescription: Boolean(description)
  };
}

/**
 * Devuelve de forma instantánea y síncrona los datos pre-horneados
 * para SEO, Googlebot y el primer fotograma (0ms de latencia).
 */
export function getInitialV4Videos() {
  if (Array.isArray(fallbackVideos) && fallbackVideos.length > 0) {
    return fallbackVideos.map((v, idx) => normalizeVideoRow(v, idx)).filter(Boolean);
  }
  return [];
}

/**
 * Carga vídeos implementando una estrategia de Caché Diario (SWR).
 * Si el usuario ya entró hoy, devuelve el caché de localStorage al instante.
 * Si es el primer acceso del día o forzado, consulta Google Sheets y actualiza el caché.
 */
export async function loadV4Videos(forceRefresh = false) {
  const today = new Date().toISOString().substring(0, 10);

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
                .filter(Boolean)
                .reverse(); // Los nuevos añadidos al final de la hoja van primero en la web

              if (formatted.length > 0) {
                // Guardar en caché para el resto del día
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
