// Prueba de integración del recorrido completo contra un Postgres de PRUEBA (nunca producción).
// Uso: TEST_DATABASE_URL=postgres://... npm run test:integration   (crea tablas mínimas de admin y aplica 007_dieta.sql)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import crypto from 'crypto';

const URL_DB = process.env.TEST_DATABASE_URL;
if (!URL_DB) { test('integración dieta (omitida: falta TEST_DATABASE_URL)', { skip: true }, () => {}); } else {
  process.env.DATABASE_URL = URL_DB;
  process.env.ADMIN_ENC_KEY = crypto.randomBytes(32).toString('base64');
  const { getPool } = await import('../api/_lib/db.js');
  const sec = await import('../api/_lib/adminSecurity.js');
  const { dietaHandler } = await import('../api/_lib/dieta/handler.js');
  const pool = getPool();

  const mk = (method, sub, { body, cookie, query = {}, origin = 'https://x.test' } = {}) => {
    const req = { method, body, query, headers: { host: 'x.test', origin, 'x-requested-with': 'dieta', cookie: cookie || '', 'user-agent': 'test' } };
    const out = { status: 200, headers: {}, body: null };
    const res = { setHeader: (k, v) => { out.headers[k.toLowerCase()] = v; return res; }, status: (s) => { out.status = s; return res; }, send: (b) => { out.body = JSON.parse(b); return res; } };
    return dietaHandler(req, res, `dieta/${sub}`).then(() => out);
  };
  const cookieOf = (o) => /__Host-cc_diet=([^;]*)/.exec(o.headers['set-cookie'] || '')?.[1];

  test('recorrido completo', async () => {
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      CREATE TABLE admin_users (id bigserial PRIMARY KEY, email text UNIQUE, password_hash text, totp_secret_enc text, created_at timestamptz DEFAULT now(), last_login_at timestamptz);
      CREATE TABLE settings (key text PRIMARY KEY, value jsonb, updated_at timestamptz);
      CREATE TABLE login_attempts (id bigserial PRIMARY KEY, ip text, email text, success boolean, ts timestamptz DEFAULT now());`);
    await pool.query(fs.readFileSync(new URL('../db/migrations/007_dieta.sql', import.meta.url), 'utf8'));
    // Segunda ejecución: las migraciones usan IF NOT EXISTS, no deben fallar.
    await pool.query(fs.readFileSync(new URL('../db/migrations/007_dieta.sql', import.meta.url), 'utf8'));
    const secret = sec.newTotpSecret();
    await pool.query('INSERT INTO admin_users (email, password_hash, totp_secret_enc) VALUES ($1,$2,$3)', ['dueno@test.es', sec.hashPassword('clave-larga-de-prueba'), sec.encrypt(secret)]);
    // Otro usuario del sitio que no es propietario no existe en admin_users → no hay acceso por ninguna vía.

    // 1. Sin sesión: nada
    for (const sub of ['bootstrap', 'export', 'sessions']) assert.equal((await mk('GET', sub)).status, 401);
    assert.equal((await mk('POST', 'consume', { body: {} })).status, 401);
    // Origen distinto en POST
    assert.equal((await mk('POST', 'login', { body: {}, origin: 'https://evil.test' })).status, 403);
    // Login incorrecto
    assert.equal((await mk('POST', 'login', { body: { email: 'dueno@test.es', password: 'mala', code: '000000' } })).status, 401);

    // 2. Login correcto con TOTP
    const base = Math.floor(Date.now() / 30000);
    // Cálculo TOTP directo (RFC 6238)
    const totp = (secretB32, step) => {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
      for (const ch of secretB32) bits += A.indexOf(ch).toString(2).padStart(5, '0');
      const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
      const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(step));
      const h = crypto.createHmac('sha1', key).update(buf).digest(); const o = h[h.length - 1] & 0xf;
      return String(((h[o] & 0x7f) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, '0');
    };
    const login = await mk('POST', 'login', { body: { email: 'dueno@test.es', password: 'clave-larga-de-prueba', code: totp(secret, base), remember: true, remember_days: 30 } });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.match(login.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict; Max-Age=2592000/);
    const ck = `__Host-cc_diet=${cookieOf(login)}`;
    // El mismo código TOTP no se puede reutilizar
    assert.equal((await mk('POST', 'login', { body: { email: 'dueno@test.es', password: 'clave-larga-de-prueba', code: totp(secret, base) } })).status, 401);

    // 3. Menú
    const b1 = await mk('GET', 'bootstrap', { cookie: ck, query: { week: '2026-11-12' } });
    assert.equal(b1.status, 200);
    assert.equal(b1.body.week_start, '2026-11-09');
    assert.equal(Object.keys(b1.body.plan.data.days).length, 7);
    assert.equal(b1.headers['cache-control'], 'no-store, private');
    // Semilla idempotente y plan idempotente
    const b1b = await mk('GET', 'bootstrap', { cookie: ck, query: { week: '2026-11-12' } });
    assert.equal(b1b.body.plan.id, b1.body.plan.id);
    assert.equal((await pool.query('SELECT count(*)::int c FROM diet_foods')).rows[0].c, b1.body.foods.length);
    assert.equal(b1.body.foods.every(f => Object.keys(f.nutrients).length === 0), true);

    // 4. Cambiar comida: candidatas, aplicar, nueva compra, deshacer
    const day = '2026-11-09'; const mealId = `${day}-comida`;
    const cand = await mk('POST', 'swap/candidates', { cookie: ck, body: { week: day, day, meal_id: mealId, mode: 'todas' } });
    assert.equal(cand.status, 200);
    assert.ok(cand.body.candidates.length > 3);
    assert.ok(cand.body.candidates.every(c => c.status !== 'dentro'), 'sin datos nutricionales nunca hay verde global');
    const target = cand.body.candidates.find(c => c.recipe === 'comida-garbanzos');
    assert.ok(target);
    // Leche/lácteo pendiente: la comida no tiene lácteo, así que se aplica sin aceptar pendientes si no hay alérgenos sin comprobar... pollo y verduras son 'known'; legumbres 'unknown' → exige aceptar
    const noAccept = await mk('POST', 'swap/apply', { cookie: ck, body: { week: day, version: b1.body.plan.version, day, meal_id: mealId, recipe: 'comida-garbanzos', factor: 1, client_key: 'swap-key-0001' } });
    assert.equal(noAccept.status, 400);
    const apply = await mk('POST', 'swap/apply', { cookie: ck, body: { week: day, version: b1.body.plan.version, day, meal_id: mealId, recipe: 'comida-garbanzos', factor: 1, accept_pending: true, client_key: 'swap-key-0001' } });
    assert.equal(apply.status, 200, JSON.stringify(apply.body));
    // Doble envío no duplica
    const again = await mk('POST', 'swap/apply', { cookie: ck, body: { week: day, version: b1.body.plan.version + 1, day, meal_id: mealId, recipe: 'comida-garbanzos', factor: 1, accept_pending: true, client_key: 'swap-key-0001' } });
    assert.equal(again.body.duplicate, true);
    // Versión vieja: conflicto de concurrencia
    const stale = await mk('POST', 'swap/apply', { cookie: ck, body: { week: day, version: b1.body.plan.version, day, meal_id: mealId, recipe: 'comida-lentejas', factor: 1, accept_pending: true, client_key: 'swap-key-0002' } });
    assert.equal(stale.status, 409);
    const b2 = await mk('GET', 'bootstrap', { cookie: ck, query: { week: day } });
    assert.equal(b2.body.plan.data.days[day].meals.find(m => m.id === mealId).recipe, 'comida-garbanzos');
    assert.equal(b2.body.history.length, 1);
    // Compra: el plan nuevo contiene garbanzos (lo que alimenta la lista de compra del cliente)
    const items = Object.values(b2.body.plan.data.days).flatMap(d => d.meals.flatMap(m => m.items.map(i => i.food)));
    assert.ok(items.includes('garbanzos-cocidos'));
    // Deshacer restaura
    assert.equal((await mk('POST', 'swap/undo', { cookie: ck, body: { history_id: b2.body.history[0].id } })).status, 200);
    const b3 = await mk('GET', 'bootstrap', { cookie: ck, query: { week: day } });
    assert.equal(b3.body.plan.data.days[day].meals.find(m => m.id === mealId).recipe, 'comida-pollo-arroz');

    // 5. Alergia a proteínas de leche: el desayuno con lácteo no compatible no se ofrece
    const prof = await mk('POST', 'profile/save', { cookie: ck, body: { version: b3.body.profile_version, data: { milk_status: 'milk_protein_allergy' } } });
    assert.equal(prof.status, 200);
    const cand2 = await mk('POST', 'swap/candidates', { cookie: ck, body: { week: day, day, meal_id: `${day}-desayuno`, mode: 'todas' } });
    assert.ok(cand2.body.excluded.length >= 1);
    assert.ok(!cand2.body.candidates.some(c => c.recipe === 'desayuno-b'));
    const forced = await mk('POST', 'swap/apply', { cookie: ck, body: { week: day, version: b3.body.plan.version, day, meal_id: `${day}-desayuno`, recipe: 'desayuno-b', factor: 1, accept_pending: true, client_key: 'swap-key-0003' } });
    assert.equal(forced.status, 400, 'el servidor revalida las restricciones');

    // 6. Cargar nutrientes de un alimento (valor de prueba) y registrar consumo con snapshot
    const sv = await mk('POST', 'food/save', { cookie: ck, body: { slug: 'arroz', source: 'PRUEBA', nutrients: { kcal: { v: 350, q: 'available' }, protein: { v: 7 } } } });
    assert.equal(sv.status, 200, JSON.stringify(sv.body));
    const consume = { day, slot: 'comida', meal_name: 'Pollo con arroz', items: [{ food: 'arroz', g: 60 }], client_key: 'consume-key-0001' };
    assert.equal((await mk('POST', 'consume', { cookie: ck, body: consume })).status, 200);
    assert.equal((await mk('POST', 'consume', { cookie: ck, body: consume })).body.duplicate, true);
    // Cambiar la ficha después no altera lo registrado
    await mk('POST', 'food/save', { cookie: ck, body: { slug: 'arroz', source: 'PRUEBA2', nutrients: { kcal: { v: 999 } } } });
    const b4 = await mk('GET', 'bootstrap', { cookie: ck, query: { week: day } });
    assert.equal(b4.body.consumption.length, 1);
    assert.equal(b4.body.consumption[0].snapshot.computed.kcal.value, 210);
    assert.equal(b4.body.consumption[0].snapshot.computed.protein.complete, true);
    assert.equal(b4.body.consumption[0].snapshot.computed.sodium.complete, false);
    // Peso y precios
    assert.equal((await mk('POST', 'measure/save', { cookie: ck, body: { kind: 'peso', day: '2026-11-08', weight_kg: 80.5, client_key: 'weight-key-0001' } })).status, 200);
    assert.equal((await mk('POST', 'measure/save', { cookie: ck, body: { kind: 'peso', day: '2026-11-08', weight_kg: 80.5, client_key: 'weight-key-0001' } })).status, 200);
    assert.equal((await pool.query('SELECT count(*)::int c FROM diet_measurements')).rows[0].c, 1);
    assert.equal((await mk('POST', 'measure/save', { cookie: ck, body: { kind: 'peso', day: '2026-02-30', weight_kg: 80, client_key: 'weight-key-0002' } })).status, 400);
    assert.equal((await mk('POST', 'price/save', { cookie: ck, body: { food_slug: 'arroz', pack_net_g: 1000, price_eur: 1.3, store: 'Prueba' } })).status, 200);

    // 7. Cerrar y reabrir: persistencia con una segunda sesión
    const login2 = await mk('POST', 'login', { body: { email: 'dueno@test.es', password: 'clave-larga-de-prueba', code: totp(secret, base + 1), remember: false } });
    assert.equal(login2.status, 200, JSON.stringify(login2.body));
    assert.match(login2.headers['set-cookie'], /Max-Age=43200/);
    const ck2 = `__Host-cc_diet=${cookieOf(login2)}`;
    const b5 = await mk('GET', 'bootstrap', { cookie: ck2, query: { week: day } });
    assert.equal(b5.body.consumption.length, 1);
    assert.equal(b5.body.measurements.length, 1);

    // 8. Sesión vencida o revocada → rechazo en servidor
    await pool.query(`UPDATE diet_sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = $1`, [sec.sha256(cookieOf(login2))]);
    assert.equal((await mk('GET', 'bootstrap', { cookie: ck2 })).status, 401);

    // 9. Logout invalida; el acceso directo a los datos es rechazado
    assert.equal((await mk('POST', 'logout', { cookie: ck })).status, 200);
    assert.equal((await mk('GET', 'bootstrap', { cookie: ck })).status, 401);
    assert.equal((await mk('GET', 'export', { cookie: ck })).status, 401);
    assert.equal((await pool.query('SELECT token_hash FROM diet_sessions WHERE token_hash = $1', [cookieOf(login)])).rowCount, 0, 'el token no se guarda en claro');

    // 10. Exportar y borrar (con confirmación)
    await pool.query("UPDATE settings SET value = '0'::jsonb WHERE key = 'admin_totp_last'"); // la prueba reutiliza el código del paso actual
    const login3 = await mk('POST', 'login', { body: { email: 'dueno@test.es', password: 'clave-larga-de-prueba', code: totp(secret, base) } });
    const ck3 = `__Host-cc_diet=${cookieOf(login3)}`;
    assert.equal(login3.status, 200, JSON.stringify(login3.body));
    const exp = await mk('GET', 'export', { cookie: ck3 });
    assert.equal(exp.body.diet_consumption_entries.length, 1);
    assert.equal((await mk('POST', 'data/delete', { cookie: ck3, body: { confirm: 'no' } })).status, 400);
    assert.equal((await mk('POST', 'data/delete', { cookie: ck3, body: { confirm: 'BORRAR MIS DATOS DE DIETA' } })).status, 200);
    assert.equal((await pool.query('SELECT count(*)::int c FROM diet_consumption_entries')).rows[0].c, 0);
    assert.ok((await pool.query('SELECT count(*)::int c FROM diet_foods WHERE owner_id IS NULL')).rows[0].c > 0, 'el catálogo compartido sigue');
    await pool.end();
  });
}
