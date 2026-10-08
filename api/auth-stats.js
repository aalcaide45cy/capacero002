import { timingSafeCompare, signToken } from './_lib/auth.js';

// En-memoria rate limiting por IP (10 intentos cada 15 minutos)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function cleanOldRateLimits() {
  const now = Date.now();
  for (const [ip, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(ip);
    }
  }
}

export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Comprobar variables de entorno
  const { STATS_PASSWORD, STATS_SECRET } = process.env;
  if (!STATS_PASSWORD || !STATS_SECRET) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Panel pendiente de configuración en Vercel (variables STATS_PASSWORD o STATS_SECRET ausentes).'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Obtener IP del cliente
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  cleanOldRateLimits();
  const now = Date.now();
  let rateInfo = rateLimits.get(ip);
  if (!rateInfo || now > rateInfo.resetAt) {
    rateInfo = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimits.set(ip, rateInfo);
  }

  if (rateInfo.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((rateInfo.resetAt - now) / 60000);
    return res.status(429).json({
      error: 'too_many_attempts',
      message: `Demasiados intentos fallidos. Inténtalo de nuevo en ${minutesLeft} minutos.`
    });
  }

  // Parsear password del body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const password = body?.password;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'missing_password', message: 'Contraseña requerida.' });
  }

  if (timingSafeCompare(password, STATS_PASSWORD)) {
    // Éxito: generar token firmado con validez de 30 días
    const expiresInMs = 30 * 24 * 60 * 60 * 1000;
    const token = signToken(
      {
        sub: 'capacero-admin',
        iat: Date.now(),
        exp: Date.now() + expiresInMs
      },
      STATS_SECRET
    );

    // Resetear contador de fallos para esta IP
    rateLimits.delete(ip);

    return res.status(200).json({
      success: true,
      token,
      expiresIn: 30 * 24 * 3600
    });
  } else {
    // Contraseña incorrecta: incrementar fallos
    rateInfo.count += 1;
    return res.status(401).json({
      error: 'invalid_credentials',
      message: 'Contraseña incorrecta.',
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - rateInfo.count)
    });
  }
}
