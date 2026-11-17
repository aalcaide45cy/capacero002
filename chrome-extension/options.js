import { normalizeBaseUrl } from './phone.js';

const $ = (id) => document.getElementById(id);
const msg = (t, ok) => { $('msg').textContent = t; $('msg').className = ok ? 'ok' : 'bad'; };

chrome.storage.local.get(['baseUrl', 'token']).then(({ baseUrl, token }) => { $('base').value = baseUrl || ''; $('token').value = token || ''; });

async function ensureHostPermission(base) {
  const origins = [new URL(base).origin + '/*'];
  if (await chrome.permissions.contains({ origins })) return true;
  return chrome.permissions.request({ origins }).catch(() => false);
}

async function save() {
  const base = normalizeBaseUrl($('base').value);
  const token = $('token').value.trim();
  if (!base) { msg('La URL no es válida (usa https://...).', false); return null; }
  if (!token) { msg('Falta el token.', false); return null; }
  if (!(await ensureHostPermission(base))) { msg('Hace falta permiso para ese dominio.', false); return null; }
  await chrome.storage.local.set({ baseUrl: base, token });
  $('base').value = base;
  return { base, token };
}

async function api(cfg, path, method) {
  const r = await fetch(`${cfg.base}/api/call/${path}`, { method, headers: { Authorization: `Bearer ${cfg.token}` } });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && data.ok, data, status: r.status };
}

$('save').onclick = async () => { if (await save()) msg('Guardado.', true); };
$('test').onclick = async () => {
  const cfg = await save(); if (!cfg) return;
  try { const r = await api(cfg, 'ping', 'GET'); msg(r.ok ? 'Conexión correcta.' : (r.data.message || `Error ${r.status}`), r.ok); }
  catch { msg('No se pudo conectar. Revisa la URL.', false); }
};
$('pair').onclick = async () => {
  const cfg = await save(); if (!cfg) return;
  try {
    const r = await api(cfg, 'pair', 'POST');
    if (!r.ok) return msg(r.data.message || `Error ${r.status}`, false);
    $('msg').className = 'ok';
    $('msg').replaceChildren('Escribe este código en la app del iPhone (válido 10 minutos, un solo uso): ', Object.assign(document.createElement('code'), { textContent: r.data.code }));
  } catch { msg('No se pudo conectar. Revisa la URL.', false); }
};
