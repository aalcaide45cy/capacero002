// Extracción y normalización de teléfonos (misma lógica que el servidor, que vuelve a validar).
export function normalizePhone(input, cc = '34') {
  if (input == null) return null;
  let s = String(input).trim().replace(/^tel:/i, '').replace(/[;,?#].*$/, '');
  try { s = decodeURIComponent(s); } catch { /* se usa tal cual */ }
  if (!/^[\d\s()+.\- ]+$/.test(s)) return null;
  let plus = s.startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!d) return null;
  if (!plus && d.startsWith('00')) { plus = true; d = d.slice(2); }
  if (!plus) {
    if (d.length === 9 && /^[6789]/.test(d)) d = cc + d;
    else if (d.startsWith(cc) && d.length === 9 + cc.length) { /* ya trae prefijo */ }
    else return null;
  }
  if (d.length < 8 || d.length > 15 || d[0] === '0') return null;
  return '+' + d;
}

const CANDIDATE = /(?:\+|00)?\d[\d\s().\- ]{6,}\d/g;

/** Primer teléfono válido dentro de un texto (tolera espacios, guiones, puntos y paréntesis). Prioriza los que traen prefijo. */
export function findPhone(text) {
  if (!text) return null;
  const found = [];
  for (const m of String(text).matchAll(CANDIDATE)) {
    const n = normalizePhone(m[0].trim());
    if (n) found.push({ n, raw: m[0].trim(), plus: /^(\+|00)/.test(m[0].trim()) });
  }
  return found.find((f) => f.plus) || found[0] || null;
}

export const looksLikeUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());

/** De un HTML sin DOM: prefiere enlaces tel: y, si no hay, el texto visible. */
export function findPhoneInHtml(html) {
  const tels = [...String(html).matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi)];
  for (const m of tels) { const n = normalizePhone(m[1]); if (n) return { n, raw: m[1] }; }
  const text = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  return findPhone(text);
}

/** URL base de la configuración: sin barras finales ni espacios; solo http(s). Devuelve null si no es válida. */
export function normalizeBaseUrl(v) {
  try {
    const u = new URL(String(v).trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    return (u.origin + u.pathname).replace(/\/+$/, '');
  } catch { return null; }
}
