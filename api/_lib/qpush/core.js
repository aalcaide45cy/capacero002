// Llamadas rápidas (/qpush): lógica pura, sin base de datos ni red (se prueba en tests/qpush.test.js).
import crypto from 'crypto';

export const DEFAULT_BASE = '/qpush';
export const HISTORY_LIMIT = 20;

/** Normaliza una ruta base: "", "/", "tp", "/tp/" -> "" o "/tp" (nunca termina en "/"). Devuelve null si es inválida. */
export function normalizeBase(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (s === '' || s === '/') return '';
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/+$/, '');
  return /^(\/[A-Za-z0-9._~-]+)+$/.test(s) ? s : null;
}

/** BASE_PATH efectiva. Orden: variable BASE_PATH, luego CALL_SLUG, luego el valor que fija vercel.json, luego /qpush. */
export function resolveBase(env, fromRewrite) {
  if (env.BASE_PATH != null && String(env.BASE_PATH).trim() !== '') return normalizeBase(env.BASE_PATH);
  if (env.CALL_SLUG) return normalizeBase(env.CALL_SLUG);
  const r = normalizeBase(fromRewrite);
  return r != null ? r : DEFAULT_BASE;
}

/** Normaliza un teléfono. Devuelve "+34600112233" o null si no es válido. Sin prefijo se asume +34 (9 cifras). */
export function normalizePhone(input, defaultCountry = '34') {
  if (input == null) return null;
  let s = String(input).trim();
  s = s.replace(/^tel:/i, '').replace(/[;,?#].*$/, '');
  s = decodeURIComponent_(s);
  if (!/^[\d\s()+.\- ]+$/.test(s)) return null;
  let plus = false;
  if (s.startsWith('+')) plus = true;
  let d = s.replace(/\D/g, '');
  if (!d) return null;
  if (!plus && d.startsWith('00')) { plus = true; d = d.slice(2); }
  if (!plus) {
    if (d.length === 9 && /^[6789]/.test(d)) d = defaultCountry + d;                       // móvil o fijo español sin prefijo
    else if (d.startsWith(defaultCountry) && d.length === 9 + defaultCountry.length) { /* 34600112233 */ }
    else return null;
  }
  if (d.length < 8 || d.length > 15 || d[0] === '0') return null;
  return '+' + d;
}
const decodeURIComponent_ = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Formato legible para humanos: +34 600 11 22 33. */
export function prettyPhone(n) {
  const m = /^\+34(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(n);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n;
}

export const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

/** Solo se conservan enlaces http(s) como origen de la llamada. */
export function cleanSourceUrl(v) {
  if (!v) return null;
  try { const u = new URL(String(v)); return /^https?:$/.test(u.protocol) ? u.toString().slice(0, 500) : null; } catch { return null; }
}

/** Comparación en tiempo constante de dos cadenas (compara sus hashes para no filtrar la longitud). */
export function safeEq(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomKey = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
/** Código de emparejamiento de un solo uso: 8 caracteres sin ambigüedades (sin 0/O/1/I). */
export function pairingCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += A[b[i] % A.length];
  return out;
}

// ---------- CORS (solo la extensión de Chrome) ----------
/** Devuelve el origen permitido o null. Solo `chrome-extension://<id>`; si CALL_EXTENSION_ID existe, solo ese id. */
export function allowedOrigin(origin, env) {
  const m = /^chrome-extension:\/\/([a-p]{32})$/.exec(String(origin || ''));
  if (!m) return null;
  if (env.CALL_EXTENSION_ID && env.CALL_EXTENSION_ID !== m[1]) return null;
  return origin;
}

// ---------- Recursos de la PWA (todo se construye a partir de BASE) ----------
const SW_NAME = 'Llamadas rápidas';

export function buildManifest(base) {
  return {
    id: `${base}/`,
    name: SW_NAME,
    short_name: 'Llamar',
    description: 'Recibe teléfonos desde Chrome y llama con un toque.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0b10',
    theme_color: '#0a0b10',
    lang: 'es-ES',
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}

export function buildHtml(base) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${SW_NAME}</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#0a0b10">
<link rel="manifest" href="${base}/manifest.webmanifest">
<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="${base}/icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Llamar">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="stylesheet" href="${base}/app.css">
</head>
<body>
<main id="app"><p class="mut">Cargando…</p></main>
<script src="${base}/app.js" defer></script>
</body>
</html>
`;
}

export const CSS = `:root{color-scheme:dark;--bg:#0a0b10;--card:#13151e;--line:#23263a;--text:#f3f4f8;--mut:#8d92a8;--acc:#38bdf8;--acc2:#6366f1;--ok:#34d399;--bad:#f87171}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 -apple-system,system-ui,"Segoe UI",sans-serif;min-height:100vh;padding:env(safe-area-inset-top) 16px calc(24px + env(safe-area-inset-bottom))}
main{max-width:520px;margin:0 auto;padding-top:20px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:0 0 10px;color:var(--mut);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.mut{color:var(--mut);font-size:14px}.ok{color:var(--ok)}.bad{color:var(--bad)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:16px 0}
input{width:100%;background:#0b0d14;border:1px solid var(--line);border-radius:12px;color:var(--text);padding:14px;font:inherit;margin:10px 0}
button,a.btn{display:block;width:100%;text-align:center;text-decoration:none;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;border:0;border-radius:14px;padding:15px;font:inherit;font-weight:650;cursor:pointer}
button.sec{background:#1d2030;box-shadow:inset 0 0 0 1px var(--line)}
button.danger{background:#7f1d1d}
a.big{font-size:30px;padding:30px 12px;border-radius:22px;background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 10px 30px rgba(16,185,129,.35)}
.num{font-size:28px;font-weight:750;text-align:center;margin:6px 0 16px;letter-spacing:.5px}
.row{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--line)}
.row:first-of-type{border-top:0}.row .info{flex:1;min-width:0}.row .n{font-weight:650}.row .s{color:var(--mut);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row a.btn{width:auto;padding:10px 16px;background:linear-gradient(135deg,#10b981,#059669)}.row button{width:auto;padding:10px 14px}
.hint{font-size:14px;color:var(--mut);margin:8px 0 0}
`;

/** Script de la PWA. La configuración (BASE y clave pública VAPID) se incrusta al servirlo. */
export function buildAppJs(base, vapidPublicKey) {
  const cfg = JSON.stringify({ base, vapid: vapidPublicKey || '' });
  return `(() => {
'use strict';
const CFG = ${cfg};
const API = CFG.base + '/api/call';
const KEY = 'qpush.deviceKey';
const app = document.getElementById('app');
const $ = (t, a = {}, ...kids) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const c of kids) e.append(c); return e; };
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch {} }, del: () => { try { localStorage.removeItem(KEY); } catch {} } };
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const pretty = (n) => { const m = /^\\+34(\\d{3})(\\d{2})(\\d{2})(\\d{2})$/.exec(n); return m ? '+34 ' + m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] : n; };
const validNum = (n) => /^\\+[1-9]\\d{7,14}$/.test(n || '');
const when = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
const host = (u) => { try { return new URL(u).host; } catch { return ''; } };
const b64ToBytes = (s) => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };

let current = new URLSearchParams(location.search).get('n');
if (!validNum(current)) current = null;
let history = [], status = '', busy = false;

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const key = store.get();
  if (key) headers['X-Device-Key'] = key;
  const r = await fetch(API + path, Object.assign({ headers, cache: 'no-store' }, opts));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.message || 'Error ' + r.status), { status: r.status, code: data.error });
  return data;
}

async function loadHistory() {
  if (!store.get()) return;
  try { history = (await api('/history')).items; }
  catch (e) { if (e.status === 401) { store.del(); status = 'El dispositivo ya no está emparejado. Vuelve a emparejarlo.'; } else status = e.message; }
}

async function enable(secret) {
  busy = true; status = ''; render();
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error(isIOS && !isStandalone() ? 'En iPhone primero hay que instalar la app: Compartir → Añadir a pantalla de inicio, y abrirla desde el icono.' : 'Este navegador no admite notificaciones push.');
    if (!CFG.vapid) throw new Error('El servidor no tiene VAPID_PUBLIC_KEY configurada.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado. Actívalo en Ajustes del iPhone → Notificaciones → Llamar.');
    const reg = await navigator.serviceWorker.register(CFG.base + '/sw.js', { scope: CFG.base + '/' });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.vapid) });
    const j = sub.toJSON();
    const body = { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
    const headers = { 'Content-Type': 'application/json' };
    if (/^[A-Z2-9]{8}$/.test(secret.trim().toUpperCase())) body.code = secret.trim().toUpperCase(); else headers.Authorization = 'Bearer ' + secret.trim();
    const r = await fetch(API + '/subscribe', { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || 'Error ' + r.status);
    store.set(data.deviceKey);
    status = 'Notificaciones activadas.';
    await loadHistory();
  } catch (e) { status = e.message; }
  busy = false; render();
}

async function del(id) { try { await api('/delete', { method: 'POST', body: JSON.stringify(id ? { id } : { all: true }) }); await loadHistory(); } catch (e) { status = e.message; } render(); }

function render() {
  const paired = !!store.get();
  const kids = [$('h1', {}, 'Llamadas rápidas'), $('p', { class: 'mut' }, 'Teléfonos enviados desde Chrome.')];
  if (status) kids.push($('p', { class: /activad/.test(status) ? 'ok' : 'bad' }, status));
  if (current) {
    kids.push($('div', { class: 'card' }, $('div', { class: 'num' }, pretty(current)), $('a', { class: 'btn big', href: 'tel:' + current }, 'Llamar')));
  }
  if (!paired) {
    const input = $('input', { type: 'text', placeholder: 'Código de emparejamiento o token', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', id: 'secret' });
    const card = $('div', { class: 'card' }, $('h2', {}, 'Emparejar este dispositivo'), input,
      $('button', { id: 'enable', onclick: () => input.value.trim() ? enable(input.value) : (status = 'Escribe el código o el token.', render()) }, busy ? 'Activando…' : 'Activar notificaciones'),
      $('p', { class: 'hint' }, 'Genera el código en las opciones de la extensión de Chrome (válido 10 minutos y de un solo uso).'));
    if (isIOS && !isStandalone()) card.append($('p', { class: 'hint bad' }, 'En iPhone: abre esto en Safari, pulsa Compartir → «Añadir a pantalla de inicio» y abre la app desde el icono. Si no, iOS no permite las notificaciones.'));
    kids.push(card);
  } else {
    const list = $('div', { class: 'card' }, $('h2', {}, 'Últimos números'));
    if (!history.length) list.append($('p', { class: 'mut' }, 'Todavía no has recibido ninguno.'));
    for (const h of history) list.append($('div', { class: 'row' },
      $('div', { class: 'info' }, $('div', { class: 'n' }, pretty(h.number)), $('div', { class: 's' }, when(h.created_at) + (h.source_url ? ' · ' + host(h.source_url) : ''))),
      $('a', { class: 'btn', href: 'tel:' + h.number }, 'Llamar'),
      $('button', { class: 'sec', 'aria-label': 'Borrar', onclick: () => del(h.id) }, 'Borrar')));
    kids.push(list);
    if (history.length) kids.push($('button', { class: 'sec danger', onclick: () => confirm('¿Borrar todo el historial?') && del(null) }, 'Borrar todo'));
    kids.push($('p', { class: 'hint ok' }, 'Notificaciones activas en este dispositivo.'));
    kids.push($('button', { class: 'sec', onclick: () => { store.del(); status = ''; render(); } }, 'Olvidar emparejamiento'));
  }
  app.replaceChildren(...kids);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'call' && validNum(e.data.number)) { current = e.data.number; loadHistory().then(render); } });
  // Si ya hay permiso, se mantiene registrado el service worker sin pedir nada.
  if (store.get() && Notification.permission === 'granted') navigator.serviceWorker.register(CFG.base + '/sw.js', { scope: CFG.base + '/' }).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadHistory().then(render); });
render();
loadHistory().then(render);
})();
`;
}

export function buildServiceWorker(base) {
  return `// Service worker de Llamadas rápidas. Se sirve desde ${base || ''}/sw.js con scope ${base}/.
const SCOPE = self.registration.scope;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = {}; }
  const title = d.title || 'Llamada rápida';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'Toca para llamar',
    icon: new URL('icons/icon-192.png', SCOPE).href,
    badge: new URL('icons/icon-192.png', SCOPE).href,
    tag: 'call',
    renotify: true,
    data: { number: d.number || '', url: d.url || SCOPE }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || SCOPE, SCOPE);
  if (!target.href.startsWith(SCOPE)) target.href = SCOPE;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const mine = wins.find((w) => w.url.startsWith(SCOPE));
    if (mine) {
      await mine.focus();
      mine.postMessage({ type: 'call', number: data.number });
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});
`;
}
