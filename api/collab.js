// api/collab.js - Recibe el formulario de Colaboraciones, lo guarda en Neon y avisa por push al administrador.
import crypto from 'crypto';
import { getPool } from './_lib/db.js';
import { notifyAdmins } from './_lib/push.js';

const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ipOf = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).json({ ok: false });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false });

  const name = String(b.nombre || '').trim().slice(0, 100);
  const email = String(b.email || '').trim().slice(0, 200);
  const message = String(b.mensaje || '').trim().slice(0, 4000);
  const kind = String(b.tipo || '').trim().slice(0, 60);
  if (!name || !message || !EMAIL.test(email)) return res.status(400).json({ ok: false, error: 'datos' });

  const pool = getPool();
  try {
    const ipHash = crypto.createHash('sha256').update(ipOf(req)).digest('hex');
    const { rows: recent } = await pool.query(`SELECT count(*)::int n FROM collaborations WHERE ip_hash = $1 AND created_at > now() - interval '1 hour'`, [ipHash]);
    if (recent[0].n >= 5) return res.status(429).json({ ok: false, error: 'limite' });

    // Un reintento del mismo mensaje (cola de pendientes del navegador) no se guarda dos veces.
    const dup = await pool.query(`SELECT 1 FROM collaborations WHERE lower(email) = lower($1) AND message = $2 AND created_at > now() - interval '1 day' LIMIT 1`, [email, message]);
    if (dup.rowCount) return res.status(200).json({ ok: true });

    const { rows } = await pool.query(
      `INSERT INTO collaborations (name, email, kind, message, ip_hash, user_agent) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, email, kind || 'Otro', message, ipHash, String(req.headers['user-agent'] || '').slice(0, 300)]);

    // Puente temporal: el Apps Script antiguo sigue mandando el email a colaboraciones@ hasta conectar un servicio de correo.
    if (process.env.COLLAB_LEGACY_WEBHOOK) {
      await fetch(process.env.COLLAB_LEGACY_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ nombre: name, email, tipo: kind, mensaje: message }), signal: AbortSignal.timeout(6000)
      }).catch(err => console.error('collab legacy webhook error:', err.message));
    }

    // El aviso es secundario: si falla, el mensaje ya está guardado.
    await notifyAdmins(pool, { title: 'Nuevo mensaje de colaboración', body: `${name}: ${message.slice(0, 120)}`, url: '/admin/collaborations' }).catch(err => console.error('collab push error:', err.message));
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('collab error:', err);
    return res.status(500).json({ ok: false });
  }
}
