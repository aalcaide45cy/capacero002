// api/_lib/adminSecurity.js - Primitivas de seguridad del panel /admin: contraseñas, TOTP, cifrado y sesiones.
import crypto from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ---------- Contraseñas (scrypt) ----------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `s1$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const DUMMY_HASH = hashPassword('dummy-password-for-constant-time');

export function verifyPassword(password, stored) {
  const parts = String(stored || DUMMY_HASH).split('$');
  const valid = parts.length === 3 && parts[0] === 's1';
  const [, saltB64, hashB64] = valid ? parts : DUMMY_HASH.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(actual, expected) && valid && Boolean(stored);
}

// ---------- TOTP (RFC 6238, SHA-1, 6 dígitos, 30 s) ----------
export function newTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  return bits.match(/.{5}/g).map(c => B32[parseInt(c, 2)]).join('');
}

function b32decode(s) {
  let bits = '';
  for (const ch of s.replace(/=+$/, '')) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
}

function totpAt(secret, step) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
  return String(code).padStart(6, '0');
}

/** Devuelve el paso (time-step) válido que coincide con el código, o null. Ventana ±1 paso. */
export function verifyTotp(secret, code, now = Date.now()) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const cur = Math.floor(now / 30000);
  let found = null;
  for (const d of [-1, 0, 1]) {
    const ok = crypto.timingSafeEqual(Buffer.from(totpAt(secret, cur + d)), Buffer.from(c));
    if (ok) found = cur + d;
  }
  return found;
}

export function otpauthUrl(secret, email) {
  return `otpauth://totp/${encodeURIComponent('Capa Cero 3D')}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent('Capa Cero 3D')}&algorithm=SHA1&digits=6&period=30`;
}

// ---------- Cifrado de secretos en la base (AES-256-GCM) ----------
function encKey() {
  const k = Buffer.from(process.env.ADMIN_ENC_KEY || '', 'base64');
  if (k.length !== 32) throw new Error('ADMIN_ENC_KEY debe ser 32 bytes en base64');
  return k;
}
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join('.');
}
export function decrypt(blob) {
  const [iv, tag, ct] = String(blob).split('.').map(p => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

// ---------- Tokens, firmas y CSRF ----------
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function hmac(data, purpose) {
  return crypto.createHmac('sha256', encKey()).update(`${purpose}:${data}`).digest('base64url');
}
export function csrfFor(sessionToken) {
  return hmac(sessionToken, 'csrf');
}
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Estado firmado y con caducidad (para el asistente de alta, sin guardar nada hasta confirmar). */
export function signState(obj, ttlMs) {
  const body = Buffer.from(JSON.stringify({ ...obj, exp: Date.now() + ttlMs })).toString('base64url');
  return `${body}.${hmac(body, 'state')}`;
}
export function readState(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || !safeEqual(sig, hmac(body, 'state'))) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
    return obj.exp > Date.now() ? obj : null;
  } catch { return null; }
}

// ---------- Cookies ----------
export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
