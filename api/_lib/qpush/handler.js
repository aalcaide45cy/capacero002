// Llamadas rápidas (/qpush): PWA oculta + API. Se sirve desde api/admin.js (p=qpush/...) para no añadir otra función de Vercel.
// Seguridad: acceso solo con CALL_API_TOKEN (o un código de emparejamiento de un solo uso), CORS solo para la extensión,
// límite de peticiones por IP y sin registrar nunca el token.
import webpush from 'web-push';
import QRCode from 'qrcode';
import {
  resolveBase, normalizePhone, findPhone, isHttpUrl, prettyPhone, clip, cleanSourceUrl, safeEq, sha256, randomKey, pairingCode, allowedOrigin,
  buildManifest, buildHtml, buildAppJs, buildServiceWorker, buildExtensionZip, CSS
} from './core.js';
import { ICONS } from './icons.js';
import { JSQR_SOURCE } from './jsqr-source.js';

const CODE_MINUTES = 10;
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

const PAGE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

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
    if (path === 'jsqr.js') {
      pageHeaders(res, 'text/javascript; charset=utf-8', 'public, max-age=86400');
      return res.status(200).send(JSQR_SOURCE);
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

function hostOf(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? host : null;
}

function validSubscription(b) {
  let host;
  try { const u = new URL(String(b.endpoint)); if (u.protocol !== 'https:') throw 0; host = u.hostname; } catch { return null; }
  const p256dh = String(b.p256dh || ''), auth = String(b.auth || '');
  if (!PUSH_HOSTS.test(host) || String(b.endpoint).length > 600 || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) return null;
  return { endpoint: String(b.endpoint), p256dh, auth };
}

async function api(req, res, action, base, env, { store, push }) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const origin = cors(req, res, env);
  if (req.method === 'OPTIONS') return res.status(origin ? 204 : 403).end();
  const fail = (e) => res.status(e.status).json({ ok: false, error: e.code, message: e.message });
  try {
    const ip = clientIp(req);
    const adminToken = env.CALL_API_TOKEN; // opcional: permite enviar a todos los iPhone vinculados

    const bearer = () => { const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || '')); return m ? m[1].trim() : ''; };
    // Los intentos fallidos cuentan: 10 cada 15 minutos por IP y luego 429.
    const failAuth = async () => { await store.addHit('authfail', ip); throw new HttpError(401, 'unauthorized', 'Clave o código no válido.'); };
    const checkBlocked = async () => { if (await store.countHits('authfail', ip, 900) >= 10) throw new HttpError(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos.'); };
    /** Clave de la extensión (o token de administrador). Devuelve { linkId, admin }. */
    const requireSender = async () => {
      await checkBlocked();
      const t = bearer();
      if (!t) await failAuth();
      if (adminToken && safeEq(t, adminToken)) return { linkId: null, admin: true };
      const link = await store.linkByKey(sha256(t));
      if (!link) await failAuth();
      return { linkId: link.id, admin: false };
    };
    const requireDevice = async () => {
      await checkBlocked();
      const k = String(req.headers['x-device-key'] || '');
      const dev = k.length >= 20 ? await store.deviceByKey(sha256(k)) : null;
      if (!dev) await failAuth();
      return dev;
    };
    const newCode = async (linkId) => {
      const host = hostOf(req);
      if (!host) throw new HttpError(400, 'invalid_host', 'Host no válido.');
      const code = pairingCode();
      await store.createLinkCode(linkId, sha256(code), CODE_MINUTES);
      const url = `https://${host}${base}/?link=${code}`;
      const qr = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
      return { code, url, qr, expires_in: CODE_MINUTES * 60 };
    };

    // ----- Vinculación por QR -----
    if (action === 'link/start' && req.method === 'POST') {
      if (await store.countHits('linkstart', ip, 3600) >= 10) throw new HttpError(429, 'rate_limited', 'Demasiadas vinculaciones. Prueba más tarde.');
      await store.addHit('linkstart', ip);
      const key = randomKey(32);
      const linkId = await store.createLink(sha256(key));
      return res.status(200).json({ ok: true, key, ...(await newCode(linkId)) });
    }
    if (action === 'link/code' && req.method === 'POST') {
      const { linkId, admin } = await requireSender();
      if (admin) throw new HttpError(400, 'invalid_request', 'Usa la clave de una extensión vinculada.');
      return res.status(200).json({ ok: true, ...(await newCode(linkId)) });
    }
    if (action === 'link/status' && req.method === 'GET') {
      const { linkId, admin } = await requireSender();
      return res.status(200).json({ ok: true, phones: admin ? null : await store.countPhones(linkId) });
    }
    if (action === 'link/claim' && req.method === 'POST') {
      const b = body(req);
      await checkBlocked();
      const sub = validSubscription(b);
      if (!sub) throw new HttpError(400, 'invalid_subscription', 'Suscripción no válida.');
      const code = String(b.code || '').trim().toUpperCase();
      const linkId = /^[A-Z2-9]{8}$/.test(code) ? await store.consumeLinkCode(sha256(code)) : null;
      if (!linkId) await failAuth();
      const deviceKey = randomKey(32);
      await store.upsertSubscription({ ...sub, deviceKeyHash: sha256(deviceKey), userAgent: clip(req.headers['user-agent'], 300), linkId });
      return res.status(200).json({ ok: true, deviceKey });
    }

    if (action === 'ping' && req.method === 'GET') { await requireSender(); return res.status(200).json({ ok: true }); }

    // ----- Envío -----
    if (action === 'send' && req.method === 'POST') {
      const { linkId } = await requireSender();
      if (await store.countHits('send', ip, 60) >= 30) throw new HttpError(429, 'rate_limited', 'Demasiados envíos por minuto.');
      await store.addHit('send', ip);
      const b = body(req);
      let kind, number = null, text = null;
      if (b.number != null && String(b.number).trim() !== '') {
        number = normalizePhone(b.number);
        if (!number) throw new HttpError(400, 'invalid_number', 'El número no es válido.');
        kind = 'phone';
      } else {
        const t = String(b.text ?? b.raw ?? '').trim().slice(0, 500);
        if (!t) throw new HttpError(400, 'invalid_request', 'Falta number o text.');
        number = findPhone(t);
        if (number) kind = 'phone'; else if (isHttpUrl(t)) { kind = 'url'; text = t; } else { kind = 'text'; text = t; }
      }
      const sourceUrl = cleanSourceUrl(b.source_url);
      const itemId = await store.addHistory({ kind, number, raw: kind === 'phone' ? clip(b.raw ?? b.text, 200) : text, sourceUrl, linkId });
      const subs = await store.listSubscriptions(linkId);
      if (!subs.length) throw new HttpError(409, 'no_subscription', 'Ningún iPhone vinculado. Vincúlalo escaneando el QR desde la app.');
      const fromHost = sourceUrl ? new URL(sourceUrl).host : '';
      const payload = JSON.stringify(kind === 'phone'
        ? { title: `Llamar a ${prettyPhone(number)}`, body: fromHost ? `Desde ${fromHost}. Toca para llamar.` : 'Toca para llamar.', number, url: `${base}/?n=${encodeURIComponent(number)}&i=${itemId}` }
        : { title: kind === 'url' ? 'Enlace recibido' : 'Texto recibido', body: text.slice(0, 100), url: `${base}/?i=${itemId}` });
      const sender = push || defaultPush(env);
      let sent = 0; const dead = [];
      await Promise.all(subs.map(async (s) => {
        try { await sender({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++; }
        catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(s.id); }
      }));
      await store.removeSubscriptions(dead);
      if (!sent) throw new HttpError(502, 'push_failed', 'El servicio de notificaciones rechazó el envío. Vuelve a vincular el iPhone.');
      return res.status(200).json({ ok: true, kind, number, sent });
    }

    // ----- Administrador: suscripción directa con el token (opcional) -----
    if (action === 'subscribe' && req.method === 'POST') {
      await checkBlocked();
      const t = bearer();
      if (!(t && adminToken && safeEq(t, adminToken))) await failAuth();
      const sub = validSubscription(body(req));
      if (!sub) throw new HttpError(400, 'invalid_subscription', 'Suscripción no válida.');
      const deviceKey = randomKey(32);
      await store.upsertSubscription({ ...sub, deviceKeyHash: sha256(deviceKey), userAgent: clip(req.headers['user-agent'], 300) });
      return res.status(200).json({ ok: true, deviceKey });
    }

    // ----- Historial (la app del iPhone, con la clave de su dispositivo) -----
    if (action === 'history' && req.method === 'GET') {
      const dev = await requireDevice();
      return res.status(200).json({ ok: true, items: await store.listHistory(dev.linkId) });
    }
    if (action === 'delete' && req.method === 'POST') {
      const dev = await requireDevice();
      const b = body(req);
      if (b.all === true) await store.deleteHistory(dev.linkId, null);
      else if (/^\d{1,18}$/.test(String(b.id))) await store.deleteHistory(dev.linkId, String(b.id));
      else throw new HttpError(400, 'invalid_request', 'Indica id o all.');
      return res.status(200).json({ ok: true });
    }

    throw new HttpError(/^(ping|send|subscribe|history|delete|link\/(start|code|status|claim))$/.test(action) ? 405 : 404, 'not_found', 'Ruta no encontrada.');
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
