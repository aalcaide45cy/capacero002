import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'videos_v4.json');

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

// Cargar vídeos existentes para preservar estadísticas si la API de YouTube no responde temporalmente
const existingVideosMap = {};
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    if (Array.isArray(existingData)) {
      existingData.forEach(v => {
        if (v && v.youtubeId) existingVideosMap[v.youtubeId] = v;
      });
    }
  } catch (e) {
    console.warn('Advertencia al leer archivo previo de vídeos:', e.message);
  }
}

// Mapa de vídeos programados (SOLO si la fecha es futura)
const SCHEDULED_VIDEOS_MAP = {
  // Los estrenos de septiembre y 5 de octubre ya fueron emitidos
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
    const payload = {
      videoId: videoId,
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "es",
          gl: "ES"
        }
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    // 1. Consultar endpoint Player para visualizaciones y fecha exacta
    const pRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let views = null;
    let publishedAt = null;

    if (pRes.ok) {
      const pData = await pRes.json();
      const rawViews = pData.videoDetails?.viewCount;
      if (rawViews !== undefined && rawViews !== null) {
        views = parseInt(rawViews, 10);
      }
      const rawDate = pData.microformat?.playerMicroformatRenderer?.publishDate;
      if (rawDate) {
        publishedAt = new Date(rawDate).toISOString();
      }
    }

    // 2. Consultar endpoint Next para Likes y Comentarios en vivo
    const nRes = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let likes = null;
    let comments = null;

    if (nRes.ok) {
      const nData = await nRes.json();
      const nStr = JSON.stringify(nData);

      // Extraer Likes del botón con iconName "LIKE"
      const mLike = nStr.match(/"iconName":"LIKE","title":"([\d.,]+)"/);
      if (mLike) {
        likes = parseInt(mLike[1].replace(/[^0-9]/g, ""), 10) || 0;
      }

      // Extraer Comentarios del panel de comentarios
      if (nData.engagementPanels) {
        for (const ep of nData.engagementPanels) {
          const panel = ep.engagementPanelSectionListRenderer;
          if (panel && panel.panelIdentifier === "engagement-panel-comments-section") {
            const text = panel.header?.engagementPanelTitleHeaderRenderer?.contextualInfo?.runs?.[0]?.text;
            if (text) {
              comments = parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
            } else {
              comments = 0;
            }
          }
        }
      }
      if (comments === null) {
        comments = 0;
      }
    }

    clearTimeout(timeout);

    return { views, likes, comments, publishedAt };
  } catch (e) {
    return null;
  }
}

function normalizeVideoRow(raw, index = 0, liveStats = null, existing = null) {
  if (!raw || (typeof raw !== 'object' && !raw)) return null;

  const title = String(raw.Titulo || raw.titulo || raw.Title || '').trim();
  const rawUrl = String(raw.URL_Youtube || raw.url_youtube || raw.Youtube || raw.URL || '').trim();
  const videoId = extractYouTubeId(rawUrl);
  if (!videoId) return null;
  
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
  const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : (existing?.chapterNumber || null);
  
  const publishedAt = liveStats?.publishedAt || existing?.publishedAt || new Date().toISOString();
  
  // Extraer estadísticas asegurando que nunca un 0 sobreescriba un número real
  const sheetViews = (raw.views || raw.Vistas || raw.vistas) ? parseInt(String(raw.views || raw.Vistas || raw.vistas).replace(/[^0-9]/g, ''), 10) : 0;
  const views = Math.max(liveStats?.views ?? 0, existing?.views ?? 0, sheetViews, 0);

  const sheetLikes = (raw.likes || raw.Likes || raw.likes) ? parseInt(String(raw.likes || raw.Likes || raw.likes).replace(/[^0-9]/g, ''), 10) : 0;
  const likes = Math.max(liveStats?.likes ?? 0, existing?.likes ?? 0, sheetLikes, 0);

  const sheetComments = (raw.comments || raw.Comments || raw.comments) ? parseInt(String(raw.comments || raw.Comments || raw.comments).replace(/[^0-9]/g, ''), 10) : 0;
  const comments = Math.max(liveStats?.comments ?? 0, existing?.comments ?? 0, sheetComments, 0);
  
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
    description: description || existing?.description || '',
    consejoClave: consejoClave || existing?.consejoClave || '',
    downloads: (downloads && downloads.length > 0) ? downloads : (existing?.downloads || []),
    isFeatured,
    isScheduled,
    scheduledDateFormatted,
    chapterNumber,
    popularityScore,
    publishedAt,
    views,
    likes,
    comments,
    hasDownloads: downloads.length > 0 || Boolean(existing?.downloads?.length),
    hasTip: Boolean(consejoClave || existing?.consejoClave),
    hasDescription: Boolean(description || existing?.description)
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

        console.log(`📊 Procesando ${rows.length} filas de la hoja y obteniendo estadísticas en tiempo real...`);

        // Mapa para deduplicar por YouTube ID (conservando el contenido más completo)
        const videosMap = new Map();

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rawUrl = String(row.URL_Youtube || row.url_youtube || row.Youtube || row.URL || '').trim();
          const videoId = extractYouTubeId(rawUrl);
          if (!videoId) continue;

          let liveStats = null;
          // Solo consultar YouTube si no lo hemos consultado ya en esta corrida
          if (!videosMap.has(videoId)) {
            liveStats = await fetchLiveYouTubeStats(videoId);
          }

          const existing = existingVideosMap[videoId] || null;
          const normalized = normalizeVideoRow(row, idx, liveStats, existing);
          if (!normalized) continue;

          if (!videosMap.has(videoId)) {
            videosMap.set(videoId, normalized);
          } else {
            // Fila duplicada en Google Sheets: fusionar inteligentemente
            const prev = videosMap.get(videoId);
            videosMap.set(videoId, {
              ...prev,
              ...normalized,
              downloads: (normalized.downloads && normalized.downloads.length > 0) ? normalized.downloads : prev.downloads,
              description: normalized.description || prev.description,
              consejoClave: normalized.consejoClave || prev.consejoClave,
              views: Math.max(prev.views || 0, normalized.views || 0),
              likes: Math.max(prev.likes || 0, normalized.likes || 0),
              comments: Math.max(prev.comments || 0, normalized.comments || 0),
              popularityScore: Math.max(prev.popularityScore || 0, normalized.popularityScore || 0)
            });
          }
        }

        const validVideos = Array.from(videosMap.values());

        // Orden cronológico estricto (más nuevo publicado primero)
        validVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validVideos, null, 2));
        console.log(`✨ Generados ${validVideos.length} vídeos ÚNICOS con estadísticas reales de YouTube en src/data/videos_v4.json`);
        console.log(`🎬 Vídeo #1 (Hero y primero de lista): ${validVideos[0]?.title} (${validVideos[0]?.views} visualizaciones | ${validVideos[0]?.likes} likes | ${validVideos[0]?.comments} comentarios)`);
        console.log(`🎬 Vídeo #2: ${validVideos[1]?.title} (${validVideos[1]?.views} visualizaciones | ${validVideos[1]?.likes} likes | ${validVideos[1]?.comments} comentarios)`);
        console.log(`🎬 Vídeo #3: ${validVideos[2]?.title} (${validVideos[2]?.views} visualizaciones | ${validVideos[2]?.likes} likes | ${validVideos[2]?.comments} comentarios)\n`);
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
