// api/stats.js - Datos del panel privado /estadisticas, leídos de Neon. Exige el token que entrega /api/auth-stats.
//  GET  ?action=sessions                         -> { success, sessions: [...] }   detalle de sesiones de visita
//  GET  ?action=push_stats                       -> suscriptores push e historial de avisos
//  GET  ?action=ideas_done_list                  -> { success, doneIdeas: { termino: true } }
//  POST ?action=mark_idea_done&term=...&done=... -> { success }
//  POST ?action=import  { sessions, vaults }     -> { success, sessions, vaults }   carga de histórico (no pisa lo existente)
import { verifyToken } from './_lib/auth.js';
import { getPool } from './_lib/db.js';

const browserOf = ua => {
  const s = String(ua || '');
  if (/Edg\//.test(s)) return 'Edge';
  if (/OPR\/|Opera/.test(s)) return 'Opera';
  if (/Firefox\//.test(s)) return 'Firefox';
  if (/Chrome\//.test(s)) return 'Chrome';
  if (/Safari\//.test(s)) return 'Safari';
  return 'Navegador';
};
const isMobile = (device, os) => /m[oó]vil|iphone|android|ios|tablet|ipad/i.test(`${device || ''} ${os || ''}`);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { STATS_SECRET } = process.env;
  if (!STATS_SECRET) {
    return res.status(503).json({ error: 'not_configured', message: 'Panel pendiente de configuración en Vercel (STATS_SECRET ausente).' });
  }
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
  if (!verifyToken(token, STATS_SECRET)) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token de acceso no válido o caducado.' });
  }

  const action = String(req.query?.action || '');
  try {
    const pool = getPool();

    if (req.method === 'GET' && action === 'sessions') {
      const { rows } = await pool.query(
        `SELECT session_id, ts, country, country_code, flag, region, city, device, os, browser, origin,
                active_seconds, subscribed, subscribed_from, dwell
           FROM analytics_sessions ORDER BY ts DESC LIMIT 50000`
      );
      return res.status(200).json({
        success: true,
        sessions: rows.map(r => ({
          sessionId: r.session_id, timestamp: new Date(r.ts).toISOString(), country: r.country, countryCode: r.country_code,
          flag: r.flag, region: r.region, city: r.city, device: r.device, os: r.os, browser: r.browser, origin: r.origin,
          totalActiveSeconds: r.active_seconds, hasSubscribed: r.subscribed, subscribedFrom: r.subscribed_from || null,
          dwellTimes: r.dwell || {}
        }))
      });
    }

    if (req.method === 'GET' && action === 'push_stats') {
      const subs = (await pool.query(
        `SELECT status, country, city, device, os, user_agent, created_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 5000`
      )).rows;
      const hist = (await pool.query(
        `SELECT title, body, url, sent_count, failed_count, sent_at FROM notifications
          WHERE status = 'sent' ORDER BY sent_at DESC NULLS LAST LIMIT 200`
      )).rows;
      let total = 0, mobiles = 0, pcs = 0, expired = 0;
      const countries = {};
      const devices = subs.map(s => {
        const active = s.status === 'active';
        const country = s.country || 'Desconocido';
        if (active) {
          total++;
          if (isMobile(s.device, s.os)) mobiles++; else pcs++;
          countries[country] = countries[country] || { name: country, flag: '🌐', count: 0 };
          countries[country].count++;
        } else {
          expired++;
        }
        return {
          timestamp: new Date(s.created_at).toISOString(), country, flag: '', region: s.city || '', device: s.device || '',
          os: s.os || '', browser: browserOf(s.user_agent), isPwa: '-', status: active ? 'ACTIVO' : 'CADUCADA'
        };
      });
      return res.status(200).json({
        total, mobiles, pcs, expired, devices,
        countries: Object.values(countries).sort((a, b) => b.count - a.count),
        history: hist.map(h => ({
          timestamp: h.sent_at ? new Date(h.sent_at).toISOString() : '', title: h.title, body: h.body, url: h.url,
          mobiles: '-', pcs: '-', delivered: h.sent_count || 0, expired: h.failed_count || 0
        }))
      });
    }

    if (req.method === 'GET' && action === 'ideas_done_list') {
      const { rows } = await pool.query('SELECT term FROM ideas_done ORDER BY done_at');
      return res.status(200).json({ success: true, doneIdeas: Object.fromEntries(rows.map(r => [r.term, true])) });
    }

    if (req.method === 'POST' && action === 'mark_idea_done') {
      const term = String(req.query?.term || '').trim().toLowerCase().slice(0, 200);
      if (!term) return res.status(400).json({ success: false });
      const done = String(req.query?.done) !== 'false';
      if (done) await pool.query('INSERT INTO ideas_done (term) VALUES ($1) ON CONFLICT (term) DO NOTHING', [term]);
      else await pool.query('DELETE FROM ideas_done WHERE term = $1', [term]);
      return res.status(200).json({ success: true, term, done });
    }

    if (req.method === 'POST' && action === 'import') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
      const sessions = Array.isArray(b?.sessions) ? b.sessions.slice(0, 500) : [];
      const vaults = Array.isArray(b?.vaults) ? b.vaults.slice(0, 100) : [];
      const str = (v, n) => (v == null ? '' : String(v).slice(0, n));
      const arr = v => JSON.stringify((Array.isArray(v) ? v : []).map(x => String(x).slice(0, 200)).slice(0, 100));
      let nSessions = 0, nVaults = 0;
      for (const r of sessions) {
        const ts = new Date(r.timestamp);
        if (!/^ses_[a-z0-9_]{6,60}$/.test(String(r.sessionId)) || isNaN(ts)) continue;
        const dwell = r.dwellTimes && typeof r.dwellTimes === 'object' && !Array.isArray(r.dwellTimes) ? r.dwellTimes : {};
        const q = await pool.query(
          `INSERT INTO analytics_sessions (session_id, ts, country, country_code, flag, region, city, device, os, browser, origin,
             active_seconds, subscribed, subscribed_from, dwell, clicked, downloads, searches, doctor, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'sheet')
           ON CONFLICT (session_id) DO NOTHING`,
          [
            r.sessionId, ts, str(r.country, 80), str(r.countryCode, 8), str(r.flag, 16), str(r.region, 80), str(r.city, 80),
            str(r.device, 40), str(r.os, 40), str(r.browser, 40), str(r.origin, 120),
            Math.max(0, Math.min(86400, parseInt(r.totalActiveSeconds, 10) || 0)), r.hasSubscribed === true,
            str(r.subscribedFrom, 200), JSON.stringify(dwell), arr(r.clickedCards), arr(r.downloads), arr(r.searches), arr(r.doctorConsults)
          ]
        );
        nSessions += q.rowCount;
      }
      for (const v of vaults) {
        const id = String(v.vaultId || '').trim().toUpperCase();
        const payload = String(v.payload || '');
        const at = new Date(v.updatedAt);
        if (!/^[A-Z0-9][A-Z0-9-]{5,159}$/.test(id) || !/^[A-Za-z0-9+/=]{1,1500000}$/.test(payload)) continue;
        const q = await pool.query(
          `INSERT INTO vaults (vault_id, device, payload, updated_at) VALUES ($1, $2, to_jsonb($3::text), $4)
           ON CONFLICT (vault_id) DO NOTHING`,
          [id, str(v.device, 80) || 'Navegador Web', payload, isNaN(at) ? new Date() : at]
        );
        nVaults += q.rowCount;
      }
      return res.status(200).json({ success: true, sessions: nSessions, vaults: nVaults });
    }

    return res.status(400).json({ error: 'bad_request', message: 'Acción no reconocida.' });
  } catch (err) {
    console.error('stats error:', err);
    return res.status(500).json({ error: 'server_error', message: 'No se pudieron leer las estadísticas.' });
  }
}
