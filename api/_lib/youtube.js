// api/_lib/youtube.js - Acceso a datos de YouTube (API con clave o sin clave) y utilidades de vídeo.
export const CHANNEL_ID = 'UCWKLBuYTfVEDwsCFc5GyEOQ';
const UPLOADS_PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);
const SHORT_MAX_SECONDS = 180;

/** Un Short puede durar hasta 3 minutos, pero un vídeo largo de 3 minutos no lo es: /shorts/ID solo responde 200 si es un Short. */
async function isShortVideo(id, seconds) {
  if (!(seconds > 0 && seconds <= SHORT_MAX_SECONDS)) return false;
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400) return false;
  } catch { /* sin respuesta: se decide por la duración */ }
  return seconds <= 60;
}

export function generateSlug(title) {
  let s = String(title || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/#\d+/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > 70) s = s.slice(0, 70).replace(/-[^-]*$/, '');
  return s || 'video';
}

export function parseIsoDuration(iso) {
  const m = String(iso || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return { seconds: 0, label: null };
  const h = parseInt(m[2] || 0, 10) + parseInt(m[1] || 0, 10) * 24;
  const min = parseInt(m[3] || 0, 10);
  const sec = parseInt(m[4] || 0, 10);
  const label = h > 0 ? `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${min}:${String(sec).padStart(2, '0')}`;
  return { seconds: h * 3600 + min * 60 + sec, label };
}

export async function fetchCandidatesApi(apiKey) {
  const listUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=25&key=${apiKey}`;
  const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(8000) });
  if (!listRes.ok) throw new Error(`YouTube playlistItems HTTP ${listRes.status}`);
  const ids = ((await listRes.json()).items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return [];
  const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids.join(',')}&key=${apiKey}`;
  const vidRes = await fetch(vidUrl, { signal: AbortSignal.timeout(8000) });
  if (!vidRes.ok) throw new Error(`YouTube videos HTTP ${vidRes.status}`);
  const items = (await vidRes.json()).items || [];
  return Promise.all(items.map(async item => {
    const dur = parseIsoDuration(item.contentDetails?.duration);
    const live = item.liveStreamingDetails || {};
    const upcoming = item.snippet?.liveBroadcastContent === 'upcoming';
    return {
      id: item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      publishedAt: live.scheduledStartTime && upcoming ? live.scheduledStartTime : item.snippet?.publishedAt,
      duration: dur.label,
      durationSeconds: dur.seconds,
      views: parseInt(item.statistics?.viewCount || 0, 10),
      likes: parseInt(item.statistics?.likeCount || 0, 10),
      comments: parseInt(item.statistics?.commentCount || 0, 10),
      isScheduled: upcoming,
      isShort: await isShortVideo(item.id, dur.seconds)
    };
  }));
}

// Respaldo sin clave de API: feed RSS oficial (ya excluye los enlaces /shorts/).
export async function fetchCandidatesRss() {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const id = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (entry.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || null;
    const href = (entry.match(/<link[^>]+href="([^"]+)"/) || [])[1] || '';
    const decoded = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return { id, title: decoded, description: '', publishedAt: published, duration: null, durationSeconds: 0, views: 0, likes: 0, comments: 0, isScheduled: false, isShort: href.includes('/shorts/') };
  }).filter(v => v.id);
}


/** Extrae el id de 11 caracteres de un enlace de YouTube (watch, youtu.be, shorts, embed, live) o de un id suelto. */
export function extractYoutubeId(input) {
  const s = String(input || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?]+)/); id = m && m[1]; }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

function decodeEntities(t) {
  return String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** Datos de un vídeo concreto. Con YOUTUBE_API_KEY usa la API; si no, lee la página pública del vídeo. */
export async function fetchVideoById(id) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${id}&key=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`YouTube videos HTTP ${res.status}`);
    const item = ((await res.json()).items || [])[0];
    if (!item) return null;
    const dur = parseIsoDuration(item.contentDetails?.duration);
    const live = item.liveStreamingDetails || {};
    const upcoming = item.snippet?.liveBroadcastContent === 'upcoming';
    return {
      id, title: item.snippet?.title || '', description: item.snippet?.description || '',
      publishedAt: live.scheduledStartTime && upcoming ? live.scheduledStartTime : item.snippet?.publishedAt,
      duration: dur.label, durationSeconds: dur.seconds,
      views: parseInt(item.statistics?.viewCount || 0, 10), likes: parseInt(item.statistics?.likeCount || 0, 10),
      comments: parseInt(item.statistics?.commentCount || 0, 10), isScheduled: upcoming,
      isShort: await isShortVideo(id, dur.seconds)
    };
  }
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=es`, { signal: AbortSignal.timeout(10000), headers: { 'Accept-Language': 'es-ES,es;q=0.9' } });
  if (!res.ok) throw new Error(`Página de YouTube HTTP ${res.status}`);
  const html = await res.text();
  const meta = (name) => decodeEntities((html.match(new RegExp(`<meta (?:itemprop|property|name)="${name}" content="([^"]*)"`)) || [])[1]);
  const title = meta('og:title');
  if (!title) return null;
  const durMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const seconds = durMatch ? parseInt(durMatch[1], 10) : 0;
  const label = seconds ? (seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`) : null;
  const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  let description = meta('og:description');
  if (descMatch) { try { description = JSON.parse(`"${descMatch[1]}"`); } catch { /* se queda la descripción corta */ } }
  const published = meta('datePublished') || (html.match(/"publishDate":"([^"]+)"/) || [])[1] || (html.match(/"uploadDate":"([^"]+)"/) || [])[1] || null;
  return {
    id, title, description, publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
    duration: label, durationSeconds: seconds, views: parseInt(meta('interactionCount') || 0, 10) || 0, likes: 0, comments: 0,
    isScheduled: /"isUpcoming":true/.test(html), isShort: await isShortVideo(id, seconds)
  };
}

/** Inserta un vídeo en Neon con slug único. Devuelve el slug o null si ya existía. */
export async function insertVideo(pool, v, { source = 'youtube', category = null, keyTip = null, downloads = [] } = {}) {
  const { rows } = await pool.query('SELECT slug FROM videos');
  const used = new Set(rows.map(r => r.slug));
  const base = generateSlug(v.title);
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  const extra = category ? { category } : {};
  const r = await pool.query(
    `INSERT INTO videos (youtube_id, slug, title, description, published_at, duration, views, likes, comments, is_scheduled, scheduled_date, key_tip, downloads, extra, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (youtube_id) DO NOTHING`,
    [v.id, slug, v.title, v.description, v.publishedAt, v.duration, v.views, v.likes, v.comments, v.isScheduled, v.isScheduled ? v.publishedAt : null,
      keyTip, JSON.stringify(downloads), JSON.stringify(extra), source]
  );
  return r.rowCount ? slug : null;
}

/** Lanza un despliegue en Vercel (necesario para generar la página del vídeo). */
export async function triggerDeploy() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return false;
  try {
    const res = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch { return false; }
}
