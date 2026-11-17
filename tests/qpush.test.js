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
  const s = { hits: [], codes: new Map(), links: new Map(), subs: [], hist: [], nid: 1 };
  return Object.assign(s, {
    async countHits(k, ip, secs) { return s.hits.filter((h) => h.k === k && (!ip || h.ip === ip) && Date.now() - h.t < secs * 1000).length; },
    async addHit(k, ip) { s.hits.push({ k, ip, t: Date.now() }); },
    async createLink(h) { const id = String(s.nid++); s.links.set(h, id); return id; },
    async linkByKey(h) { return s.links.has(h) ? { id: s.links.get(h) } : null; },
    async countPhones(linkId) { return s.subs.filter((x) => x.linkId === linkId).length; },
    async createLinkCode(linkId, h) { s.codes.set(h, { linkId, used: false }); },
    async consumeLinkCode(h) { const c = s.codes.get(h); if (c && !c.used) { c.used = true; return c.linkId; } return null; },
    async upsertSubscription(x) { s.subs = s.subs.filter((y) => y.endpoint !== x.endpoint); s.subs.push({ id: s.nid++, linkId: x.linkId ?? null, ...x }); },
    async listSubscriptions(linkId = null) { return s.subs.filter((x) => linkId == null || x.linkId === linkId).map((x) => ({ id: x.id, endpoint: x.endpoint, p256dh: x.p256dh, auth: x.auth })); },
    async removeSubscriptions(ids) { s.subs = s.subs.filter((x) => !ids.includes(x.id)); },
    async deviceByKey(h) { const d = s.subs.find((x) => x.deviceKeyHash === h); return d ? { linkId: d.linkId ?? null } : null; },
    async addHistory(x) { const id = String(s.nid++); s.hist.unshift({ id, kind: x.kind, number: x.number, raw: x.raw, source_url: x.sourceUrl, linkId: x.linkId ?? null, created_at: new Date().toISOString() }); return id; },
    async listHistory(linkId) { return s.hist.filter((h) => h.linkId === (linkId ?? null)); },
    async deleteHistory(linkId, id) { s.hist = s.hist.filter((h) => !(h.linkId === (linkId ?? null) && (id == null || h.id === id))); }
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
  test(`recursos y flujo completo con BASE="${base}"`, async () => {
    const store = memStore(); const pushed = [];
    const env = { BASE_PATH: base || '/', VAPID_PUBLIC_KEY: 'PUB' };
    const deps = { store, env, push: async (sub, payload) => { pushed.push(JSON.parse(payload)); } };
    const q = { b: base };
    const host = { host: 'www.capacero3d.com' };

    let r = await call('GET', '', { query: q }, deps);
    assert.equal(r.status, 200); assert.match(r.headers['content-type'], /text\/html/); assert.match(r.headers['x-robots-tag'], /noindex/);
    r = await call('GET', 'manifest.webmanifest', { query: q }, deps);
    assert.match(r.headers['content-type'], /application\/manifest\+json/); assert.equal(JSON.parse(r.body).scope, `${base}/`);
    r = await call('GET', 'sw.js', { query: q }, deps);
    assert.match(r.headers['content-type'], /javascript/); assert.equal(r.headers['service-worker-allowed'], `${base}/`);
    r = await call('GET', 'icons/icon-512.png', { query: q }, deps); assert.equal(r.headers['content-type'], 'image/png');
    r = await call('GET', 'icons/nada.png', { query: q }, deps); assert.equal(r.status, 404);
    r = await call('GET', 'app.js', { query: q }, deps); assert.ok(r.body.includes('"vapid":"PUB"'));
    r = await call('GET', 'jsqr.js', { query: q }, deps); assert.match(r.headers['content-type'], /javascript/); assert.ok(r.body.includes('jsQR'));

    // CORS
    r = await call('OPTIONS', 'api/call/send', { headers: { origin: EXT }, query: q }, deps);
    assert.equal(r.status, 204); assert.equal(r.headers['access-control-allow-origin'], EXT); assert.match(r.headers['access-control-allow-headers'], /Authorization/);
    r = await call('OPTIONS', 'api/call/send', { headers: { origin: 'https://evil.com' }, query: q }, deps);
    assert.equal(r.status, 403); assert.equal(r.headers['access-control-allow-origin'], undefined);

    // Sin clave -> 401
    r = await call('POST', 'api/call/send', { body: { number: '600112233' }, query: q }, deps); assert.equal(r.status, 401);

    // La extensión inicia la vinculación y recibe clave + QR (con la ruta correcta)
    r = await call('POST', 'api/call/link/start', { headers: { ...host, origin: EXT }, query: q }, deps);
    assert.equal(r.status, 200);
    const start = JSON.parse(r.body);
    assert.match(start.code, /^[A-Z2-9]{8}$/); assert.ok(start.qr.startsWith('<?xml') || start.qr.startsWith('<svg'));
    assert.equal(start.url, `https://www.capacero3d.com${base}/?link=${start.code}`);
    const auth = { authorization: `Bearer ${start.key}`, origin: EXT };

    // Aún sin iPhone: la clave sirve pero no hay a quién enviar (409)
    r = await call('GET', 'api/call/link/status', { headers: auth, query: q }, deps); assert.equal(JSON.parse(r.body).phones, 0);
    r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600112233' }, query: q }, deps); assert.equal(r.status, 409);

    // El iPhone escanea el QR (código de un solo uso)
    r = await call('POST', 'api/call/link/claim', { body: { ...SUB, code: 'AAAAAAAA' }, query: q }, deps); assert.equal(r.status, 401);
    r = await call('POST', 'api/call/link/claim', { body: { ...SUB, code: start.code }, query: q }, deps);
    assert.equal(r.status, 200); const dkey = JSON.parse(r.body).deviceKey;
    r = await call('POST', 'api/call/link/claim', { body: { ...SUB, code: start.code }, query: q }, deps); assert.equal(r.status, 401); // ya usado
    r = await call('GET', 'api/call/link/status', { headers: auth, query: q }, deps); assert.equal(JSON.parse(r.body).phones, 1);

    // Teléfono, enlace y texto
    r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600 11 22 33', raw: 'x', source_url: 'https://ejemplo.es/a' }, query: q }, deps);
    assert.equal(r.status, 200); assert.equal(JSON.parse(r.body).kind, 'phone'); assert.equal(JSON.parse(r.body).number, '+34600112233');
    assert.match(pushed.at(-1).title, /Llamar a \+34 600 11 22 33/); assert.ok(pushed.at(-1).url.startsWith(`${base}/?n=%2B34600112233&i=`));
    r = await call('POST', 'api/call/send', { headers: auth, body: { text: 'Llámame al (600) 11-22-44 mañana' }, query: q }, deps);
    assert.equal(JSON.parse(r.body).kind, 'phone'); assert.equal(JSON.parse(r.body).number, '+34600112244');
    r = await call('POST', 'api/call/send', { headers: auth, body: { text: 'https://ejemplo.es/articulo' }, query: q }, deps);
    assert.equal(JSON.parse(r.body).kind, 'url'); assert.equal(pushed.at(-1).title, 'Enlace recibido');
    r = await call('POST', 'api/call/send', { headers: auth, body: { text: 'una nota cualquiera' }, query: q }, deps);
    assert.equal(JSON.parse(r.body).kind, 'text');
    r = await call('POST', 'api/call/send', { headers: auth, body: { number: 'hola' }, query: q }, deps); assert.equal(r.status, 400);
    r = await call('POST', 'api/call/send', { headers: auth, body: {}, query: q }, deps); assert.equal(r.status, 400);

    // Historial por dispositivo y borrado
    r = await call('GET', 'api/call/history', { query: q }, deps); assert.equal(r.status, 401);
    r = await call('GET', 'api/call/history', { headers: { 'x-device-key': dkey }, query: q }, deps);
    const items = JSON.parse(r.body).items; assert.deepEqual(items.map((i) => i.kind), ['text', 'url', 'phone', 'phone', 'phone']);
    r = await call('POST', 'api/call/delete', { headers: { 'x-device-key': dkey }, body: { id: items[0].id }, query: q }, deps);
    assert.equal(store.hist.length, 4);
    r = await call('POST', 'api/call/delete', { headers: { 'x-device-key': dkey }, body: { all: true }, query: q }, deps);
    assert.equal(store.hist.length, 0);
  });
}

test('un link no envía a los iPhone de otro link; el token de administrador envía a todos', async () => {
  const store = memStore(); const sent = [];
  const env = { CALL_API_TOKEN: 'tok-admin' };
  const deps = { store, env, push: async (sub) => { sent.push(sub.endpoint); } };
  const host = { host: 'www.capacero3d.com' };
  const mk = async (endpoint) => {
    const st = JSON.parse((await call('POST', 'api/call/link/start', { headers: host }, deps)).body);
    await call('POST', 'api/call/link/claim', { body: { ...SUB, endpoint, code: st.code } }, deps);
    return { authorization: `Bearer ${st.key}` };
  };
  const A = await mk('https://fcm.googleapis.com/fcm/send/AAA'), B = await mk('https://fcm.googleapis.com/fcm/send/BBB');
  await call('POST', 'api/call/send', { headers: A, body: { number: '600112233' } }, deps);
  assert.deepEqual(sent, ['https://fcm.googleapis.com/fcm/send/AAA']);
  sent.length = 0;
  await call('POST', 'api/call/send', { headers: { authorization: 'Bearer tok-admin' }, body: { number: '600112233' } }, deps);
  assert.deepEqual(sent.sort(), ['https://fcm.googleapis.com/fcm/send/AAA', 'https://fcm.googleapis.com/fcm/send/BBB']);
  // el token de otro no vale
  const r = await call('POST', 'api/call/send', { headers: { authorization: 'Bearer nada' }, body: { number: '600112233' } }, deps);
  assert.equal(r.status, 401); void B;
});

test('suscripción caducada (410) se elimina; límite de intentos -> 429; límite de vinculaciones', async () => {
  const store = memStore(); const host = { host: 'www.capacero3d.com' };
  const gone = async () => { throw Object.assign(new Error('gone'), { statusCode: 410 }); };
  const deps = { store, env: {}, push: gone };
  const st = JSON.parse((await call('POST', 'api/call/link/start', { headers: host }, deps)).body);
  await call('POST', 'api/call/link/claim', { body: { ...SUB, code: st.code } }, deps);
  const auth = { authorization: `Bearer ${st.key}` };
  let r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600112233' } }, deps);
  assert.equal(r.status, 502); assert.equal(store.subs.length, 0);
  for (let i = 0; i < 10; i++) await call('POST', 'api/call/send', { headers: { authorization: 'Bearer mal' }, body: {} }, deps);
  r = await call('POST', 'api/call/send', { headers: auth, body: { number: '600112233' } }, deps);
  assert.equal(r.status, 429);
  const s2 = memStore();
  for (let i = 0; i < 10; i++) await call('POST', 'api/call/link/start', { headers: host }, { store: s2, env: {} });
  r = await call('POST', 'api/call/link/start', { headers: host }, { store: s2, env: {} });
  assert.equal(r.status, 429);
});

test('BASE_PATH distinta de vercel.json -> error de configuración claro', async () => {
  const r = await call('GET', '', { query: { b: '/qpush' } }, { store: memStore(), env: { BASE_PATH: '/otra' } });
  assert.equal(r.status, 500); assert.match(JSON.parse(r.body).message, /vercel\.json/);
});

test('el código de vinculación no usa caracteres ambiguos', () => { for (let i = 0; i < 50; i++) assert.match(pairingCode(), /^[A-HJ-NP-Z2-9]{8}$/); });


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

test('vercel.json enruta /qpush, /qpush/ (start_url) y /qpush/* a la función', () => {
  const cfg = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const q = cfg.rewrites.filter((r) => /p=qpush/.test(r.destination)).map((r) => r.source);
  assert.deepEqual(q, ['/qpush', '/qpush/', '/qpush/:path*']);
});
