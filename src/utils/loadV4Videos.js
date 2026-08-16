import Papa from 'papaparse';
import fallbackVideos from '../data/videos_v4.json';

export const DEFAULT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

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
  try {
    const rawTarget = customCsvUrl || localStorage.getItem('capacero_v4_sheet_url') || '';
    const targetUrl = formatGoogleSheetUrl(rawTarget);

    // Si no hay URL configurada, usar directamente los datos de respaldo locales
    if (!targetUrl || targetUrl.includes('EXAMPLE_REPLACE_ME')) {
      return (fallbackVideos || []).map(normalizeVideoRow).filter(Boolean);
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      console.warn(`Error al conectar con Google Sheets (${response.status}), usando datos locales.`);
      return (fallbackVideos || []).map(normalizeVideoRow).filter(Boolean);
    }

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) {
      return (fallbackVideos || []).map(normalizeVideoRow).filter(Boolean);
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
                .map(normalizeVideoRow)
                .filter(Boolean);

              // Si la hoja tiene filas válidas, usarlas. Si estaba vacía, usar datos de respaldo.
              if (formatted.length > 0) {
                resolve(formatted);
              } else {
                resolve((fallbackVideos || []).map(normalizeVideoRow).filter(Boolean));
              }
            } else {
              resolve((fallbackVideos || []).map(normalizeVideoRow).filter(Boolean));
            }
          } catch (err) {
            console.error('Error parseando filas de Google Sheet:', err);
            resolve((fallbackVideos || []).map(normalizeVideoRow).filter(Boolean));
          }
        },
        error: (err) => {
          console.warn('Error en PapaParse:', err);
          resolve((fallbackVideos || []).map(normalizeVideoRow).filter(Boolean));
        }
      });
    });
  } catch (err) {
    console.warn('Fallo cargando vídeos V4:', err);
    return (fallbackVideos || []).map(normalizeVideoRow).filter(Boolean);
  }
}
