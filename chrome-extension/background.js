import { findPhone, findPhoneInHtml, normalizePhone, looksLikeUrl, normalizeBaseUrl } from './phone.js';

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
  const { baseUrl, token } = await chrome.storage.local.get(['baseUrl', 'token']);
  const base = normalizeBaseUrl(baseUrl);
  if (!base || !token) return null;
  return { base, token };
}

async function sendNumber({ number, raw, sourceUrl }) {
  const cfg = await getConfig();
  if (!cfg) { report('error', 'Configura la URL y el token en las opciones de la extensión.'); chrome.runtime.openOptionsPage(); return; }
  try {
    const r = await fetch(`${cfg.base}/api/call/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ number, raw, source_url: sourceUrl || '' })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.ok) return report('ok', `${data.number || number} enviado. Mira la notificación del iPhone.`);
    if (data.error === 'invalid_number') return report('invalid', `«${raw || number}» no es un teléfono válido.`);
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
    let hit = null, source = pageUrl || '';
    if (linkUrl && /^tel:/i.test(linkUrl)) {
      const n = normalizePhone(linkUrl);
      if (!n) return report('invalid', `«${linkUrl}» no es un teléfono válido.`);
      hit = { n, raw: linkUrl };
    } else if (linkUrl && /^https?:/i.test(linkUrl)) {
      hit = await phoneFromPage(linkUrl, tab);
      source = linkUrl;
    } else if (selection) {
      hit = findPhone(selection);
      if (!hit && looksLikeUrl(selection)) { hit = await phoneFromPage(selection.trim(), tab); source = selection.trim(); }
    }
    if (!hit) return report('invalid', 'No se encontró ningún teléfono en la selección.');
    await sendNumber({ number: hit.n, raw: hit.raw, sourceUrl: source });
  } catch (e) {
    report('error', e && e.message ? e.message : 'No se pudo leer el teléfono.');
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
    if (!result.trim()) return report('invalid', 'Selecciona primero un teléfono o un enlace.');
    handle({ selection: result.trim(), pageUrl: t.url }, t);
  } catch {
    report('error', 'No se pudo leer la selección en esta página.');
  }
});
