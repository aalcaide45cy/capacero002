import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'videos_v4.json');
const SLUGS_FILE = path.join(DATA_DIR, 'slugs.json');

function generateSlug(title) {
  if (!title) return 'video';
  let s = String(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // sin tildes
    .replace(/#\d+/g, '') // sin #número
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // guiones
    .replace(/^-+|-+$/g, ''); // recortar guiones
  if (s.length > 70) {
    s = s.slice(0, 70).replace(/-[^-]*$/, '');
  }
  return s || 'video';
}

function updateSlugsMap(videos) {
  let slugsMap = {};
  if (fs.existsSync(SLUGS_FILE)) {
    try {
      slugsMap = JSON.parse(fs.readFileSync(SLUGS_FILE, 'utf8'));
    } catch {
      slugsMap = {};
    }
  }

  const usedSlugs = new Set(Object.values(slugsMap));
  let changed = false;

  for (const v of videos) {
    if (!v.youtubeId) continue;
    // Si ya tiene slug asignado, NO cambia nunca (regla de estabilidad)
    if (!slugsMap[v.youtubeId]) {
      let candidate = generateSlug(v.title);
      let base = candidate;
      let counter = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${counter++}`;
      }
      usedSlugs.add(candidate);
      slugsMap[v.youtubeId] = candidate;
      changed = true;
    }
    v.slug = slugsMap[v.youtubeId];
  }

  if (changed || !fs.existsSync(SLUGS_FILE)) {
    fs.writeFileSync(SLUGS_FILE, JSON.stringify(slugsMap, null, 2), 'utf8');
    console.log(`🔗 Guardado mapa de slugs estables en src/data/slugs.json (${Object.keys(slugsMap).length} slugs)`);
  } else {
    for (const v of videos) {
      if (v.youtubeId && slugsMap[v.youtubeId]) {
        v.slug = slugsMap[v.youtubeId];
      }
    }
  }

  return slugsMap;
}

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

async function fetchChannelPlaylists(apiKey) {
  if (!apiKey) return new Map();
  try {
    console.log('📋 Buscando playlists del canal con YouTube API...');
    const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=CapaCero0&key=${apiKey}`);
    if (!chanRes.ok) {
      console.warn(`⚠️ Error al consultar canal en YouTube API: HTTP ${chanRes.status}`);
      return new Map();
    }
    const chanData = await chanRes.json();
    const channelId = chanData.items?.[0]?.id;
    if (!channelId) {
      console.warn('⚠️ No se encontró el canal para el handle CapaCero0');
      return new Map();
    }

    let playlists = [];
    let pageToken = '';
    do {
      const plUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`;
      const plRes = await fetch(plUrl);
      if (!plRes.ok) break;
      const plData = await plRes.json();
      if (plData.items) {
        playlists.push(...plData.items);
      }
      pageToken = plData.nextPageToken || '';
    } while (pageToken);

    console.log(`📑 Encontradas ${playlists.length} playlists públicas.`);

    const videoPlaylistsMap = new Map();
    for (const pl of playlists) {
      const playlistId = pl.id;
      const playlistTitle = pl.snippet?.title || '';
      const itemCount = pl.contentDetails?.itemCount || 0;

      let itemPageToken = '';
      do {
        const itemUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50${itemPageToken ? `&pageToken=${itemPageToken}` : ''}&key=${apiKey}`;
        const itemRes = await fetch(itemUrl);
        if (!itemRes.ok) break;
        const itemData = await itemRes.json();
        if (itemData.items) {
          for (const item of itemData.items) {
            const vid = item.contentDetails?.videoId;
            if (vid) {
              if (!videoPlaylistsMap.has(vid)) {
                videoPlaylistsMap.set(vid, []);
              }
              videoPlaylistsMap.get(vid).push({
                playlistId,
                playlistTitle,
                itemCount
              });
            }
          }
        }
        itemPageToken = itemData.nextPageToken || '';
      } while (itemPageToken);
    }

    const bestPlaylistMap = new Map();
    for (const [vid, plList] of videoPlaylistsMap.entries()) {
      plList.sort((a, b) => b.itemCount - a.itemCount);
      bestPlaylistMap.set(vid, plList[0]);
    }

    console.log(`✅ Asignadas playlists a ${bestPlaylistMap.size} vídeos.`);
    return bestPlaylistMap;
  } catch (err) {
    console.warn('⚠️ Error obteniendo playlists de YouTube:', err.message);
    return new Map();
  }
}

function parseISO8601Duration(isoDuration) {
  if (!isoDuration) return null;
  const match = String(isoDuration).match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const days = parseInt(match[1] || 0, 10);
  const hours = parseInt(match[2] || 0, 10) + days * 24;
  const minutes = parseInt(match[3] || 0, 10);
  const seconds = parseInt(match[4] || 0, 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSecondsDuration(sec) {
  const total = parseInt(sec, 10);
  if (isNaN(total) || total <= 0) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function fetchYouTubeApiStatsBatch(videoIds, apiKey) {
  if (!apiKey || !videoIds || videoIds.length === 0) return new Map();
  const resultMap = new Map();
  try {
    console.log(`📡 Consultando YouTube Data API v3 oficial para ${videoIds.length} vídeos...`);
    const chunkSize = 50;
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails,liveStreamingDetails&id=${chunk.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`⚠️ Error en YouTube API v3 videos.list (HTTP ${res.status})`);
        return resultMap;
      }
      const data = await res.json();
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const vid = item.id;
          const stats = item.statistics || {};
          const snippet = item.snippet || {};
          const content = item.contentDetails || {};
          const live = item.liveStreamingDetails || {};

          const isUpcoming = snippet.liveBroadcastContent === 'upcoming' || Boolean(live.scheduledStartTime && new Date(live.scheduledStartTime).getTime() > Date.now());
          const scheduledDate = live.scheduledStartTime || null;
          const duration = parseISO8601Duration(content.duration);

          resultMap.set(vid, {
            views: stats.viewCount ? parseInt(stats.viewCount, 10) : 0,
            likes: stats.likeCount ? parseInt(stats.likeCount, 10) : 0,
            comments: stats.commentCount ? parseInt(stats.commentCount, 10) : 0,
            publishedAt: snippet.publishedAt || null,
            duration,
            isScheduled: isUpcoming,
            scheduledDate,
            title: snippet.title || null,
            description: snippet.description || null
          });
        }
      }
    }
    console.log(`✅ Obtenidas estadísticas de la API oficial para ${resultMap.size} vídeos.`);
    return resultMap;
  } catch (err) {
    console.warn('⚠️ Error al consultar YouTube Data API v3:', err.message);
    return resultMap;
  }
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

    // 1. Consultar endpoint Player para visualizaciones, duración y fecha exacta
    const pRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let views = null;
    let publishedAt = null;
    let lengthSeconds = null;

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
      const rawLength = pData.videoDetails?.lengthSeconds;
      if (rawLength) {
        lengthSeconds = parseInt(rawLength, 10);
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

    return { views, likes, comments, publishedAt, lengthSeconds };
  } catch (e) {
    return null;
  }
}

function normalizeVideoRow(raw, index = 0, apiStats = null, liveStats = null, existing = null, playlistInfo = null) {
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
  
  const publishedAt = apiStats?.publishedAt || liveStats?.publishedAt || existing?.publishedAt || new Date().toISOString();
  const duration = apiStats?.duration || (liveStats?.lengthSeconds ? formatSecondsDuration(liveStats.lengthSeconds) : null) || existing?.duration || null;
  
  // Extraer estadísticas asegurando que nunca un 0 sobreescriba un número real
  const sheetViews = (raw.views || raw.Vistas || raw.vistas) ? parseInt(String(raw.views || raw.Vistas || raw.vistas).replace(/[^0-9]/g, ''), 10) : 0;
  const views = Math.max(apiStats?.views ?? 0, liveStats?.views ?? 0, existing?.views ?? 0, sheetViews, 0);

  const sheetLikes = (raw.likes || raw.Likes || raw.likes) ? parseInt(String(raw.likes || raw.Likes || raw.likes).replace(/[^0-9]/g, ''), 10) : 0;
  const likes = Math.max(apiStats?.likes ?? 0, liveStats?.likes ?? 0, existing?.likes ?? 0, sheetLikes, 0);

  const sheetComments = (raw.comments || raw.Comments || raw.comments) ? parseInt(String(raw.comments || raw.Comments || raw.comments).replace(/[^0-9]/g, ''), 10) : 0;
  const comments = Math.max(apiStats?.comments ?? 0, liveStats?.comments ?? 0, existing?.comments ?? 0, sheetComments, 0);
  
  // Detección de estrenos: primero API oficial de YouTube, luego respaldo SCHEDULED_VIDEOS_MAP o Google Sheets
  let isScheduled = false;
  let scheduledDateCandidate = null;

  if (apiStats && apiStats.isScheduled) {
    isScheduled = true;
    scheduledDateCandidate = apiStats.scheduledDate;
  }

  if (!isScheduled) {
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
    const candidate = scheduledConfig?.scheduledDate || raw.Fecha_Estreno || raw.fecha_estreno || (isStateScheduled ? publishedAt : null);
    const scheduledTimestamp = candidate ? new Date(candidate).getTime() : NaN;
    const isFuture = !isNaN(scheduledTimestamp) && scheduledTimestamp > Date.now();

    if (isFuture && (Boolean(scheduledConfig?.isScheduled) || isStateScheduled || Boolean(raw.isScheduled))) {
      isScheduled = true;
      scheduledDateCandidate = candidate;
    }
  }
  
  let scheduledDateFormatted = null;
  if (isScheduled) {
    const scheduledConfig = SCHEDULED_VIDEOS_MAP[videoId];
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
    duration,
    views,
    likes,
    comments,
    hasDownloads: downloads.length > 0 || Boolean(existing?.downloads?.length),
    hasTip: Boolean(consejoClave || existing?.consejoClave),
    hasDescription: Boolean(description || existing?.description),
    playlistId: playlistInfo?.playlistId || existing?.playlistId || null,
    playlistTitle: playlistInfo?.playlistTitle || existing?.playlistTitle || null
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

        const ytApiKey = process.env.YOUTUBE_API_KEY || '';
        const playlistsMap = await fetchChannelPlaylists(ytApiKey);

        // Extraer todos los IDs de vídeo únicos para consulta por lotes (Fase 07)
        const allVideoIds = Array.from(new Set(
          rows.map(r => extractYouTubeId(String(r.URL_Youtube || r.url_youtube || r.Youtube || r.URL || '').trim())).filter(Boolean)
        ));

        let apiStatsMap = new Map();
        if (ytApiKey) {
          apiStatsMap = await fetchYouTubeApiStatsBatch(allVideoIds, ytApiKey);
        }

        // Mapa para deduplicar por YouTube ID (conservando el contenido más completo)
        const videosMap = new Map();

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rawUrl = String(row.URL_Youtube || row.url_youtube || row.Youtube || row.URL || '').trim();
          const videoId = extractYouTubeId(rawUrl);
          if (!videoId) continue;

          let apiStats = apiStatsMap.get(videoId) || null;
          let liveStats = null;

          // Si no hay datos de la API oficial para este vídeo, usar respaldo (scraping/player)
          if (!apiStats && !videosMap.has(videoId)) {
            liveStats = await fetchLiveYouTubeStats(videoId);
          }

          const existing = existingVideosMap[videoId] || null;
          const playlistInfo = playlistsMap.get(videoId) || null;
          const normalized = normalizeVideoRow(row, idx, apiStats, liveStats, existing, playlistInfo);
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
              duration: normalized.duration || prev.duration || null,
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

        // Generar / preservar slugs estables para cada vídeo (Fase 04)
        updateSlugsMap(validVideos);

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validVideos, null, 2));
        console.log(`✨ Generados ${validVideos.length} vídeos ÚNICOS con estadísticas reales de YouTube en src/data/videos_v4.json`);
        console.log(`🎬 Vídeo #1: ${validVideos[0]?.title} [${validVideos[0]?.duration || 'N/A'}] (${validVideos[0]?.views} views | ${validVideos[0]?.likes} likes | ${validVideos[0]?.comments} comments)`);
        console.log(`🎬 Vídeo #2: ${validVideos[1]?.title} [${validVideos[1]?.duration || 'N/A'}] (${validVideos[1]?.views} views | ${validVideos[1]?.likes} likes | ${validVideos[1]?.comments} comments)`);
        console.log(`🎬 Vídeo #3: ${validVideos[2]?.title} [${validVideos[2]?.duration || 'N/A'}] (${validVideos[2]?.views} views | ${validVideos[2]?.likes} likes | ${validVideos[2]?.comments} comments)\n`);
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
