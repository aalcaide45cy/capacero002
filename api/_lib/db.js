import pg from 'pg';

let pool;

/** Pool de conexiones a Neon con el rol app_web (DATABASE_URL, con pooler). */
export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL no configurada');
    pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  }
  return pool;
}
