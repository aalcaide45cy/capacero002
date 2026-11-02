// Almacén del «saludo» WebRTC entre el móvil y el PC del teleprompter (/tp/monitor).
// En producción usa la tabla tp_remote_rooms de Neon (db/migrations/005_tp_remote.sql).
// Sin base de datos (solo en local, nunca en Vercel) usa memoria para poder probarlo.
import { getPool } from './db.js';

const TTL_MINUTES = 15;
const memory = new Map();

const useMemory = () => !process.env.DATABASE_URL && !process.env.VERCEL;

export async function createRoom(id, offer) {
  if (useMemory()) {
    for (const [k, v] of memory) if (Date.now() - v.createdAt > 30 * 60 * 1000) memory.delete(k);
    memory.set(id, { offer, answer: null, createdAt: Date.now() });
    return;
  }
  const pool = getPool();
  await pool.query("DELETE FROM tp_remote_rooms WHERE created_at < now() - interval '30 minutes'");
  await pool.query('INSERT INTO tp_remote_rooms (id, offer) VALUES ($1, $2)', [id, offer]);
}

export async function getRoom(id) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r || Date.now() - r.createdAt > TTL_MINUTES * 60 * 1000) return null;
    return { offer: r.offer, answer: r.answer };
  }
  const { rows } = await getPool().query(
    `SELECT offer, answer FROM tp_remote_rooms WHERE id = $1 AND created_at > now() - interval '${TTL_MINUTES} minutes'`,
    [id]
  );
  return rows[0] || null;
}

// Devuelve true si guardó la respuesta (solo se acepta una)
export async function setAnswer(id, answer) {
  if (useMemory()) {
    const r = memory.get(id);
    if (!r || r.answer || Date.now() - r.createdAt > TTL_MINUTES * 60 * 1000) return false;
    r.answer = answer;
    return true;
  }
  const res = await getPool().query(
    `UPDATE tp_remote_rooms SET answer = $2 WHERE id = $1 AND answer IS NULL AND created_at > now() - interval '${TTL_MINUTES} minutes'`,
    [id, answer]
  );
  return res.rowCount === 1;
}

export async function deleteRoom(id) {
  if (useMemory()) {
    memory.delete(id);
    return;
  }
  await getPool().query('DELETE FROM tp_remote_rooms WHERE id = $1', [id]);
}
