// api/_lib/push.js - Envío de notificaciones push propias (Web Push con VAPID) a las suscripciones de Neon.
import webpush from 'web-push';

const SITE = 'https://www.capacero3d.com';

function configure() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || SITE, pub, priv);
}

/** Envía una notificación de la tabla `notifications` a todas las suscripciones activas y guarda el resultado. */
export async function sendNotification(pool, id) {
  configure();
  // Reserva atómica: solo un proceso puede pasar la notificación de pendiente a "sending".
  const claim = await pool.query(
    `UPDATE notifications SET status = 'sending' WHERE id = $1 AND status IN ('scheduled','draft') RETURNING title, body, url`, [id]);
  if (claim.rowCount === 0) return { skipped: true };
  const n = claim.rows[0];
  const url = String(n.url || '/').startsWith('/') ? SITE + n.url : n.url;
  const payload = JSON.stringify({ title: n.title, body: n.body, url, icon: '/favicon-192x192.png', badge: '/favicon-96x96.png' });
  try {
    const { rows: subs } = await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE status = 'active'`);
    let sent = 0, failed = 0;
    const dead = [];
    for (let i = 0; i < subs.length; i += 20) {
      await Promise.all(subs.slice(i, i + 20).map(async s => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'normal' });
          sent++;
        } catch (err) {
          failed++;
          if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.id);
        }
      }));
    }
    if (dead.length) await pool.query(`UPDATE push_subscriptions SET status = 'expired' WHERE id = ANY($1::bigint[])`, [dead]);
    await pool.query(`UPDATE notifications SET status = 'sent', sent_at = now(), sent_count = $2, failed_count = $3 WHERE id = $1`, [id, sent, failed]);
    return { sent, failed, expired: dead.length };
  } catch (err) {
    await pool.query(`UPDATE notifications SET status = 'failed' WHERE id = $1`, [id]);
    throw err;
  }
}

/** Envía las notificaciones programadas cuya hora ya ha llegado. */
export async function processDueNotifications(pool) {
  if (!process.env.VAPID_PRIVATE_KEY) return { skipped: 'sin VAPID' };
  const { rows: en } = await pool.query(`SELECT value FROM settings WHERE key = 'notifications_enabled'`);
  if (en[0] && !(en[0].value === true || en[0].value === 'true')) return { skipped: 'desactivadas' };
  const { rows } = await pool.query(`SELECT id FROM notifications WHERE status = 'scheduled' AND scheduled_for <= now() ORDER BY scheduled_for LIMIT 10`);
  const results = [];
  for (const r of rows) results.push(await sendNotification(pool, r.id).catch(e => ({ error: e.message })));
  return { processed: rows.length, results };
}

/** Avisa a los dispositivos del administrador (suscritos desde /admin/notifications). */
export async function notifyAdmins(pool, { title, body, url }) {
  configure();
  const { rows } = await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE status = 'active' AND device = 'admin'`);
  const payload = JSON.stringify({ title, body, url: SITE + url, icon: '/favicon-192x192.png', badge: '/favicon-96x96.png' });
  let sent = 0;
  await Promise.all(rows.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'high' })
    .then(() => { sent++; })
    .catch(err => { if (err.statusCode === 404 || err.statusCode === 410) return pool.query(`UPDATE push_subscriptions SET status = 'expired' WHERE id = $1`, [s.id]); })));
  return sent;
}
