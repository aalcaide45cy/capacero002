// api/track.js - Registra una visita (una por sesión) en la tabla visits de Neon.
import { getPool } from './_lib/db.js';

const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const clip = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).end();
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object' || !/^usr_[a-z0-9]{6,40}$/.test(String(b.visitorId))) return res.status(400).end();
  try {
    await getPool().query(
      `INSERT INTO visits (visitor_id, path, referrer, country, city, device, os, browser) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [b.visitorId, clip(b.path, 300), clip(b.referrer, 300), clip(b.country, 80), clip(b.city, 80), clip(b.device, 40), clip(b.os, 40), clip(b.browser, 40)]
    );
    return res.status(204).end();
  } catch (err) {
    console.error('track error:', err);
    return res.status(500).end();
  }
}
