import { normalizeBaseUrl } from './phone.js';

const $ = (id) => document.getElementById(id);
const msg = (t, ok) => { $('msg').textContent = t; $('msg').className = ok ? 'ok' : 'bad'; };
let poll = null;

async function bundledBase() {
  // El ZIP descargado desde la web trae config.json con la URL base.
  try { const r = await fetch(chrome.runtime.getURL('config.json')); return (await r.json()).baseUrl || ''; } catch { return ''; }
}

async function load() {
  const { baseUrl, key } = await chrome.storage.local.get(['baseUrl', 'key']);
  $('base').value = baseUrl || await bundledBase();
  if (key) await refreshStatus();
}

async function ensureHostPermission(base) {
  const origins = [new URL(base).origin + '/*'];
  if (await chrome.permissions.contains({ origins })) return true;
  return chrome.permissions.request({ origins }).catch(() => false);
}

async function base() {
  const b = normalizeBaseUrl($('base').value);
  if (!b) { msg('La URL no es válida (usa https://...).', false); return null; }
  if (!(await ensureHostPermission(b))) { msg('Hace falta permiso para ese dominio.', false); return null; }
  await chrome.storage.local.set({ baseUrl: b });
  $('base').value = b;
  return b;
}

async function call(b, path, method, key) {
  const r = await fetch(`${b}/api/call/${path}`, { method, headers: key ? { Authorization: `Bearer ${key}` } : {} });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && data.ok, data, status: r.status };
}

async function refreshStatus() {
  const { baseUrl, key } = await chrome.storage.local.get(['baseUrl', 'key']);
  if (!baseUrl || !key) return;
  try {
    const r = await call(baseUrl, 'link/status', 'GET', key);
    if (r.status === 401) { await chrome.storage.local.remove('key'); msg('La vinculación ya no es válida. Pulsa «Vincular iPhone».', false); return; }
    if (r.ok) msg(r.data.phones > 0 ? `Vinculado con ${r.data.phones} iPhone${r.data.phones > 1 ? 's' : ''}.` : 'Todavía no hay ningún iPhone vinculado.', r.data.phones > 0);
    return r.ok ? r.data.phones : 0;
  } catch { /* sin conexión */ }
}

$('link').onclick = async () => {
  const b = await base(); if (!b) return;
  try {
    const { key } = await chrome.storage.local.get('key');
    let r = key ? await call(b, 'link/code', 'POST', key) : null;
    if (!r || r.status === 401) {
      r = await call(b, 'link/start', 'POST');
      if (r.ok) await chrome.storage.local.set({ key: r.data.key });
    }
    if (!r.ok) return msg(r.data.message || `Error ${r.status}`, false);
    $('qr').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.data.qr);
    $('code').textContent = r.data.code;
    $('qrbox').style.display = 'block';
    msg('Escanea el QR con la app del iPhone…', true);
    clearInterval(poll);
    const started = Date.now();
    poll = setInterval(async () => {
      const phones = await refreshStatus();
      if (phones > 0) { clearInterval(poll); $('qrbox').style.display = 'none'; msg('✓ iPhone vinculado. Ya puedes usar el clic derecho en Chrome.', true); }
      else if (Date.now() - started > 10 * 60 * 1000) { clearInterval(poll); msg('El QR caducó. Pulsa «Vincular iPhone» otra vez.', false); }
    }, 2000);
  } catch { msg('No se pudo conectar. Revisa la URL en Avanzado.', false); }
};

$('test').onclick = async () => {
  const { baseUrl, key } = await chrome.storage.local.get(['baseUrl', 'key']);
  if (!baseUrl || !key) return msg('Primero vincula el iPhone.', false);
  try {
    const r = await fetch(`${baseUrl}/api/call/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ text: 'Prueba de Llamar con iPhone' }) });
    const data = await r.json().catch(() => ({}));
    msg(r.ok ? 'Prueba enviada. Mira el iPhone.' : (data.message || `Error ${r.status}`), r.ok);
  } catch { msg('No se pudo conectar.', false); }
};

$('save').onclick = async () => { if (await base()) msg('URL guardada.', true); };
$('reset').onclick = async () => { await chrome.storage.local.remove('key'); clearInterval(poll); $('qrbox').style.display = 'none'; msg('Vinculación olvidada.', true); };

load();
