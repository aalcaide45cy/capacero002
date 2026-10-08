import crypto from 'crypto';

/**
 * Comparación segura contra ataques de temporización (timing attacks).
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Genera un token firmado HMAC-SHA256 con fecha de caducidad.
 */
export function signToken(payload, secret) {
  const headerAndPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(headerAndPayload);
  const signature = hmac.digest('base64url');
  return `${headerAndPayload}.${signature}`;
}

/**
 * Verifica un token firmado y comprueba su caducidad.
 * Devuelve el payload si es válido o null si es inválido/caducado.
 */
export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(encodedPayload);
  const expectedSig = hmac.digest('base64url');

  if (!timingSafeCompare(signature, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Token expirado
    }
    return payload;
  } catch {
    return null;
  }
}
