import { verifyToken } from './_lib/auth.js';

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg/exec';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { STATS_SECRET, STATS_API_TOKEN, SHEETS_DB_URL } = process.env;

  // Si no está configurado el secreto en Vercel, responder not_configured
  if (!STATS_SECRET) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Panel pendiente de configuración en Vercel (STATS_SECRET ausente).'
    });
  }

  // Extraer token de autorización (Bearer <token> o ?auth_token=...)
  const authHeader = req.headers.authorization || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.auth_token) {
    token = req.query.auth_token;
  }

  const verified = verifyToken(token, STATS_SECRET);
  if (!verified) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Token de acceso no válido o caducado.'
    });
  }

  // Preparar URL hacia Google Apps Script
  const baseUrl = SHEETS_DB_URL || DEFAULT_APPS_SCRIPT_URL;
  const targetUrl = new URL(baseUrl);

  // Reenviar todos los parámetros de query excepto auth_token
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key !== 'auth_token') {
      targetUrl.searchParams.set(key, value);
    }
  }

  // Si existe STATS_API_TOKEN, adjuntarlo como token hacia Apps Script
  if (STATS_API_TOKEN) {
    targetUrl.searchParams.set('token', STATS_API_TOKEN);
  }

  try {
    const fetchOptions = {
      method: req.method,
      redirect: 'follow'
    };

    if (req.method === 'POST') {
      fetchOptions.headers = {
        'Content-Type': req.headers['content-type'] || 'text/plain;charset=utf-8'
      };
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const scriptResponse = await fetch(targetUrl.toString(), fetchOptions);
    const contentType = scriptResponse.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await scriptResponse.json();
      return res.status(scriptResponse.status).json(data);
    } else {
      const text = await scriptResponse.text();
      res.setHeader('Content-Type', contentType || 'text/plain;charset=utf-8');
      return res.status(scriptResponse.status).send(text);
    }
  } catch (err) {
    console.error('Error en stats-proxy al conectar con Apps Script:', err);
    return res.status(502).json({
      error: 'bad_gateway',
      message: 'No se pudo contactar con el backend de Google Sheets.',
      details: err.message
    });
  }
}
