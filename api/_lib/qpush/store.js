// Llamadas rápidas: acceso a Neon (solo tablas call_*). El handler recibe este objeto, así los tests usan uno en memoria.
import { getPool } from '../db.js';
import { HISTORY_LIMIT } from './core.js';

export function pgStore(pool = getPool()) {
  return {
    async countHits(kind, ip, seconds) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM call_hits WHERE kind = $1 AND ($2::text = '' OR ip = $2) AND ts > now() - make_interval(secs => $3)`, [kind, ip, seconds]);
      return rows[0].n;
    },
    async addHit(kind, ip) {
      await pool.query(`INSERT INTO call_hits (kind, ip) VALUES ($1, $2)`, [kind, ip]);
      await pool.query(`DELETE FROM call_hits WHERE ts < now() - interval '1 day'`);
    },
    async createPairCode(hash, minutes) {
      await pool.query(`DELETE FROM call_pair_codes WHERE expires_at < now() - interval '1 hour'`);
      await pool.query(`INSERT INTO call_pair_codes (code_hash, expires_at) VALUES ($1, now() + make_interval(mins => $2))`, [hash, minutes]);
    },
    /** Consume el código si existe, no ha caducado y no se usó (atómico). */
    async consumePairCode(hash) {
      const { rowCount } = await pool.query(`UPDATE call_pair_codes SET used_at = now() WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()`, [hash]);
      return rowCount === 1;
    },
    async upsertSubscription({ endpoint, p256dh, auth, deviceKeyHash, userAgent }) {
      await pool.query(
        `INSERT INTO call_subscriptions (endpoint, p256dh, auth, device_key_hash, user_agent) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, device_key_hash = EXCLUDED.device_key_hash, user_agent = EXCLUDED.user_agent, last_seen_at = now()`,
        [endpoint, p256dh, auth, deviceKeyHash, userAgent]);
    },
    async listSubscriptions() {
      const { rows } = await pool.query(`SELECT id, endpoint, p256dh, auth FROM call_subscriptions`);
      return rows;
    },
    async removeSubscriptions(ids) {
      if (ids.length) await pool.query(`DELETE FROM call_subscriptions WHERE id = ANY($1::bigint[])`, [ids]);
    },
    async deviceExists(keyHash) {
      const { rows } = await pool.query(`SELECT 1 FROM call_subscriptions WHERE device_key_hash = $1 LIMIT 1`, [keyHash]);
      return rows.length > 0;
    },
    async addHistory({ number, raw, sourceUrl }) {
      const { rows } = await pool.query(`INSERT INTO call_history (number, raw, source_url) VALUES ($1,$2,$3) RETURNING id`, [number, raw, sourceUrl]);
      await pool.query(`DELETE FROM call_history WHERE id NOT IN (SELECT id FROM call_history ORDER BY id DESC LIMIT $1)`, [HISTORY_LIMIT]);
      return rows[0].id;
    },
    async listHistory() {
      const { rows } = await pool.query(`SELECT id::text AS id, number, source_url, created_at FROM call_history ORDER BY id DESC LIMIT $1`, [HISTORY_LIMIT]);
      return rows;
    },
    async deleteHistory(id) {
      if (id == null) await pool.query(`DELETE FROM call_history`);
      else await pool.query(`DELETE FROM call_history WHERE id = $1::bigint`, [id]);
    }
  };
}
