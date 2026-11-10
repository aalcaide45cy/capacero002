// api/track.js - Registra en Neon las visitas (una por sesión, tabla visits) y el detalle de cada sesión
// (tabla analytics_sessions) que alimenta el panel /estadisticas.
import { getPool } from './_lib/db.js';

const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const clip = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
const text = (v, n) => (v == null ? '' : String(v).slice(0, n));
// Lista de textos sin repetidos (admite también el formato antiguo «a | b | c»)
const list = v => {
  const arr = Array.isArray(v) ? v : (typeof v === 'string' && v ? v.split(' | ') : []);
  return JSON.stringify([...new Set(arr.map(x => String(x).slice(0, 200)).filter(Boolean))].slice(0, 100));
};
const UNION = (col) => `(SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb) FROM jsonb_array_elements(analytics_sessions.${col} || EXCLUDED.${col}) x)`;

// Cada sesión se envía varias veces (al empezar, al cambiar de pestaña, al salir): se guarda una sola fila y se va completando.
async function saveSession(b, res) {
  if (!/^ses_[a-z0-9_]{6,60}$/.test(String(b.sessionId))) return res.status(400).end();
  let dwell = b.dwellTimes;
  if (typeof dwell === 'string') { try { dwell = JSON.parse(dwell); } catch { dwell = {}; } }
  if (!dwell || typeof dwell !== 'object' || Array.isArray(dwell)) dwell = {};
  const dwellJson = JSON.stringify(dwell);
  if (dwellJson.length > 5000) return res.status(400).end();
  const ts = new Date(b.timestamp || Date.now());
  const seconds = Math.max(0, Math.min(86400, parseInt(b.totalActiveSeconds, 10) || 0));
  try {
    await getPool().query(
      `INSERT INTO analytics_sessions (session_id, ts, country, country_code, flag, region, city, device, os, browser, origin,
         active_seconds, subscribed, subscribed_from, dwell, clicked, downloads, searches, doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (session_id) DO UPDATE SET
         active_seconds = GREATEST(analytics_sessions.active_seconds, EXCLUDED.active_seconds),
         subscribed = analytics_sessions.subscribed OR EXCLUDED.subscribed,
         subscribed_from = CASE WHEN EXCLUDED.subscribed_from <> '' THEN EXCLUDED.subscribed_from ELSE analytics_sessions.subscribed_from END,
         dwell = analytics_sessions.dwell || EXCLUDED.dwell,
         clicked = ${UNION('clicked')}, downloads = ${UNION('downloads')},
         searches = ${UNION('searches')}, doctor = ${UNION('doctor')},
         updated_at = now()`,
      [
        b.sessionId, isNaN(ts) ? new Date() : ts, text(b.country, 80), text(b.countryCode, 8), text(b.flag, 16), text(b.region, 80),
        text(b.city, 80), text(b.device, 40), text(b.os, 40), text(b.browser, 40), text(b.origin, 120), seconds,
        b.hasSubscribed === true || b.hasSubscribed === 'SI', text(b.subscribedFrom, 200), dwellJson,
        list(b.clickedCards), list(b.downloads), list(b.searches), list(b.doctorConsults)
      ]
    );
    return res.status(204).end();
  } catch (err) {
    console.error('track session error:', err);
    return res.status(500).end();
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).end();
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).end();
  if (b.sessionId) return saveSession(b, res);
  if (!/^usr_[a-z0-9]{6,40}$/.test(String(b.visitorId))) return res.status(400).end();
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
