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
    const result = await runSync(getPool(), 'cron');
    const notifications = await processDueNotifications(getPool()).catch(err => { console.error('push error:', err); return null; });
    return res.status(200).json({ ok: true, ...result, notifications });
  } catch (err) {
    console.error('cron-sync error:', err);
    return res.status(500).json({ ok: false, error: 'sync_failed' });
  }
}
