import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'videos_v4.json');
const SLUGS_FILE = path.join(DATA_DIR, 'slugs.json');
const NOTIFIED_FILE = path.join(DATA_DIR, 'notified.json');
const CATEGORY_MAP_FILE = path.join(DATA_DIR, 'category-map.json');

// Los Shorts se detectan dinámicamente sin listas estáticas de IDs


let _cachedCategoryMap = undefined;
function getCategoryMap() {
  if (_cachedCategoryMap !== undefined) return _cachedCategoryMap;
  if (fs.existsSync(CATEGORY_MAP_FILE)) {
    try {
      const raw = fs.readFileSync(CATEGORY_MAP_FILE, 'utf-8').trim();
      _cachedCategoryMap = raw ? JSON.parse(raw) : null;
      return _cachedCategoryMap;
    } catch (e) {
      console.warn('Advertencia al leer category-map.json:', e.message);
    }
  }
  _cachedCategoryMap = null;
  return null;
}

function getNotifiedIds() {
  if (fs.existsSync(NOTIFIED_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(NOTIFIED_FILE, 'utf-8'));
      if (Array.isArray(data)) return new Set(data);
    } catch (e) {
      console.warn('Advertencia al leer notified.json:', e.message);
    }
  }
  return null;
}

async function notifyNewVideoInAppsScript(video) {
  const defaultUrl = 'https://script.google.com/macros/s/AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg/exec';
  const baseUrl = process.env.SHEETS_DB_URL || defaultUrl;
  const token = process.env.STATS_API_TOKEN || '';
  const slug = video.slug || video.youtubeId;
  const targetVideoUrl = `https://www.capacero3d.com/video/${slug}`;
  const title = `Nuevo vídeo: ${video.title}`;
  const body = video.description
    ? (video.description.slice(0, 120) + '...')
    : 'Ya disponible en Capa Cero 3D. Pulsa para ver el nuevo tutorial.';

  try {
    const notifyUrl = `${baseUrl}?action=notify_new_video&token=${encodeURIComponent(token)}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(targetVideoUrl)}`;
    const res = await fetch(notifyUrl, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      console.log(`🔔 Notificación push enviada con éxito para: "${video.title}"`);
      return true;
    } else {
      console.warn(`⚠️ Apps Script no procesó el aviso push (${res.status}):`, data?.message || 'Acción no reconocida');
    }
  } catch (err) {
    console.warn(`⚠️ Aviso: No se pudo enviar notificación push para "${video.title}":`, err.message);
  }
  return false;
}

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

    let views = null;
    let publishedAt = null;
    let lengthSeconds = null;
    let isShortsEligible = false;
    let canonicalUrl = '';
    let isVerticalOrSquare = false;
    let likes = null;
    let comments = null;

    // 1. Consultar endpoint Player para visualizaciones, duración y fecha exacta
    try {
      const pRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });

      if (pRes.ok) {
        const pData = await pRes.json();
        const rawViews = pData.videoDetails?.viewCount;
        if (rawViews !== undefined && rawViews !== null) {
          const pv = parseInt(rawViews, 10);
          if (!isNaN(pv) && pv > 0) views = pv;
        }
        const rawDate = pData.microformat?.playerMicroformatRenderer?.publishDate;
        if (rawDate) {
          publishedAt = new Date(rawDate).toISOString();
        }
        const rawLength = pData.videoDetails?.lengthSeconds;
        if (rawLength) {
          lengthSeconds = parseInt(rawLength, 10);
        }
        const micro = pData.microformat?.playerMicroformatRenderer;
        if (micro) {
          if (micro.isShortsEligible === true) isShortsEligible = true;
          if (micro.canonicalUrl) canonicalUrl = String(micro.canonicalUrl);
        }
        const allFormats = [...(pData.streamingData?.formats || []), ...(pData.streamingData?.adaptiveFormats || [])];
        for (const f of allFormats) {
          if (f && f.width && f.height) {
            if (f.height >= f.width) {
              isVerticalOrSquare = true;
            }
            break;
          }
        }
      }
    } catch (eP) {}

    // 2. Consultar endpoint Next para Likes, Comentarios y Respaldo de Visualizaciones
    try {
      const nRes = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });

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

        // Extraer Visualizaciones desde Next si Player no las suministró o vino 0
        if (!views || views === 0) {
          const mViewMatch = nStr.match(/"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([^"]+)"\}/) ||
                             nStr.match(/"viewCount":\{"simpleText":"([^"]+)"\}/) ||
                             nStr.match(/"viewCount":\{"runs":\[\{"text":"([^"]+)"\}/);
          if (mViewMatch) {
            const parsed = parseInt(mViewMatch[1].replace(/[^0-9]/g, ""), 10);
            if (!isNaN(parsed) && parsed > 0) {
              views = parsed;
            }
          }
        }
      }
    } catch (eN) {}

    // 3. Fallback a página pública de YouTube si falta views o duración
    if (!views || views === 0 || !lengthSeconds || lengthSeconds === 0) {
      try {
        const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9"
          },
          signal: AbortSignal.timeout(6000)
        });
        if (watchRes.ok) {
          const html = await watchRes.text();
          if (!views || views === 0) {
            const mHtmlView = html.match(/"viewCount":"(\d+)"/) || html.match(/itemprop="interactionCount"\s+content="(\d+)"/);
            if (mHtmlView) {
              views = parseInt(mHtmlView[1], 10);
            }
          }
          if (!lengthSeconds || lengthSeconds === 0) {
            const mSec = html.match(/"lengthSeconds":"(\d+)"/);
            const mMs = html.match(/"approxDurationMs":"(\d+)"/);
            if (mSec) {
              lengthSeconds = parseInt(mSec[1], 10);
            } else if (mMs) {
              lengthSeconds = Math.round(parseInt(mMs[1], 10) / 1000);
            }
          }
          if (!publishedAt) {
            const mDate = html.match(/"publishDate":"([^"]+)"/) || html.match(/"uploadDate":"([^"]+)"/);
            if (mDate) {
              publishedAt = new Date(mDate[1]).toISOString();
            }
          }
          if (likes === null) {
            const mLike = html.match(/"iconName":"LIKE","title":"([\d.,]+)"/) || html.match(/"likeCount":"(\d+)"/);
            if (mLike) {
              likes = parseInt(mLike[1].replace(/[^0-9]/g, ""), 10) || 0;
            }
          }
        }
      } catch (eW) {}
    }

    return { views, likes, comments, publishedAt, lengthSeconds, isShortsEligible, canonicalUrl, isVerticalOrSquare };
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
  
  let category = String(raw.Categoria || raw.categoria || raw.Category || 'Bambu Studio').trim();
  const catMap = getCategoryMap();
  if (catMap && catMap.titleContains && !category.toLowerCase().startsWith('curso')) {
    for (const [matchSubstr, mappedCat] of Object.entries(catMap.titleContains)) {
      if (title.toLowerCase().includes(matchSubstr.toLowerCase())) {
        category = mappedCat;
        break;
      }
    }
  }
  const rawDesc = String(raw.Descripcion || raw.descripcion || raw.Description || '').trim();
  const description = (rawDesc && !rawDesc.toLowerCase().includes('vacio') && !rawDesc.toLowerCase().includes('vacío')) ? rawDesc : '';

  const rawTip = String(raw.Consejo_Clave || raw.consejo_clave || raw.Tip || '').trim();
  const consejoClave = (rawTip && !rawTip.toLowerCase().includes('vacio') && !rawTip.toLowerCase().includes('vacío')) ? rawTip : '';

  const downloads = extractValidDownloads(raw);

  const rawDestacado = String(raw.Destacado || raw.destacado || '').trim().toUpperCase();
  const isFeatured = rawDestacado === 'SI' || rawDestacado === 'SÍ' || rawDestacado === 'TRUE' || rawDestacado === '1' || rawDestacado === 'YES';

  // Detección dinámica de YouTube Shorts (hasta 3 minutos / 180s en formato vertical o cuadrado)
  // Regla estricta: Los vídeos existentes en el catálogo oficial nunca se excluyen (incluso si duran <= 180s)
  const isExistingTutorial = Boolean(existing);

  const liveDurationSec = liveStats?.lengthSeconds || 0;
  const apiDurationSec = apiStats?.duration ? (function(d){
    const parts = String(d).split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
  })(apiStats.duration) : 0;
  const durationSec = liveDurationSec || apiDurationSec;
  const isShortDuration = durationSec > 0 && durationSec <= 180;

  const isShortUrl = rawUrl.toLowerCase().includes('/shorts/') || (liveStats?.canonicalUrl && liveStats.canonicalUrl.toLowerCase().includes('/shorts/'));
  const hasShortTag = /#(shorts|short|reels|reel)\b/i.test(title);
  const isShortsEligible = liveStats?.isShortsEligible === true;
  const isVerticalOrSquare = liveStats?.isVerticalOrSquare === true;

  const isShort = !isExistingTutorial && (
    isShortUrl ||
    hasShortTag ||
    isShortsEligible ||
    (isShortDuration && (isVerticalOrSquare || isShortsEligible || isShortUrl))
  );
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

// Lee de Neon los vídeos que no están en la hoja y los añade (y respeta los marcados como ocultos).
// Es opcional: sin DATABASE_URL, o si falla la conexión, la compilación sigue solo con la hoja.
async function mergeDbOnlyVideos(validVideos) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  let client;
  try {
    const { default: pg } = await import('pg');
    client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 8000 });
    await client.connect();
    const { rows } = await client.query('SELECT * FROM videos ORDER BY published_at DESC');
    const hidden = new Set(rows.filter(r => r.hidden).map(r => r.youtube_id));
    for (let i = validVideos.length - 1; i >= 0; i--) {
      if (hidden.has(validVideos[i].youtubeId)) validVideos.splice(i, 1);
    }
    const present = new Set(validVideos.map(v => v.youtubeId));
    let added = 0;
    for (const r of rows) {
      if (r.hidden || r.is_short || present.has(r.youtube_id)) continue;
      const views = Number(r.views) || 0;
      const likes = Number(r.likes) || 0;
      const downloads = Array.isArray(r.downloads) ? r.downloads : [];
      validVideos.push({
        id: `db-${r.youtube_id}`,
        title: r.title,
        youtubeUrl: `https://www.youtube.com/watch?v=${r.youtube_id}`,
        youtubeId: r.youtube_id,
        thumbnail: `https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg`,
        category: r.extra?.category || 'Bambu Studio',
        description: r.description || '',
        consejoClave: r.key_tip || '',
        downloads,
        isFeatured: Boolean(r.is_featured),
        isScheduled: Boolean(r.is_scheduled),
        scheduledDateFormatted: r.is_scheduled ? formatScheduledDate(r.scheduled_date || r.published_at) : null,
        chapterNumber: r.extra?.chapterNumber || null,
        popularityScore: (likes * 10) + Math.round(views / 10) + (r.is_featured ? 500 : 0),
        publishedAt: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
        duration: r.duration || null,
        views,
        likes,
        comments: Number(r.comments) || 0,
        hasDownloads: downloads.length > 0,
        hasTip: Boolean(r.key_tip),
        hasDescription: Boolean(r.description),
        playlistId: r.playlist_id || null,
        playlistTitle: r.playlist_title || null,
        slug: r.slug
      });
      added++;
    }
    if (added > 0) console.log(`🗄️ Añadidos ${added} vídeo(s) desde Neon que no estaban en la hoja.`);
  } catch (err) {
    console.warn('⚠️ No se pudo leer Neon (se continúa solo con la hoja):', err.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
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

// Fuente de datos: Neon cuando settings.video_source = 'db'; si no (o si falla), la hoja de Google.
let dataOrigin = 'sheet';

async function loadRowsFromDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  let client;
  try {
    const { default: pg } = await import('pg');
    client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 8000 });
    await client.connect();
    const src = await client.query("SELECT value FROM settings WHERE key = 'video_source'");
    if (src.rows[0]?.value !== 'db') return null;
    const { rows } = await client.query('SELECT * FROM videos WHERE NOT hidden AND NOT is_short ORDER BY published_at DESC');
    if (rows.length === 0) return null;
    return rows.map(r => {
      const dl = Array.isArray(r.downloads) ? r.downloads : [];
      return {
        id: r.extra?.legacyId || `db-${r.youtube_id}`,
        Titulo: r.title,
        URL_Youtube: `https://www.youtube.com/watch?v=${r.youtube_id}`,
        Categoria: r.extra?.category || '',
        Descripcion: r.description || '',
        Consejo_Clave: r.key_tip || '',
        Enlace_Descarga: dl[0]?.url || '',
        Enlace_Descarga2: dl[1]?.url || '',
        Enlace_Descarga3: dl[2]?.url || '',
        Destacado: r.is_featured ? 'SI' : '',
        Fecha_Estreno: r.is_scheduled && r.scheduled_date ? new Date(r.scheduled_date).toISOString() : '',
        Estado: r.is_scheduled ? 'programado' : '',
        views: Number(r.views) || 0,
        likes: Number(r.likes) || 0,
        comments: Number(r.comments) || 0
      };
    });
  } catch (err) {
    console.warn('⚠️ No se pudo leer Neon (se usa la hoja):', err.message);
    return null;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// Tras una compilación correcta desde la hoja, copia el catálogo completo a Neon y lo marca como fuente.
async function persistCatalogToDb(videos) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || videos.length < 30) return;
  let client;
  try {
    const { default: pg } = await import('pg');
    client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 8000 });
    await client.connect();
    await client.query('BEGIN');
    for (const v of videos) {
      await client.query(
        `INSERT INTO videos (youtube_id, slug, title, description, published_at, duration, views, likes, comments,
           is_scheduled, is_featured, playlist_id, playlist_title, key_tip, downloads, extra, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'sheet')
         ON CONFLICT (youtube_id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, published_at = EXCLUDED.published_at,
           duration = EXCLUDED.duration, views = GREATEST(videos.views, EXCLUDED.views),
           likes = GREATEST(videos.likes, EXCLUDED.likes), comments = GREATEST(videos.comments, EXCLUDED.comments),
           is_scheduled = EXCLUDED.is_scheduled, is_featured = EXCLUDED.is_featured, playlist_id = EXCLUDED.playlist_id,
           playlist_title = EXCLUDED.playlist_title, key_tip = EXCLUDED.key_tip, downloads = EXCLUDED.downloads,
           extra = EXCLUDED.extra, updated_at = now()`,
        [
          v.youtubeId, v.slug, v.title, v.description || '', v.publishedAt, v.duration,
          v.views || 0, v.likes || 0, v.comments || 0, Boolean(v.isScheduled), Boolean(v.isFeatured),
          v.playlistId, v.playlistTitle, v.consejoClave || null, JSON.stringify(v.downloads || []),
          JSON.stringify({ category: v.category, chapterNumber: v.chapterNumber, legacyId: v.id })
        ]
      );
    }
    await client.query(
      `INSERT INTO settings (key, value) VALUES ('video_source', '"db"'::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
    );
    await client.query('COMMIT');
    console.log(`🗄️ Catálogo (${videos.length} vídeos) copiado a Neon. A partir de ahora la fuente es Neon.`);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.warn('⚠️ No se pudo copiar el catálogo a Neon (se sigue con la hoja):', err.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

async function main() {
  const dbRows = await loadRowsFromDb();
  if (dbRows) {
    dataOrigin = 'db';
    console.log(`🚀 Iniciando Videoteca V4 desde Neon (${dbRows.length} vídeos)...`);
    await processResults({ data: dbRows });
    return;
  }
  console.log('🚀 Iniciando descarga de Videoteca V4 desde Google Sheets...');
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) throw new Error('CSV vacío');

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: processResults,
      error: (err) => {
        console.error('🔥 Error parseando CSV de vídeos:', err);
      }
    });
  } catch (error) {
    console.warn('⚠️ No se pudo descargar la hoja de vídeos (usando existente):', error.message);
  }
}

async function processResults(results) {
      {
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
          if (!videoId) {
            console.log(`⏭️ Fila ${idx + 2} descartada: sin URL de YouTube válida (título: "${String(row.Titulo || row.titulo || '').trim()}", URL: "${rawUrl}")`);
            continue;
          }

          let apiStats = apiStatsMap.get(videoId) || null;
          let liveStats = null;

          // Si no hay datos de la API oficial para este vídeo, o si dura <= 180s y no es un tutorial conocido, consultar player en vivo para verificar si es Short o formato horizontal
          const isKnownTutorial = Boolean(existingVideosMap[videoId]);
          const apiDurSec = apiStats?.duration ? (function(d){
            const parts = String(d).split(':').map(Number);
            return parts.length === 2 ? parts[0] * 60 + parts[1] : (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
          })(apiStats.duration) : 0;

          const existing = existingVideosMap[videoId] || null;
          const needsLiveStats = !apiStats ||
                                 !apiStats.views ||
                                 apiStats.views === 0 ||
                                 !existing ||
                                 !existing.views ||
                                 existing.views === 0 ||
                                 (!isKnownTutorial && apiDurSec > 0 && apiDurSec <= 180);

          if (!videosMap.has(videoId) && needsLiveStats) {
            liveStats = await fetchLiveYouTubeStats(videoId);
          }

          const playlistInfo = playlistsMap.get(videoId) || null;
          const normalized = normalizeVideoRow(row, idx, apiStats, liveStats, existing, playlistInfo);
          if (!normalized) {
            console.log(`⏭️ Fila ${idx + 2} descartada: ${videoId} "${String(row.Titulo || row.titulo || '').trim()}" detectado como Short (duración ${apiStats?.duration || liveStats?.lengthSeconds || '?'})`);
            continue;
          }

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

        // Vídeos que existen en Neon (alta automática desde YouTube) pero aún no están en la hoja
        if (dataOrigin === 'sheet') await mergeDbOnlyVideos(validVideos);

        // Orden cronológico estricto (más nuevo publicado primero)
        validVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        // Generar / preservar slugs estables para cada vídeo (Fase 04)
        updateSlugsMap(validVideos);

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validVideos, null, 2));
        if (dataOrigin === 'sheet') await persistCatalogToDb(validVideos);
        console.log(`✨ Generados ${validVideos.length} vídeos ÚNICOS con estadísticas reales de YouTube en src/data/videos_v4.json`);
        console.log(`🎬 Vídeo #1: ${validVideos[0]?.title} [${validVideos[0]?.duration || 'N/A'}] (${validVideos[0]?.views} views | ${validVideos[0]?.likes} likes | ${validVideos[0]?.comments} comments)`);
        console.log(`🎬 Vídeo #2: ${validVideos[1]?.title} [${validVideos[1]?.duration || 'N/A'}] (${validVideos[1]?.views} views | ${validVideos[1]?.likes} likes | ${validVideos[1]?.comments} comments)`);
        console.log(`🎬 Vídeo #3: ${validVideos[2]?.title} [${validVideos[2]?.duration || 'N/A'}] (${validVideos[2]?.views} views | ${validVideos[2]?.likes} likes | ${validVideos[2]?.comments} comments)\n`);

        // Gestión de notificaciones push de nuevos vídeos (Fase 09)
        let notifiedSet = getNotifiedIds();
        if (!notifiedSet) {
          // Primera ejecución: inicializar con todos los vídeos actuales para evitar spam de 33 avisos
          notifiedSet = new Set();
          for (const v of validVideos) {
            if (v.youtubeId) notifiedSet.add(v.youtubeId);
          }
          fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(Array.from(notifiedSet), null, 2), 'utf-8');
          console.log(`📌 Primera ejecución: inicializados ${notifiedSet.size} vídeos en src/data/notified.json`);
        } else {
          // Ejecuciones posteriores: notificar vídeos nuevos publicados que no estén programados
          let newNotifiedCount = 0;
          // Las vistas previas de Vercel nunca envían avisos reales a los suscriptores.
          const isPreviewBuild = Boolean(process.env.VERCEL) && process.env.VERCEL_ENV !== 'production';
          for (const v of validVideos) {
            if (v.youtubeId && !v.isScheduled && !notifiedSet.has(v.youtubeId)) {
              console.log(`🆕 ¡Nuevo vídeo publicado detectado! ID: ${v.youtubeId} - "${v.title}"`);
              if (isPreviewBuild) {
                console.log('⏭️ Vista previa: no se envía el aviso push ni se marca como avisado.');
                continue;
              }
              // Solo se marca como avisado si el aviso se envió; así un fallo se reintenta en la siguiente compilación.
              if (await notifyNewVideoInAppsScript(v)) {
                notifiedSet.add(v.youtubeId);
                newNotifiedCount++;
              }
            }
          }
          if (newNotifiedCount > 0) {
            fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(Array.from(notifiedSet), null, 2), 'utf-8');
            console.log(`💾 Actualizado src/data/notified.json con ${newNotifiedCount} nuevo(s) vídeo(s).`);
          }
        }
      }
}

main();
