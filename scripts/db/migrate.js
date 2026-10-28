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

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 8000 });
try {
  await client.connect();
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
  await client.end().catch(() => {});
}
