// api/cron-sync.js - Busca vídeos nuevos del canal en YouTube y los guarda en Neon.
// Protegido con CRON_SECRET (cabecera Authorization: Bearer ...). Lo llaman Vercel Cron y GitHub Actions.
import { getPool } from './_lib/db.js';
import { timingSafeCompare } from './_lib/auth.js';
import { runSync } from './_lib/sync.js';
import { processDueNotifications } from './_lib/push.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  if (!secret || !timingSafeCompare(auth, `Bearer ${secret}`)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    // El planificador llama cada hora; la frecuencia real la elige el administrador en el panel (Ajustes).
    const pool = getPool();
    const { rows: cfg } = await pool.query(`SELECT value FROM settings WHERE key = 'sync_interval_minutes'`);
    const interval = Math.max(10, Number(cfg[0]?.value) || 360);
    const { rows: last } = await pool.query(`SELECT extract(epoch FROM now() - max(started_at)) / 60 AS ago FROM sync_runs WHERE status = 'ok'`);
    if (last[0].ago !== null && Number(last[0].ago) < interval - 10) {
      const notifications = await processDueNotifications(pool).catch(err => { console.error('push error:', err); return null; });
      return res.status(200).json({ ok: true, skipped: 'intervalo', intervalMinutes: interval, notifications });
    }
    const result = await runSync(pool, 'cron');
    const notifications = await processDueNotifications(pool).catch(err => { console.error('push error:', err); return null; });
    return res.status(200).json({ ok: true, ...result, notifications });
  } catch (err) {
    console.error('cron-sync error:', err);
    return res.status(500).json({ ok: false, error: 'sync_failed' });
  }
}
