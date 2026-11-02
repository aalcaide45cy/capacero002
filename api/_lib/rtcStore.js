// Almacén del «saludo» WebRTC entre el móvil y el PC del teleprompter (/tp/monitor).
// En producción usa la tabla tp_remote_rooms de Neon (db/migrations/005_tp_remote.sql).
// Sin base de datos (solo en local, nunca en Vercel) usa memoria para poder probarlo.
import { getPool } from './db.js';

// La sala vive hasta que el PC cierre sesión; si nadie la usa en 30 días se borra
const TTL_HOURS = 24 * 30;
const memory = new Map();

const useMemory = () => !process.env.DATABASE_URL && !process.env.VERCEL;

export async function createRoom(id, offer) {
  if (useMemory()) {
    for (const [k, v] of memory) if (Date.now() - v.createdAt > 2 * TTL_HOURS * 3600 * 1000) memory.delete(k);
    memory.set(id, { offer, answer: null, createdAt: Date.now() });
    return;
  }
  const pool = getPool();
  await pool.query(`DELETE FROM tp_remote_rooms WHERE created_at < now() - interval '${2 * TTL_HOURS} hours'`);
  await pool.query('INSERT INTO tp_remote_rooms (id, offer) VALUES ($1, $2)', [id, offer]);
}

export async function getRoom(id) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r || Date.now() - r.createdAt > TTL_HOURS * 3600 * 1000) return null;
    return { offer: r.offer, answer: r.answer };
  }
  const { rows } = await getPool().query(
    `SELECT offer, answer FROM tp_remote_rooms WHERE id = $1 AND created_at > now() - interval '${TTL_HOURS} hours'`,
    [id]
  );
  return rows[0] || null;
}

// Devuelve true si guardó la respuesta (solo se acepta una)
export async function setAnswer(id, answer) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r || r.answer || Date.now() - r.createdAt > TTL_HOURS * 3600 * 1000) return false;
    r.answer = answer;
    return true;
  }
  const res = await getPool().query(
    `UPDATE tp_remote_rooms SET answer = $2 WHERE id = $1 AND answer IS NULL AND created_at > now() - interval '${TTL_HOURS} hours'`,
    [id, answer]
  );
  return res.rowCount === 1;
}

// El PC pone una oferta nueva en la misma sala (para reconectar sin otro QR); borra la respuesta anterior
export async function resetOffer(id, offer) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r || Date.now() - r.createdAt > TTL_HOURS * 3600 * 1000) return false;
    Object.assign(r, { offer, answer: null, createdAt: Date.now() });
    return true;
  }
  const res = await getPool().query(
    `UPDATE tp_remote_rooms SET offer = $2, answer = NULL, created_at = now() WHERE id = $1 AND created_at > now() - interval '${TTL_HOURS} hours'`,
    [id, offer]
  );
  return res.rowCount === 1;
}

// Renueva la sala mientras el monitor está abierto
export async function touchRoom(id) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r) return false;
    r.createdAt = Date.now();
    return true;
  }
  const res = await getPool().query('UPDATE tp_remote_rooms SET created_at = now() WHERE id = $1', [id]);
  return res.rowCount === 1;
}

export async function deleteRoom(id) {
  if (useMemory()) {
    memory.delete(id);
    return;
  }
  await getPool().query('DELETE FROM tp_remote_rooms WHERE id = $1', [id]);
}
