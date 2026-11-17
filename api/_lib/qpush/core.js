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

const CANDIDATE = /(?:\+|00)?\d[\d\s().\-\u00a0]{6,}\d/g;
/** Primer teléfono válido dentro de un texto, o null. Prioriza los que traen prefijo internacional. */
export function findPhone(text) {
  const found = [];
  for (const m of String(text || '').matchAll(CANDIDATE)) {
    const n = normalizePhone(m[0].trim());
    if (n) found.push({ n, plus: /^(\+|00)/.test(m[0].trim()) });
  }
  const hit = found.find((f) => f.plus) || found[0];
  return hit ? hit.n : null;
}
export const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());

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

// ---------- ZIP (sin compresión, sin dependencias) ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** files: { "ruta/archivo": Buffer }. Devuelve un Buffer con un .zip válido (método "stored"). */
export function buildZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  const DATE = (46 << 9) | (11 << 5) | 17, TIME = 0; // fecha fija (2026-11-17) para que el zip sea reproducible
  for (const [name, data] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8'), crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(TIME, 10); lh.writeUInt16LE(DATE, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(TIME, 12); ch.writeUInt16LE(DATE, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** Zip de la extensión con config.json (URL base de esta web). El token nunca se incluye. */
export function buildExtensionZip(filesB64, baseUrl) {
  const files = {};
  for (const [name, b64] of Object.entries(filesB64)) files[`llamar-con-iphone/${name}`] = Buffer.from(b64, 'base64');
  files['llamar-con-iphone/config.json'] = Buffer.from(JSON.stringify({ baseUrl }, null, 2) + '\n');
  return buildZip(files);
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
.cam{width:100%;border-radius:14px;background:#000;margin:10px 0;aspect-ratio:1/1;object-fit:cover}
a.big.blue{background:linear-gradient(135deg,#0ea5e9,#6366f1);box-shadow:0 10px 30px rgba(99,102,241,.35)}
.row a.btn.open{background:linear-gradient(135deg,#0ea5e9,#6366f1)}
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
const codeFrom = (text) => { const t = String(text || '').trim(); try { const c = new URL(t).searchParams.get('link'); if (c) return c.toUpperCase(); } catch {} return /^[A-Za-z2-9]{8}$/.test(t) ? t.toUpperCase() : null; };

const qs = new URLSearchParams(location.search);
let current = { n: validNum(qs.get('n')) ? qs.get('n') : null, i: /^\\d{1,18}$/.test(qs.get('i') || '') ? qs.get('i') : null };
let pendingCode = codeFrom(qs.get('link'));
let items = [], status = '', busy = false, scanning = false, stream = null;

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const key = store.get();
  if (key) headers['X-Device-Key'] = key;
  const r = await fetch(API + path, Object.assign({ headers, cache: 'no-store' }, opts));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.message || 'Error ' + r.status), { status: r.status, code: data.error });
  return data;
}
async function loadItems() {
  if (!store.get()) return;
  try { items = (await api('/history')).items; }
  catch (e) { if (e.status === 401) { store.del(); status = 'El iPhone ya no está vinculado. Vuelve a escanear el QR.'; } else status = e.message; }
}

function stopScan() { scanning = false; if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }

async function claim(code) {
  busy = true; status = ''; render();
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error(isIOS && !isStandalone() ? 'Primero instala la app: Compartir → Añadir a pantalla de inicio, y ábrela desde el icono.' : 'Este navegador no admite notificaciones push.');
    if (!CFG.vapid) throw new Error('El servidor no tiene VAPID_PUBLIC_KEY configurada.');
    const reg = await navigator.serviceWorker.register(CFG.base + '/sw.js', { scope: CFG.base + '/' });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.vapid) });
    const j = sub.toJSON();
    const r = await fetch(API + '/link/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }), cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 401 ? 'Código caducado o ya usado. Genera otro QR en la extensión.' : (data.message || 'Error ' + r.status));
    store.set(data.deviceKey);
    pendingCode = null;
    history.replaceState(null, '', CFG.base + '/');
    status = 'iPhone vinculado.';
    await loadItems();
  } catch (e) { status = e.message; }
  busy = false; render();
}

// El permiso de notificaciones se pide en el toque del usuario (iOS lo exige), antes de abrir la cámara.
async function askPermission() {
  if (!('Notification' in window)) throw new Error(isIOS && !isStandalone() ? 'Primero instala la app: Compartir → Añadir a pantalla de inicio, y ábrela desde el icono.' : 'Este navegador no admite notificaciones.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado. Actívalo en Ajustes del iPhone → Notificaciones → Llamar.');
}

async function startScan() {
  status = '';
  try { await askPermission(); } catch (e) { status = e.message; return render(); }
  try {
    if (!window.jsQR) await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = CFG.base + '/jsqr.js'; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar el lector de QR.')); document.head.append(s); });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch (e) { status = e.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo en Ajustes del iPhone o escribe el código.' : e.message; return render(); }
  scanning = true; render();
  const video = document.getElementById('cam');
  video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true; await video.play().catch(() => {});
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const tick = () => {
    if (!scanning) return;
    if (video.readyState >= 2 && video.videoWidth) {
      const w = 480, h = Math.round(w * video.videoHeight / video.videoWidth);
      canvas.width = w; canvas.height = h; ctx.drawImage(video, 0, 0, w, h);
      const res = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      const code = res && codeFrom(res.data);
      if (code) { stopScan(); claim(code); return; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function del(id) { try { await api('/delete', { method: 'POST', body: JSON.stringify(id ? { id } : { all: true }) }); await loadItems(); } catch (e) { status = e.message; } render(); }

function itemRow(h, big) {
  const meta = when(h.created_at) + (h.source_url ? ' · ' + host(h.source_url) : '');
  const label = h.kind === 'phone' ? pretty(h.number) : (h.raw || '');
  const action = h.kind === 'phone' ? $('a', { class: big ? 'btn big' : 'btn call', href: 'tel:' + h.number }, 'Llamar')
    : h.kind === 'url' ? $('a', { class: big ? 'btn big blue' : 'btn open', href: h.raw, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir')
    : null;
  if (big) return $('div', { class: 'card' }, $('div', { class: 'num' }, label), ...(action ? [action] : []), $('p', { class: 'hint' }, meta));
  return $('div', { class: 'row' },
    $('div', { class: 'info' }, $('div', { class: 'n' }, (h.kind === 'url' ? '🔗 ' : h.kind === 'text' ? '📝 ' : '📞 ') + label), $('div', { class: 's' }, meta)),
    ...(action ? [action] : []),
    $('button', { class: 'sec', 'aria-label': 'Borrar', onclick: () => del(h.id) }, '✕'));
}

function render() {
  const paired = !!store.get();
  const kids = [$('h1', {}, 'Llamadas rápidas'), $('p', { class: 'mut' }, 'Lo que envías desde Chrome llega aquí.')];
  if (status) kids.push($('p', { class: /^iPhone vinculado\\./.test(status) ? 'ok' : 'bad' }, status));
  if (scanning) {
    kids.push($('div', { class: 'card' }, $('h2', {}, 'Apunta al QR de tu ordenador'), $('video', { id: 'cam', class: 'cam', playsinline: '', muted: '' }),
      $('button', { class: 'sec', onclick: () => { stopScan(); render(); } }, 'Cancelar')));
    return app.replaceChildren(...kids);
  }
  if (paired) {
    const cur = items.find((h) => h.id === current.i) || (current.n && items.find((h) => h.number === current.n));
    if (cur) kids.push(itemRow(cur, true));
    else if (current.n) kids.push($('div', { class: 'card' }, $('div', { class: 'num' }, pretty(current.n)), $('a', { class: 'btn big', href: 'tel:' + current.n }, 'Llamar')));
    const list = $('div', { class: 'card' }, $('h2', {}, 'Últimos envíos'));
    if (!items.length) list.append($('p', { class: 'mut' }, 'Todavía no has enviado nada. En Chrome selecciona un teléfono o un enlace, clic derecho → «Llamar con iPhone».'));
    for (const h of items) list.append(itemRow(h, false));
    kids.push(list);
    if (items.length) kids.push($('button', { class: 'sec danger', onclick: () => confirm('¿Borrar todo?') && del(null) }, 'Borrar todo'));
    kids.push($('p', { class: 'hint ok' }, 'Notificaciones activas en este iPhone.'));
    kids.push($('button', { class: 'sec', onclick: () => { store.del(); items = []; status = ''; render(); } }, 'Desvincular este iPhone'));
  } else {
    const input = $('input', { type: 'text', placeholder: 'Código de 8 letras (si no puedes escanear)', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', id: 'code' });
    const card = $('div', { class: 'card' }, $('h2', {}, 'Vincular este iPhone'),
      $('p', { class: 'hint' }, 'En Chrome, abre las opciones de la extensión «Llamar con iPhone» y pulsa «Vincular iPhone»: aparecerá un QR.'),
      pendingCode
        ? $('button', { id: 'link', onclick: async () => { try { await askPermission(); } catch (e) { status = e.message; return render(); } claim(pendingCode); } }, busy ? 'Vinculando…' : 'Vincular con el código recibido')
        : $('button', { id: 'scan', onclick: startScan }, 'Escanear QR'),
      $('p', { class: 'hint' }, 'O escribe el código que aparece bajo el QR:'), input,
      $('button', { class: 'sec', onclick: async () => { const c = codeFrom(input.value); if (!c) { status = 'El código tiene 8 letras o números.'; return render(); } try { await askPermission(); } catch (e) { status = e.message; return render(); } claim(c); } }, 'Vincular con el código'));
    if (isIOS && !isStandalone()) card.append($('p', { class: 'hint bad' }, 'En iPhone: abre esta página en Safari, pulsa Compartir → «Añadir a pantalla de inicio» y abre la app desde el icono. Si no, iOS no permite las notificaciones.'));
    kids.push(card);
  }
  kids.push($('div', { class: 'card' }, $('h2', {}, 'Extensión de Chrome (en el ordenador)'),
    $('a', { class: 'btn', href: CFG.base + '/extension.zip', download: 'llamar-con-iphone.zip' }, 'Descargar extensión'),
    $('p', { class: 'hint' }, '1) Descomprime el ZIP.  2) En Chrome abre chrome://extensions y activa «Modo de desarrollador».  3) «Cargar descomprimida» → carpeta llamar-con-iphone.  4) En sus Opciones pulsa «Vincular iPhone» y escanea el QR desde aquí.'),
    $('p', { class: 'hint' }, 'Chrome no permite instalar extensiones con un solo clic desde una web; la carga manual es lo único posible sin publicarla en la Chrome Web Store.')));
  app.replaceChildren(...kids);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'refresh' && !scanning) { loadItems().then(render); return; }
    if (e.data && e.data.type === 'open') { current = { n: validNum(e.data.number) ? e.data.number : null, i: /^\\d{1,18}$/.test(e.data.id || '') ? e.data.id : null }; loadItems().then(render); }
  });
  if (store.get() && 'Notification' in window && Notification.permission === 'granted') navigator.serviceWorker.register(CFG.base + '/sw.js', { scope: CFG.base + '/' }).catch(() => {});
}
const refresh = () => { if (!document.hidden && !scanning && store.get()) loadItems().then(() => { if (!scanning) render(); }); };
document.addEventListener('visibilitychange', refresh);
window.addEventListener('pageshow', refresh);
window.addEventListener('focus', refresh);
window.addEventListener('online', refresh);
setInterval(refresh, 15000); // respaldo: iOS no siempre entrega el aviso del service worker a la app abierta
render();
loadItems().then(() => { if (!scanning) render(); });
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
  event.waitUntil((async () => {
    // Avisa a la app si está abierta para que actualice la lista sin tener que refrescar.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) w.postMessage({ type: 'refresh' });
    await self.registration.showNotification(title, {
    body: d.body || 'Toca para llamar',
    icon: new URL('icons/icon-192.png', SCOPE).href,
    badge: new URL('icons/icon-192.png', SCOPE).href,
    tag: 'call',
    renotify: true,
    data: { number: d.number || '', url: d.url || SCOPE }
    });
  })());
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
      mine.postMessage({ type: 'open', number: data.number, id: new URL(target).searchParams.get('i') || '' });
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});
`;
}
