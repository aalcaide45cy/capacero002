// Ejecuta las migraciones de db/migrations/*.sql con el rol migrator (DATABASE_URL_MIGRATIONS).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations');
const url = process.env.DATABASE_URL_MIGRATIONS;
// Con --soft (compilación en Vercel) un fallo o la falta de credenciales no impide publicar la web.
const soft = process.argv.includes('--soft');
if (!url) {
  console.error('Falta DATABASE_URL_MIGRATIONS');
  process.exit(soft ? 0 : 1);
}

// La base de datos puede estar en reposo y tardar unos segundos en despertar: se reintenta la conexión.
async function connectWithRetry(attempts = 4) {
  for (let i = 1; ; i++) {
    const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
    try {
      await c.connect();
      return c;
    } catch (err) {
      await c.end().catch(() => {});
      if (i >= attempts) throw err;
      console.warn(`Migraciones: intento ${i} de conexión fallido (${err.message}), se reintenta...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

let client;
try {
  client = await connectWithRetry();
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    console.log(`Aplicando ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  console.log('Migraciones al día');
} catch (err) {
  console.error('Migraciones:', err.message);
  process.exitCode = soft ? 0 : 1;
} finally {
  if (client) await client.end().catch(() => {});
}
