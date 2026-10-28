// api/push-subscribe.js - Registra una suscripción push del navegador en Neon.
import { getPool } from './_lib/db.js';

// Solo se aceptan los servicios push oficiales de los navegadores.
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.apple\.com)$/;
const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).json({ ok: false });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false });

  let host;
  try { const u = new URL(String(b.endpoint)); if (u.protocol !== 'https:') throw 0; host = u.hostname; } catch { return res.status(400).json({ ok: false }); }
  if (!PUSH_HOSTS.test(host) || String(b.endpoint).length > 600) return res.status(400).json({ ok: false });
  const p256dh = String(b.p256dh || ''), auth = String(b.auth || '');
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) return res.status(400).json({ ok: false });

  try {
    await getPool().query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, status, country, city, timezone, device, os, user_agent)
       VALUES ($1,$2,$3,'active',$4,$5,$6,$7,$8,$9)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, status = 'active',
         country = EXCLUDED.country, city = EXCLUDED.city, timezone = EXCLUDED.timezone, device = EXCLUDED.device,
         os = EXCLUDED.os, user_agent = EXCLUDED.user_agent, last_seen_at = now()`,
      [b.endpoint, p256dh, auth, clip(b.country, 80), clip(b.city, 80), clip(b.timezone, 60), clip(b.device, 40), clip(b.os, 40), clip(req.headers['user-agent'], 300)]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('push-subscribe error:', err);
    return res.status(500).json({ ok: false });
  }
}
