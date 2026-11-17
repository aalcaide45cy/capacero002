import { findPhone, findPhoneInHtml, normalizePhone, normalizeBaseUrl } from './phone.js';

const MENU_ID = 'call-iphone';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: 'Llamar con iPhone', contexts: ['selection', 'link'] });
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

// ---------- Aviso del resultado (notificación + badge) ----------
function report(kind, message) {
  const ok = kind === 'ok';
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#16a34a' : kind === 'invalid' ? '#d97706' : '#dc2626' });
  chrome.action.setBadgeText({ text: ok ? 'OK' : kind === 'invalid' ? '?' : 'ERR' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
  chrome.notifications.create({
    type: 'basic', iconUrl: 'icons/icon128.png',
    title: ok ? 'Enviado al iPhone' : kind === 'invalid' ? 'Número no válido' : 'Error al enviar',
    message
  });
}

async function getConfig() {
  const { baseUrl, key } = await chrome.storage.local.get(['baseUrl', 'key']);
  const base = normalizeBaseUrl(baseUrl);
  if (!base || !key) return null;
  return { base, key };
}

async function send({ number, text, raw, sourceUrl }) {
  const cfg = await getConfig();
  if (!cfg) { report('error', 'Primero vincula el iPhone: abre las opciones de la extensión y pulsa «Vincular iPhone».'); chrome.runtime.openOptionsPage(); return; }
  try {
    const r = await fetch(`${cfg.base}/api/call/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ number, text, raw, source_url: sourceUrl || '' })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.ok) {
      const what = data.kind === 'phone' ? `Teléfono ${data.number}` : data.kind === 'url' ? 'Enlace' : 'Texto';
      return report('ok', `${what} enviado. Mira la notificación del iPhone.`);
    }
    if (data.error === 'invalid_number') return report('invalid', `«${raw || number}» no es un teléfono válido.`);
    if (data.error === 'unauthorized') return report('error', 'Esta extensión ya no está vinculada. Vuelve a vincular el iPhone en las opciones.');
    report('error', data.message || `El servidor respondió ${r.status}.`);
  } catch {
    report('error', 'No se pudo conectar con el servidor. Revisa la URL en las opciones.');
  }
}

// ---------- Obtención del teléfono ----------
async function phoneFromPage(url, tab) {
  // Enlace a la propia pestaña: se lee con activeTab, sin permisos extra.
  if (tab && tab.id != null && tab.url && tab.url.split('#')[0] === url.split('#')[0]) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ tels: [...document.querySelectorAll('a[href^="tel:" i]')].map((a) => a.getAttribute('href')), text: document.body ? document.body.innerText : '' })
      });
      for (const t of result.tels) { const n = normalizePhone(t); if (n) return { n, raw: t }; }
      return findPhone(result.text);
    } catch { /* se intenta por descarga */ }
  }
  const origin = new URL(url).origin + '/*';
  // Otra página: hace falta permiso de ese sitio (se pide una vez, con el clic del menú).
  if (!(await chrome.permissions.contains({ origins: [origin] }))) {
    const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false);
    if (!granted) throw new Error('Sin permiso para leer esa página.');
  }
  const r = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!r.ok) throw new Error(`La página respondió ${r.status}.`);
  const html = (await r.text()).slice(0, 400000);
  return findPhoneInHtml(html);
}

async function handle({ linkUrl, selection, pageUrl }, tab) {
  try {
    if (linkUrl && /^tel:/i.test(linkUrl)) {
      const n = normalizePhone(linkUrl);
      if (!n) return report('invalid', `«${linkUrl}» no es un teléfono válido.`);
      return send({ number: n, raw: linkUrl, sourceUrl: pageUrl });
    }
    if (linkUrl && /^https?:/i.test(linkUrl)) {
      // Enlace normal: si la página tiene un teléfono se envía; si no, se envía el propio enlace.
      let hit = null;
      try { hit = await phoneFromPage(linkUrl, tab); } catch { /* sin permiso o sin acceso: se envía el enlace */ }
      return hit ? send({ number: hit.n, raw: hit.raw, sourceUrl: linkUrl }) : send({ text: linkUrl, sourceUrl: pageUrl });
    }
    if (selection) {
      const hit = findPhone(selection);
      if (hit) return send({ number: hit.n, raw: hit.raw, sourceUrl: pageUrl });
      // Sin teléfono: se envía como enlace o como texto (el iPhone lo distingue).
      return send({ text: selection.trim().slice(0, 500), sourceUrl: pageUrl });
    }
    report('invalid', 'No hay nada seleccionado.');
  } catch (e) {
    report('error', e && e.message ? e.message : 'No se pudo enviar.');
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  handle({ linkUrl: info.linkUrl, selection: info.selectionText, pageUrl: info.pageUrl }, tab);
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'send-selection') return;
  try {
    const [t] = tab && tab.id != null ? [tab] : await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: t.id }, func: () => String(getSelection() || '') });
    if (!result.trim()) return report('invalid', 'Selecciona primero un teléfono, un enlace o un texto.');
    handle({ selection: result.trim(), pageUrl: t.url }, t);
  } catch {
    report('error', 'No se pudo leer la selección en esta página.');
  }
});
