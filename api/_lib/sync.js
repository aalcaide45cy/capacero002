// api/_lib/sync.js - Sincronización de vídeos del canal con Neon (la usan el cron y el panel /admin).
import { fetchCandidatesApi, fetchCandidatesRss, generateSlug, triggerDeploy } from './youtube.js';

export async function runSync(pool, source = 'cron') {
  const { rows: runRows } = await pool.query(`INSERT INTO sync_runs (source) VALUES ($1) RETURNING id`, [source]);
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
    const newVideos = [];
    for (const v of candidates) {
      if (knownIds.has(v.id) || v.isShort) continue;
      if (v.publishedAt && new Date(v.publishedAt) < cutoff) continue;
      let slug = generateSlug(v.title);
      const base = slug;
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
      usedSlugs.add(slug);
      const r = await pool.query(
        `INSERT INTO videos (youtube_id, slug, title, description, published_at, duration, views, likes, comments, is_scheduled, scheduled_date, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'youtube') ON CONFLICT (youtube_id) DO NOTHING`,
        [v.id, slug, v.title, v.description, v.publishedAt, v.duration, v.views, v.likes, v.comments, v.isScheduled, v.isScheduled ? v.publishedAt : null]
      );
      if (r.rowCount) { added++; newVideos.push({ id: v.id, slug, title: v.title, isScheduled: v.isScheduled }); }
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
    const deployTriggered = added > 0 ? await triggerDeploy() : false;

    // Aviso push automático (se envía unos minutos después, cuando la página ya está publicada).
    let notified = 0;
    if (added > 0) {
      const { rows: s } = await pool.query(`SELECT key, value FROM settings WHERE key IN ('notifications_enabled','auto_notify_new_video')`);
      const flag = Object.fromEntries(s.map(r => [r.key, r.value === true || r.value === 'true']));
      if (flag.notifications_enabled && flag.auto_notify_new_video) {
        for (const v of newVideos.filter(x => !x.isScheduled)) {
          await pool.query(
            `INSERT INTO notifications (kind, title, body, url, status, scheduled_for, youtube_id)
             VALUES ('new_video', $1, $2, $3, 'scheduled', now() + interval '5 minutes', $4)`,
            ['Nuevo vídeo en Capa Cero 3D', v.title, `/video/${v.slug}`, v.id]
          );
          notified++;
        }
      }
    }

    await pool.query(`UPDATE sync_runs SET status='ok', finished_at=now(), new_videos=$2, updated_videos=$3 WHERE id=$1`, [runId, added, updated]);
    return { new: added, newIds: newVideos.map(v => v.id), updated, method: apiKey ? 'youtube_api' : 'rss', deployTriggered, notificationsQueued: notified };
  } catch (err) {
    await pool.query(`UPDATE sync_runs SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [runId, String(err.message).slice(0, 500)]).catch(() => {});
    throw err;
  }
}
