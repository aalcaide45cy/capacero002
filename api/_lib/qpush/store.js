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
    async upsertSubscription({ endpoint, p256dh, auth, deviceKeyHash, userAgent, linkId = null }) {
      await pool.query(
        `INSERT INTO call_subscriptions (endpoint, p256dh, auth, device_key_hash, user_agent, link_id) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, device_key_hash = EXCLUDED.device_key_hash,
           user_agent = EXCLUDED.user_agent, link_id = COALESCE(EXCLUDED.link_id, call_subscriptions.link_id), last_seen_at = now()`,
        [endpoint, p256dh, auth, deviceKeyHash, userAgent, linkId]);
    },
    /** Suscripciones de un link (o todas si linkId es null). */
    async listSubscriptions(linkId = null) {
      const { rows } = linkId == null
        ? await pool.query(`SELECT id, endpoint, p256dh, auth FROM call_subscriptions`)
        : await pool.query(`SELECT id, endpoint, p256dh, auth FROM call_subscriptions WHERE link_id = $1`, [linkId]);
      return rows;
    },
    async removeSubscriptions(ids) {
      if (ids.length) await pool.query(`DELETE FROM call_subscriptions WHERE id = ANY($1::bigint[])`, [ids]);
    },
    /** Dispositivo por su clave: devuelve { linkId } (linkId puede ser null en suscripciones antiguas) o null. */
    async deviceByKey(keyHash) {
      const { rows } = await pool.query(`SELECT link_id FROM call_subscriptions WHERE device_key_hash = $1 LIMIT 1`, [keyHash]);
      return rows[0] ? { linkId: rows[0].link_id == null ? null : String(rows[0].link_id) } : null;
    },
    // ---- Links (extensión) y códigos QR ----
    async createLink(keyHash) {
      const { rows } = await pool.query(`INSERT INTO call_links (key_hash) VALUES ($1) RETURNING id`, [keyHash]);
      return String(rows[0].id);
    },
    async linkByKey(keyHash) {
      const { rows } = await pool.query(`UPDATE call_links SET last_used_at = now() WHERE key_hash = $1 RETURNING id`, [keyHash]);
      return rows[0] ? { id: String(rows[0].id) } : null;
    },
    async countPhones(linkId) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM call_subscriptions WHERE link_id = $1`, [linkId]);
      return rows[0].n;
    },
    async createLinkCode(linkId, codeHash, minutes) {
      await pool.query(`DELETE FROM call_link_codes WHERE expires_at < now() - interval '1 hour'`);
      await pool.query(`DELETE FROM call_links WHERE last_used_at IS NULL AND created_at < now() - interval '1 day' AND NOT EXISTS (SELECT 1 FROM call_subscriptions s WHERE s.link_id = call_links.id)`);
      await pool.query(`INSERT INTO call_link_codes (code_hash, link_id, expires_at) VALUES ($1,$2,now() + make_interval(mins => $3))`, [codeHash, linkId, minutes]);
    },
    /** Consume el código (un solo uso, no caducado) y devuelve el id del link, o null. */
    async consumeLinkCode(codeHash) {
      const { rows } = await pool.query(`UPDATE call_link_codes SET used_at = now() WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING link_id`, [codeHash]);
      return rows[0] ? String(rows[0].link_id) : null;
    },
    // ---- Historial ----
    async addHistory({ kind, number, raw, sourceUrl, linkId = null }) {
      const { rows } = await pool.query(`INSERT INTO call_history (kind, number, raw, source_url, link_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [kind, number, raw, sourceUrl, linkId]);
      await pool.query(`DELETE FROM call_history WHERE id NOT IN (SELECT id FROM call_history ORDER BY id DESC LIMIT $1)`, [HISTORY_LIMIT * 5]);
      if (linkId != null) await pool.query(`DELETE FROM call_history WHERE link_id = $1 AND id NOT IN (SELECT id FROM call_history WHERE link_id = $1 ORDER BY id DESC LIMIT $2)`, [linkId, HISTORY_LIMIT]);
      return String(rows[0].id);
    },
    async listHistory(linkId = null) {
      const { rows } = await pool.query(
        `SELECT id::text AS id, kind, number, raw, source_url, created_at FROM call_history WHERE link_id IS NOT DISTINCT FROM $1::bigint ORDER BY id DESC LIMIT $2`, [linkId, HISTORY_LIMIT]);
      return rows;
    },
    async deleteHistory(linkId, id) {
      if (id == null) await pool.query(`DELETE FROM call_history WHERE link_id IS NOT DISTINCT FROM $1::bigint`, [linkId]);
      else await pool.query(`DELETE FROM call_history WHERE id = $2::bigint AND link_id IS NOT DISTINCT FROM $1::bigint`, [linkId, id]);
    }
  };
}
