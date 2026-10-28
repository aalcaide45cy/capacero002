// Importa src/data/videos_v4.json (copia de la hoja) a la tabla videos. Idempotente.
// Uso: DATABASE_URL_MIGRATIONS=... node scripts/db/import-videos.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/videos_v4.json');
const url = process.env.DATABASE_URL_MIGRATIONS || process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL_MIGRATIONS');
  process.exit(1);
}

const videos = JSON.parse(fs.readFileSync(file, 'utf8'));
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
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
  await client.query('COMMIT');
  console.log(`Importados ${videos.length} vídeos`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
