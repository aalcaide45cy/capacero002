// Llamadas rápidas (/qpush): PWA oculta + API. Se sirve desde api/admin.js (p=qpush/...) para no añadir otra función de Vercel.
// Seguridad: acceso solo con CALL_API_TOKEN (o un código de emparejamiento de un solo uso), CORS solo para la extensión,
// límite de peticiones por IP y sin registrar nunca el token.
import webpush from 'web-push';
import {
  resolveBase, normalizePhone, prettyPhone, clip, cleanSourceUrl, safeEq, sha256, randomKey, pairingCode, allowedOrigin,
  buildManifest, buildHtml, buildAppJs, buildServiceWorker, buildExtensionZip, CSS
} from './core.js';
import { ICONS } from './icons.js';

const PAIR_MINUTES = 10;
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.apple\.com)$/;
const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';

class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

function pageHeaders(res, type, cache) {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}

const PAGE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/**
 * @param route  ruta tras el prefijo qpush (p. ej. "", "sw.js", "api/call/send")
 * @param deps   { store, push?, env? } para poder probarlo sin base de datos ni red
 */
export async function qpushHandler(req, res, route, deps) {
  const env = deps.env || process.env;
  const base = resolveBase(env, req.query && req.query.b);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (base == null) return res.status(500).json({ ok: false, error: 'config', message: 'BASE_PATH no es válida.' });
  // Si BASE_PATH está definida, debe coincidir con la ruta que vercel.json enruta a esta función.
  if (env.BASE_PATH && req.query && req.query.b != null && resolveBase({}, req.query.b) !== base) {
    return res.status(500).json({ ok: false, error: 'config', message: 'BASE_PATH no coincide con vercel.json (ejecuta npm run qpush:base).' });
  }
  const path = String(route || '').replace(/^\/+|\/+$/g, '');

  try {
    if (path.startsWith('api/call/')) return await api(req, res, path.slice(9), base, env, deps);
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();

    if (path === '') {
      pageHeaders(res, 'text/html; charset=utf-8', 'no-store');
      res.setHeader('Content-Security-Policy', PAGE_CSP);
      return res.status(200).send(buildHtml(base));
    }
    if (path === 'manifest.webmanifest') {
      pageHeaders(res, 'application/manifest+json; charset=utf-8', 'no-cache');
      return res.status(200).send(JSON.stringify(buildManifest(base)));
    }
    if (path === 'sw.js') {
      pageHeaders(res, 'text/javascript; charset=utf-8', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', `${base}/`);
      return res.status(200).send(buildServiceWorker(base));
    }
    if (path === 'app.js') {
      pageHeaders(res, 'text/javascript; charset=utf-8', 'no-store');
      return res.status(200).send(buildAppJs(base, env.VAPID_PUBLIC_KEY));
    }
    if (path === 'app.css') {
      pageHeaders(res, 'text/css; charset=utf-8', 'no-cache');
      return res.status(200).send(CSS);
    }
    if (path === 'extension.zip') {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
      if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return res.status(400).send('Host no válido');
      const { EXTENSION_FILES } = await import('./extension-files.js');
      const zip = buildExtensionZip(EXTENSION_FILES, `https://${host}${base}`);
      pageHeaders(res, 'application/zip', 'no-store');
      res.setHeader('Content-Disposition', 'attachment; filename="llamar-con-iphone.zip"');
      return res.status(200).send(zip);
    }
    const icon = /^icons\/([a-z0-9-]+\.png)$/.exec(path);
    if (icon && ICONS[icon[1]]) {
      pageHeaders(res, 'image/png', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(ICONS[icon[1]], 'base64'));
    }
    pageHeaders(res, 'text/plain; charset=utf-8', 'no-store');
    return res.status(404).send('No encontrado');
  } catch (err) {
    console.error('qpush error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server', message: 'Error interno.' });
  }
}

function cors(req, res, env) {
  const o = allowedOrigin(req.headers.origin, env);
  if (o) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  return o;
}

function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

async function api(req, res, action, base, env, { store, push }) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const origin = cors(req, res, env);
  if (req.method === 'OPTIONS') return res.status(origin ? 204 : 403).end();
  const fail = (e) => res.status(e.status).json({ ok: false, error: e.code, message: e.message });
  try {
    const ip = clientIp(req);
    const expected = env.CALL_API_TOKEN;

    const bearer = () => { const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || '')); return m ? m[1].trim() : ''; };
    // Los intentos fallidos cuentan: 10 cada 15 minutos por IP y luego 429.
    const failAuth = async () => { await store.addHit('authfail', ip); throw new HttpError(401, 'unauthorized', 'Token o código no válido.'); };
    const checkBlocked = async () => { if (await store.countHits('authfail', ip, 900) >= 10) throw new HttpError(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos.'); };
    const requireToken = async () => {
      if (!expected) throw new HttpError(503, 'not_configured', 'CALL_API_TOKEN no está configurado en el servidor.');
      await checkBlocked();
      const t = bearer();
      if (!t || !safeEq(t, expected)) await failAuth();
    };
    const requireDevice = async () => {
      await checkBlocked();
      const k = String(req.headers['x-device-key'] || '');
      if (k.length < 20 || !(await store.deviceExists(sha256(k)))) await failAuth();
    };

    if (action === 'ping' && req.method === 'GET') { await requireToken(); return res.status(200).json({ ok: true }); }

    if (action === 'send' && req.method === 'POST') {
      await requireToken();
      if (await store.countHits('send', ip, 60) >= 30) throw new HttpError(429, 'rate_limited', 'Demasiados envíos por minuto.');
      await store.addHit('send', ip);
      const b = body(req);
      const number = normalizePhone(b.number);
      if (!number) throw new HttpError(400, 'invalid_number', 'El número no es válido.');
      const raw = clip(b.raw, 200), sourceUrl = cleanSourceUrl(b.source_url);
      await store.addHistory({ number, raw, sourceUrl });
      const subs = await store.listSubscriptions();
      if (!subs.length) throw new HttpError(409, 'no_subscription', 'Ningún dispositivo emparejado. Abre la PWA e instala/activa las notificaciones.');
      const payload = JSON.stringify({
        title: `Llamar a ${prettyPhone(number)}`,
        body: sourceUrl ? `Desde ${new URL(sourceUrl).host}. Toca para llamar.` : 'Toca para llamar.',
        number,
        url: `${base}/?n=${encodeURIComponent(number)}`
      });
      const sender = push || defaultPush(env);
      let sent = 0; const dead = [];
      await Promise.all(subs.map(async (s) => {
        try { await sender({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++; }
        catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(s.id); }
      }));
      await store.removeSubscriptions(dead);
      if (!sent) throw new HttpError(502, 'push_failed', 'El servicio de notificaciones rechazó el envío. Vuelve a emparejar el iPhone.');
      return res.status(200).json({ ok: true, number, sent });
    }

    if (action === 'pair' && req.method === 'POST') {
      await requireToken();
      const code = pairingCode();
      await store.createPairCode(sha256(code), PAIR_MINUTES);
      return res.status(200).json({ ok: true, code, expires_in: PAIR_MINUTES * 60 });
    }

    if (action === 'subscribe' && req.method === 'POST') {
      const b = body(req);
      await checkBlocked();
      // Autorización: token (cabecera Bearer) o código de un solo uso (cuerpo).
      const t = bearer();
      let authorized = false;
      if (t && expected && safeEq(t, expected)) authorized = true;
      else if (typeof b.code === 'string' && /^[A-Z2-9]{8}$/.test(b.code)) authorized = await store.consumePairCode(sha256(b.code));
      if (!authorized) await failAuth();
      let host;
      try { const u = new URL(String(b.endpoint)); if (u.protocol !== 'https:') throw 0; host = u.hostname; } catch { throw new HttpError(400, 'invalid_subscription', 'Suscripción no válida.'); }
      const p256dh = String(b.p256dh || ''), auth = String(b.auth || '');
      if (!PUSH_HOSTS.test(host) || String(b.endpoint).length > 600 || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) {
        throw new HttpError(400, 'invalid_subscription', 'Suscripción no válida.');
      }
      const deviceKey = randomKey(32);
      await store.upsertSubscription({ endpoint: b.endpoint, p256dh, auth, deviceKeyHash: sha256(deviceKey), userAgent: clip(req.headers['user-agent'], 300) });
      return res.status(200).json({ ok: true, deviceKey });
    }

    if (action === 'history' && req.method === 'GET') {
      await requireDevice();
      return res.status(200).json({ ok: true, items: await store.listHistory() });
    }

    if (action === 'delete' && req.method === 'POST') {
      await requireDevice();
      const b = body(req);
      if (b.all === true) await store.deleteHistory(null);
      else if (/^\d{1,18}$/.test(String(b.id))) await store.deleteHistory(String(b.id));
      else throw new HttpError(400, 'invalid_request', 'Indica id o all.');
      return res.status(200).json({ ok: true });
    }

    throw new HttpError(action.match(/^(ping|send|pair|subscribe|history|delete)$/) ? 405 : 404, 'not_found', 'Ruta no encontrada.');
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    console.error('qpush api error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server', message: 'Error interno.' });
  }
}

function defaultPush(env) {
  const pub = env.VAPID_PUBLIC_KEY, priv = env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new HttpError(503, 'not_configured', 'Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.');
  webpush.setVapidDetails(env.VAPID_SUBJECT || 'https://www.capacero3d.com', pub, priv);
  return (sub, payload) => webpush.sendNotification(sub, payload, { TTL: 600, urgency: 'high' });
}
