// api/cron-sync.js - Busca vídeos nuevos del canal en YouTube y los guarda en Neon.
// Protegido con CRON_SECRET (cabecera Authorization: Bearer ...). Lo llaman Vercel Cron y GitHub Actions.
import { getPool } from './_lib/db.js';
import { timingSafeCompare } from './_lib/auth.js';

const CHANNEL_ID = 'UCWKLBuYTfVEDwsCFc5GyEOQ';
const UPLOADS_PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);
const SHORT_MAX_SECONDS = 180;

function generateSlug(title) {
  let s = String(title || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/#\d+/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > 70) s = s.slice(0, 70).replace(/-[^-]*$/, '');
  return s || 'video';
}

function parseIsoDuration(iso) {
  const m = String(iso || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return { seconds: 0, label: null };
  const h = parseInt(m[2] || 0, 10) + parseInt(m[1] || 0, 10) * 24;
  const min = parseInt(m[3] || 0, 10);
  const sec = parseInt(m[4] || 0, 10);
  const label = h > 0 ? `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${min}:${String(sec).padStart(2, '0')}`;
  return { seconds: h * 3600 + min * 60 + sec, label };
}

async function fetchCandidatesApi(apiKey) {
  const listUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=25&key=${apiKey}`;
  const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(8000) });
  if (!listRes.ok) throw new Error(`YouTube playlistItems HTTP ${listRes.status}`);
  const ids = ((await listRes.json()).items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return [];
  const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids.join(',')}&key=${apiKey}`;
  const vidRes = await fetch(vidUrl, { signal: AbortSignal.timeout(8000) });
  if (!vidRes.ok) throw new Error(`YouTube videos HTTP ${vidRes.status}`);
  return ((await vidRes.json()).items || []).map(item => {
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
      isShort: dur.seconds > 0 && dur.seconds <= SHORT_MAX_SECONDS
    };
  });
}

// Respaldo sin clave de API: feed RSS oficial (ya excluye los enlaces /shorts/).
async function fetchCandidatesRss() {
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  if (!secret || !timingSafeCompare(auth, `Bearer ${secret}`)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const pool = getPool();
  const { rows: runRows } = await pool.query(`INSERT INTO sync_runs (source) VALUES ('cron') RETURNING id`);
  const runId = runRows[0].id;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const candidates = apiKey ? await fetchCandidatesApi(apiKey) : await fetchCandidatesRss();

    const { rows: known } = await pool.query('SELECT youtube_id, slug FROM videos');
    const knownIds = new Set(known.map(r => r.youtube_id));
    const usedSlugs = new Set(known.map(r => r.slug));

    // Solo se consideran vídeos posteriores al más reciente conocido menos 1 día, para no reabrir Shorts antiguos descartados.
    const { rows: lastRows } = await pool.query('SELECT max(published_at) AS last FROM videos');
    const cutoff = lastRows[0].last ? new Date(new Date(lastRows[0].last).getTime() - 86400000) : new Date(0);

    let added = 0;
    const addedIds = [];
    for (const v of candidates) {
      if (knownIds.has(v.id) || v.isShort) continue;
      if (v.publishedAt && new Date(v.publishedAt) < cutoff) continue;
      let slug = generateSlug(v.title);
      const base = slug;
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
      usedSlugs.add(slug);
      await pool.query(
        `INSERT INTO videos (youtube_id, slug, title, description, published_at, duration, views, likes, comments, is_scheduled, scheduled_date, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'youtube') ON CONFLICT (youtube_id) DO NOTHING`,
        [v.id, slug, v.title, v.description, v.publishedAt, v.duration, v.views, v.likes, v.comments, v.isScheduled, v.isScheduled ? v.publishedAt : null]
      );
      added++;
      addedIds.push(v.id);
    }

    // Refrescar estadísticas de los vídeos ya conocidos cuando hay datos de la API.
    let updated = 0;
    for (const v of candidates) {
      if (!knownIds.has(v.id) || !apiKey) continue;
      const r = await pool.query(
        `UPDATE videos SET views = GREATEST(views, $2), likes = GREATEST(likes, $3), comments = GREATEST(comments, $4),
           is_scheduled = $5, updated_at = now() WHERE youtube_id = $1`,
        [v.id, v.views, v.likes, v.comments, v.isScheduled]
      );
      updated += r.rowCount;
    }

    // Un vídeo nuevo requiere regenerar su página: lanzar un despliegue en Vercel.
    let deployTriggered = false;
    const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (added > 0 && hook) {
      const hookRes = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(8000) });
      deployTriggered = hookRes.ok;
    }

    await pool.query(`UPDATE sync_runs SET status='ok', finished_at=now(), new_videos=$2, updated_videos=$3 WHERE id=$1`, [runId, added, updated]);
    return res.status(200).json({ ok: true, new: added, newIds: addedIds, updated, method: apiKey ? 'youtube_api' : 'rss', deployTriggered });
  } catch (err) {
    await pool.query(`UPDATE sync_runs SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [runId, String(err.message).slice(0, 500)]).catch(() => {});
    console.error('cron-sync error:', err);
    return res.status(500).json({ ok: false, error: 'sync_failed' });
  }
}
