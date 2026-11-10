// api/vault.js - Bóveda de notas y progreso de los visitantes (sincronización entre dispositivos y por QR).
// Mismo protocolo que usaba el Apps Script de Google Sheets, ahora sobre Neon:
//  POST { type:'vault_push', vaultId, payload }          -> { status:'success' }
//  POST { type:'vault_pull', vaultId }                   -> { status:'success'|'not_found', payload }
//  POST { type:'vault_delete', vaultId }                 -> { status:'success' }
//  POST { type:'qr_sync_init', pairId, payload }         -> { status:'success' }   el PC muestra el QR
//  POST { type:'qr_sync_exchange', pairId, payload }     -> { sourcePayload }      el móvil lo escanea
//  GET  ?action=qr_sync_poll&pairId=...                  -> { status:'ready'|'waiting', payload }
// El identificador de la bóveda (512 bits al azar) es el secreto: quien lo tiene puede leerla y escribirla.
import { getPool } from './_lib/db.js';

const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const MAX_PAYLOAD = 1500000;
const PAIR_MINUTES = 5;

const cleanId = v => String(v || '').trim().toUpperCase();
const validId = v => /^[A-Z0-9][A-Z0-9-]{5,159}$/.test(v);
const validPayload = v => typeof v === 'string' && v.length > 0 && v.length <= MAX_PAYLOAD && /^[A-Za-z0-9+/=]+$/.test(v);

async function saveVault(pool, id, payload, device) {
  await pool.query(
    `INSERT INTO vaults (vault_id, device, payload, updated_at) VALUES ($1, $2, to_jsonb($3::text), now())
     ON CONFLICT (vault_id) DO UPDATE SET device = EXCLUDED.device, payload = EXCLUDED.payload, updated_at = now()`,
    [id, device, payload]
  );
}

async function readVault(pool, id) {
  const { rows } = await pool.query(`SELECT payload #>> '{}' AS payload FROM vaults WHERE vault_id = $1`, [id]);
  return rows[0]?.payload || '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      if (String(req.query?.action || '') !== 'qr_sync_poll') return res.status(400).json({ status: 'error' });
      const id = cleanId(req.query?.pairId);
      if (!validId(id)) return res.status(200).json({ status: 'waiting', payload: '' });
      // Se entrega una sola vez: al leer los datos del móvil se borra el emparejamiento
      const { rows } = await getPool().query(
        `DELETE FROM vault_pairs WHERE pair_id = $1 AND dst IS NOT NULL
           AND created_at > now() - interval '${PAIR_MINUTES} minutes' RETURNING dst`,
        [id]
      );
      const payload = rows[0]?.dst || '';
      return res.status(200).json({ status: payload ? 'ready' : 'waiting', payload });
    }
    if (req.method !== 'POST') return res.status(405).end();
    if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).end();

    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
    if (!b || typeof b !== 'object') return res.status(400).json({ status: 'error' });

    const id = cleanId(b.vaultId || b.pairId);
    if (!validId(id)) return res.status(400).json({ status: 'error' });
    const device = String(b.device || 'Navegador Web').slice(0, 80);
    const pool = getPool();

    if (b.type === 'vault_push') {
      if (!validPayload(b.payload)) return res.status(400).json({ status: 'error' });
      await saveVault(pool, id, b.payload, device);
      return res.status(200).json({ status: 'success', vaultId: id, timestamp: new Date().toISOString() });
    }
    if (b.type === 'vault_pull') {
      const payload = await readVault(pool, id);
      return res.status(200).json({ status: payload ? 'success' : 'not_found', vaultId: id, payload });
    }
    if (b.type === 'vault_delete') {
      await pool.query('DELETE FROM vaults WHERE vault_id = $1', [id]);
      await pool.query('DELETE FROM vault_pairs WHERE pair_id = $1', [id]);
      return res.status(200).json({ status: 'success' });
    }
    if (b.type === 'qr_sync_init') {
      if (!validPayload(b.payload)) return res.status(400).json({ status: 'error' });
      await pool.query(`DELETE FROM vault_pairs WHERE created_at < now() - interval '1 hour'`);
      await pool.query(
        `INSERT INTO vault_pairs (pair_id, src, dst, created_at) VALUES ($1, $2, NULL, now())
         ON CONFLICT (pair_id) DO UPDATE SET src = EXCLUDED.src, dst = NULL, created_at = now()`,
        [id, b.payload]
      );
      await saveVault(pool, id, b.payload, device);
      return res.status(200).json({ status: 'success', pairId: id });
    }
    if (b.type === 'qr_sync_exchange') {
      const hasPayload = validPayload(b.payload);
      if (b.payload && !hasPayload) return res.status(400).json({ status: 'error' });
      const { rows } = await pool.query(
        `SELECT src FROM vault_pairs WHERE pair_id = $1 AND created_at > now() - interval '${PAIR_MINUTES} minutes'`,
        [id]
      );
      const sourcePayload = rows[0]?.src || (await readVault(pool, id));
      if (hasPayload) {
        await pool.query(
          `INSERT INTO vault_pairs (pair_id, dst, created_at) VALUES ($1, $2, now())
           ON CONFLICT (pair_id) DO UPDATE SET dst = EXCLUDED.dst, created_at = now()`,
          [id, b.payload]
        );
      }
      return res.status(200).json({ status: 'success', sourcePayload });
    }
    return res.status(400).json({ status: 'error' });
  } catch (err) {
    console.error('vault error:', err);
    return res.status(500).json({ status: 'error' });
  }
}
