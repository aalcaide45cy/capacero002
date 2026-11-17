import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, normalizeBase, resolveBase, buildManifest, buildHtml, buildServiceWorker, buildAppJs, allowedOrigin, pairingCode } from '../api/_lib/qpush/core.js';
import { qpushHandler } from '../api/_lib/qpush/handler.js';

test('normalizePhone: formatos habituales', () => {
  assert.equal(normalizePhone('600 11 22 33'), '+34600112233');
  assert.equal(normalizePhone('(600)-112.233'), '+34600112233');
  assert.equal(normalizePhone('tel:+34600112233'), '+34600112233');
  assert.equal(normalizePhone('tel:%2B34600112233'), '+34600112233');
  assert.equal(normalizePhone('0034 600 112 233'), '+34600112233');
  assert.equal(normalizePhone('34600112233'), '+34600112233');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('912345678'), '+34912345678');
});
test('normalizePhone: inválidos', () => {
  for (const v of ['', null, 'hola', '12345', '+1', '500112233', '600 11 22 3x', '+0123456789', '1234567890123456789']) assert.equal(normalizePhone(v), null, String(v));
});
test('normalizeBase / resolveBase', () => {
  assert.equal(normalizeBase('/'), ''); assert.equal(normalizeBase(''), ''); assert.equal(normalizeBase('tp/'), '/tp');
  assert.equal(normalizeBase('/a/b'), '/a/b'); assert.equal(normalizeBase('/a b'), null); assert.equal(normalizeBase('/../x'), '/../x'.match(/^(\/[A-Za-z0-9._~-]+)+$/) ? '/../x' : null);
  assert.equal(resolveBase({}, undefined), '/qpush');
  assert.equal(resolveBase({ CALL_SLUG: 'secreto' }), '/secreto');
  assert.equal(resolveBase({ BASE_PATH: '/tp', CALL_SLUG: 'x' }), '/tp');
  assert.equal(resolveBase({ BASE_PATH: '/' }), '');
});

for (const base of ['', '/qpush', '/otra/ruta']) {
  test(`manifest, html y sw coherentes con BASE="${base}"`, () => {
    const m = buildManifest(base);
    assert.equal(m.id, `${base}/`); assert.equal(m.start_url, `${base}/`); assert.equal(m.scope, `${base}/`);
    assert.equal(m.display, 'standalone');
    assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.purpose === 'maskable'));
    for (const i of m.icons) assert.ok(i.src.startsWith(`${base}/icons/`));
    const h = buildHtml(base);
    assert.ok(h.includes(`rel="manifest" href="${base}/manifest.webmanifest"`));
    assert.ok(h.includes(`rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png"`));
    assert.ok(h.includes('apple-mobile-web-app-capable') && h.includes('apple-mobile-web-app-title') && h.includes('noindex'));
    assert.ok(!/(src|href)="\/(?!qpush|otra)/.test(h) || base === '');
    const js = buildAppJs(base, 'PUB');
    assert.ok(js.includes(`"base":"${base}"`));
    assert.ok(buildServiceWorker(base).includes('registration.scope'));
  });
}

test('CORS: solo extensiones de Chrome', () => {
  const id = 'a'.repeat(32);
  assert.equal(allowedOrigin(`chrome-extension://${id}`, {}), `chrome-extension://${id}`);
  assert.equal(allowedOrigin('https://evil.com', {}), null);
  assert.equal(allowedOrigin(`chrome-extension://${id}`, { CALL_EXTENSION_ID: 'b'.repeat(32) }), null);
});

// ---------- Handler con almacén en memoria ----------
function memStore() {
  const s = { hits: [], codes: new Map(), subs: [], hist: [], nid: 1 };
  return Object.assign(s, {
    async countHits(k, ip, secs) { return s.hits.filter((h) => h.k === k && (!ip || h.ip === ip) && Date.now() - h.t < secs * 1000).length; },
    async addHit(k, ip) { s.hits.push({ k, ip, t: Date.now() }); },
    async createPairCode(h) { s.codes.set(h, false); },
    async consumePairCode(h) { if (s.codes.get(h) === false) { s.codes.set(h, true); return true; } return false; },
    async upsertSubscription(x) { s.subs = s.subs.filter((y) => y.endpoint !== x.endpoint); s.subs.push({ id: s.nid++, ...x }); },
    async listSubscriptions() { return s.subs.map((x) => ({ id: x.id, endpoint: x.endpoint, p256dh: x.p256dh, auth: x.auth })); },
    async removeSubscriptions(ids) { s.subs = s.subs.filter((x) => !ids.includes(x.id)); },
    async deviceExists(h) { return s.subs.some((x) => x.deviceKeyHash === h); },
    async addHistory(x) { s.hist.unshift({ id: String(s.nid++), number: x.number, source_url: x.sourceUrl, created_at: new Date().toISOString() }); s.hist = s.hist.slice(0, 20); },
    async listHistory() { return s.hist; },
    async deleteHistory(id) { s.hist = id == null ? [] : s.hist.filter((h) => h.id !== id); }
  });
}
function call(method, route, { headers = {}, body, query = {} } = {}, deps) {
  return new Promise(async (resolve) => {
    const out = { status: 200, headers: {}, body: '' };
    const res = {
      setHeader: (k, v) => { out.headers[k.toLowerCase()] = v; }, status(c) { out.status = c; return this; },
      send(b) { out.body = b; resolve(out); return this; }, json(b) { out.headers['content-type'] ||= 'application/json'; out.body = JSON.stringify(b); resolve(out); return this; },
      end() { resolve(out); return this; }
    };
    await qpushHandler({ method, headers, body, query }, res, route, deps);
  });
}
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
const EXT = 'chrome-extension://' + 'a'.repeat(32);

for (const base of ['/qpush', '/tp2', '']) {
  test(`flujo completo con BASE="${base}"`, async () => {
    const store = memStore(); const pushed = [];
    const env = { BASE_PATH: base || '/', CALL_API_TOKEN: 'tok-secreto', VAPID_PUBLIC_KEY: 'PUB' };
    const deps = { store, env, push: async (sub, payload) => { pushed.push(JSON.parse(payload)); } };
    const q = { b: base };
    const auth = { authorization: 'Bearer tok-secreto', origin: EXT };

    let r = await call('GET', '', { query: q }, deps);
    assert.equal(r.status, 200); assert.match(r.headers['content-type'], /text\/html/); assert.match(r.headers['x-robots-tag'], /noindex/);
    r = await call('GET', 'manifest.webmanifest', { query: q }, deps);
    assert.match(r.headers['content-type'], /application\/manifest\+json/); assert.equal(JSON.parse(r.body).scope, `${base}/`);
    r = await call('GET', 'sw.js', { query: q }, deps);
    assert.match(r.headers['content-type'], /javascript/); assert.equal(r.headers['service-worker-allowed'], `${base}/`);
    r = await call('GET', 'icons/icon-512.png', { query: q }, deps);
    assert.equal(r.headers['content-type'], 'image/png');
    r = await call('GET', 'icons/nada.png', { query: q }, deps); assert.equal(r.status, 404);
    r = await call('GET', 'app.js', { query: q }, deps); assert.ok(r.body.includes('"vapid":"PUB"'));

    // CORS
    r = await call('OPTIONS', 'api/call/send', { headers: { origin: EXT }, query: q }, deps);
    assert.equal(r.status, 204); assert.equal(r.headers['access-control-allow-origin'], EXT); assert.match(r.headers['access-control-allow-headers'], /Authorization/);
    r = await call('OPTIONS', 'api/call/send', { headers: { origin: 'https://evil.com' }, query: q }, deps);
    assert.equal(r.status, 403); assert.equal(r.headers['access-control-allow-origin'], undefined);

    // Sin token -> 401; sin suscripciones -> 409
    r = await call('POST', 'api/call/send', { body: { number: '600112233' }, query: q }, deps); assert.equal(r.status, 401);
    r = await call('POST', 'api/call/send', { headers: auth, body: { number: 'hola' }, query: q }, deps); assert.equal(r.status, 400);
    r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600112233' }, query: q }, deps); assert.equal(r.status, 409);

    // Emparejamiento con código de un solo uso
    r = await call('POST', 'api/call/pair', { headers: auth, query: q }, deps);
    const code = JSON.parse(r.body).code; assert.match(code, /^[A-Z2-9]{8}$/);
    r = await call('POST', 'api/call/subscribe', { body: { ...SUB, code }, query: q }, deps);
    assert.equal(r.status, 200); const key = JSON.parse(r.body).deviceKey;
    r = await call('POST', 'api/call/subscribe', { body: { ...SUB, code }, query: q }, deps); assert.equal(r.status, 401); // ya usado

    r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600 11 22 33', raw: 'x', source_url: 'https://ejemplo.es/a' }, query: q }, deps);
    assert.equal(r.status, 200); assert.equal(JSON.parse(r.body).number, '+34600112233');
    assert.equal(pushed[0].url, `${base}/?n=%2B34600112233`);

    // Historial y borrado con la clave del dispositivo
    r = await call('GET', 'api/call/history', { query: q }, deps); assert.equal(r.status, 401);
    r = await call('GET', 'api/call/history', { headers: { 'x-device-key': key }, query: q }, deps);
    assert.equal(JSON.parse(r.body).items.length, 2); // el envío sin dispositivo (409) también queda en el historial
    r = await call('POST', 'api/call/delete', { headers: { 'x-device-key': key }, body: { all: true }, query: q }, deps);
    assert.equal(store.hist.length, 0);
  });
}

test('suscripción caducada (410) se elimina; sin token configurado -> 503; límite de intentos -> 429', async () => {
  const store = memStore();
  await store.upsertSubscription({ ...SUB, deviceKeyHash: 'h' });
  const env = { CALL_API_TOKEN: 't' };
  const gone = async () => { throw Object.assign(new Error('gone'), { statusCode: 410 }); };
  let r = await call('POST', 'api/call/send', { headers: { authorization: 'Bearer t' }, body: { number: '600112233' } }, { store, env, push: gone });
  assert.equal(r.status, 502); assert.equal(store.subs.length, 0);
  r = await call('POST', 'api/call/send', { headers: { authorization: 'Bearer t' }, body: { number: '600112233' } }, { store, env: {}, push: gone });
  assert.equal(r.status, 503);
  for (let i = 0; i < 10; i++) await call('POST', 'api/call/send', { headers: { authorization: 'Bearer mal' }, body: {} }, { store, env, push: gone });
  r = await call('POST', 'api/call/send', { headers: { authorization: 'Bearer t' }, body: { number: '600112233' } }, { store, env, push: gone });
  assert.equal(r.status, 429);
});

test('BASE_PATH distinta de vercel.json -> error de configuración claro', async () => {
  const r = await call('GET', '', { query: { b: '/qpush' } }, { store: memStore(), env: { BASE_PATH: '/otra' } });
  assert.equal(r.status, 500); assert.match(JSON.parse(r.body).message, /vercel\.json/);
});

test('el código de emparejamiento no usa caracteres ambiguos', () => { for (let i = 0; i < 50; i++) assert.match(pairingCode(), /^[A-HJ-NP-Z2-9]{8}$/); });

// ---------- ZIP de la extensión ----------
import { buildZip, buildExtensionZip, crc32 } from '../api/_lib/qpush/core.js';
import { readExtensionFiles } from '../scripts/qpush-bundle-ext.js';
import { EXTENSION_FILES } from '../api/_lib/qpush/extension-files.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('crc32 conocido', () => assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926));

test('extension-files.js está al día con chrome-extension/ (ejecuta npm run qpush:ext)', () => {
  assert.deepEqual(EXTENSION_FILES, readExtensionFiles());
});

test('extension.zip: válido, con config.json y sin secretos', async () => {
  const store = memStore();
  const out = await new Promise(async (resolve) => {
    const o = { status: 200, headers: {}, body: null };
    const res = { setHeader: (k, v) => { o.headers[k.toLowerCase()] = v; }, status(c) { o.status = c; return this; }, send(b) { o.body = b; resolve(o); return this; }, json(b) { o.body = b; resolve(o); return this; }, end() { resolve(o); return this; } };
    await qpushHandler({ method: 'GET', headers: { host: 'www.capacero3d.com' }, query: { b: '/qpush' } }, res, 'extension.zip', { store, env: { CALL_API_TOKEN: 'tok-secreto' } });
  });
  assert.equal(out.status, 200); assert.equal(out.headers['content-type'], 'application/zip');
  assert.match(out.headers['content-disposition'], /attachment/);
  assert.ok(!out.body.includes(Buffer.from('tok-secreto')));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-'));
  const f = path.join(dir, 'x.zip'); fs.writeFileSync(f, out.body);
  const py = 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;n=z.namelist();assert "llamar-con-iphone/manifest.json" in n and "llamar-con-iphone/icons/icon128.png" in n;print(json.loads(z.read("llamar-con-iphone/config.json"))["baseUrl"])';
  const base = execFileSync('python3', ['-I', '-c', py, f]).toString().trim();
  assert.equal(base, 'https://www.capacero3d.com/qpush');
});
