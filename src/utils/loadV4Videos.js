import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

// URL de tu Google Sheet publicado como CSV.
// Puedes cambiarla aquí o pasarla dinámicamente.
export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_EXAMPLE_REPLACE_ME/pub?output=csv";

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
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Limpia y normaliza los enlaces de descarga, descartando valores vacíos o nulos
 */
export function extractValidDownloads(row) {
  const candidates = [
    row.Enlace_Descarga || row.enlace_descarga || row['Enlace de Descarga'],
    row.Enlace_Descarga2 || row.enlace_descarga2 || row['Enlace de Descarga 2'],
    row.Enlace_Descarga3 || row.enlace_descarga3 || row['Enlace de Descarga 3']
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
function normalizeVideoRow(raw, index) {
  const title = String(raw.Titulo || raw.titulo || raw.Title || '').trim();
  const rawUrl = String(raw.URL_Youtube || raw.url_youtube || raw.Youtube || '').trim();
  const videoId = extractYouTubeId(rawUrl);
  
  const category = String(raw.Categoria || raw.categoria || raw.Category || 'General').trim();
  const rawDesc = String(raw.Descripcion || raw.descripcion || raw.Description || '').trim();
  const description = (rawDesc && !rawDesc.toLowerCase().includes('vacio') && !rawDesc.toLowerCase().includes('vacío')) ? rawDesc : '';

  const rawTip = String(raw.Consejo_Clave || raw.consejo_clave || raw.Tip || '').trim();
  const consejoClave = (rawTip && !rawTip.toLowerCase().includes('vacio') && !rawTip.toLowerCase().includes('vacío')) ? rawTip : '';

  const downloads = extractValidDownloads(raw);

  const rawDestacado = String(raw.Destacado || raw.destacado || '').trim().toUpperCase();
  const isFeatured = rawDestacado === 'SI' || rawDestacado === 'SÍ' || rawDestacado === 'TRUE' || rawDestacado === '1' || rawDestacado === 'YES';

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
    hasDownloads: downloads.length > 0,
    hasTip: Boolean(consejoClave),
    hasDescription: Boolean(description)
  };
}

/**
 * Carga vídeos desde la URL de Google Sheets en CSV con fallback al archivo local
 */
export async function loadV4Videos(customCsvUrl = null) {
  const targetUrl = customCsvUrl || localStorage.getItem('capacero_v4_sheet_url') || DEFAULT_SHEET_CSV_URL;

  // Si la URL es la de ejemplo o no es válida, devolvemos el fallback directamente
  if (!targetUrl || targetUrl.includes('EXAMPLE_REPLACE_ME')) {
    return fallbackVideos.map(normalizeVideoRow);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const formatted = results.data
              .filter(row => row.Titulo || row.titulo || row.URL_Youtube || row.url_youtube)
              .map(normalizeVideoRow);
            resolve(formatted);
          } else {
            resolve(fallbackVideos.map(normalizeVideoRow));
          }
        },
        error: () => {
          resolve(fallbackVideos.map(normalizeVideoRow));
        }
      });
    });
  } catch (err) {
    console.warn('No se pudo cargar el Google Sheet en vivo, usando datos de respaldo:', err);
    return fallbackVideos.map(normalizeVideoRow);
  }
}
