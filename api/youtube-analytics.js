import { verifyToken } from './_lib/auth.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { STATS_SECRET, YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;

  // 1. Verificación de autorización con el token del panel
  const authHeader = req.headers.authorization || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.auth_token) {
    token = req.query.auth_token;
  }

  // Si existe STATS_SECRET, validar token obligatoriamente
  if (STATS_SECRET) {
    const verified = verifyToken(token, STATS_SECRET);
    if (!verified) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token de acceso no válido o caducado.'
      });
    }
  }

  // 2. Comprobar si las credenciales OAuth están configuradas en Vercel
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
    return res.status(200).json({
      configured: false,
      notConfigured: true,
      error: 'not_configured',
      message: 'YouTube Analytics API no configurada en Vercel (faltan YT_CLIENT_ID, YT_CLIENT_SECRET o YT_REFRESH_TOKEN).'
    });
  }

  try {
    // 3. Obtener nuevo access_token mediante el refresh_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET,
        refresh_token: YT_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      console.error('Error al renovar access_token de YouTube:', errText);
      return res.status(200).json({
        configured: false,
        notConfigured: true,
        error: 'oauth_refresh_failed',
        message: 'No se pudo renovar el token de acceso OAuth con Google. Revisa YT_REFRESH_TOKEN en Vercel.'
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('Access token vacío en la respuesta de Google OAuth');
    }

    // 4. Consultar suscriptores actuales del canal con YouTube Data API v3
    let subscribers = 0;
    try {
      const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (chRes.ok) {
        const chData = await chRes.json();
        subscribers = parseInt(chData.items?.[0]?.statistics?.subscriberCount || 0, 10);
      }
    } catch (chErr) {
      console.warn('No se pudo obtener el número de suscriptores del canal:', chErr.message);
    }

    // Helper fechas formato YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    const today = new Date();
    const date365Ago = new Date(Date.now() - 365 * 86400000);
    const date335Ago = new Date(Date.now() - 335 * 86400000);
    const date28Ago = new Date(Date.now() - 28 * 86400000);

    const headers = { 'Authorization': `Bearer ${accessToken}` };

    // 5. Informe A: Horas y vistas de los últimos 365 días
    const url365 = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${formatDate(date365Ago)}&endDate=${formatDate(today)}&metrics=estimatedMinutesWatched,views,subscribersGained,subscribersLost`;
    const res365 = await fetch(url365, { headers });
    const data365 = res365.ok ? await res365.json() : null;
    const row365 = data365?.rows?.[0] || [0, 0, 0, 0];
    const minutes365 = row365[0] || 0;
    const watchHours365 = Math.round((minutes365 / 60) * 10) / 10;
    const views365 = row365[1] || 0;

    // 6. Informe B: Horas que caducan en los próximos 30 días (las generadas hace 335 a 365 días)
    const urlExpiring = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${formatDate(date365Ago)}&endDate=${formatDate(date335Ago)}&metrics=estimatedMinutesWatched,views`;
    const resExpiring = await fetch(urlExpiring, { headers });
    const dataExpiring = resExpiring.ok ? await resExpiring.json() : null;
    const rowExpiring = dataExpiring?.rows?.[0] || [0, 0];
    const expiringMinutes = rowExpiring[0] || 0;
    const expiringHours30Days = Math.round((expiringMinutes / 60) * 10) / 10;

    // 7. Informe C: Ritmo medio diario de los últimos 28 días
    const url28 = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${formatDate(date28Ago)}&endDate=${formatDate(today)}&metrics=estimatedMinutesWatched,views`;
    const res28 = await fetch(url28, { headers });
    const data28 = res28.ok ? await res28.json() : null;
    const row28 = data28?.rows?.[0] || [0, 0];
    const minutes28 = row28[0] || 0;
    const watchHours28 = Math.round((minutes28 / 60) * 10) / 10;
    const dailyRateHours28Days = Math.round((watchHours28 / 28) * 100) / 100;

    // Estimación para llegar a 4.000 h
    const remainingHours = Math.max(0, 4000 - watchHours365);
    let estimatedDaysToTarget = null;
    let estimatedDateToTarget = null;
    if (dailyRateHours28Days > 0 && remainingHours > 0) {
      estimatedDaysToTarget = Math.ceil(remainingHours / dailyRateHours28Days);
      const estDate = new Date(Date.now() + estimatedDaysToTarget * 86400000);
      estimatedDateToTarget = estDate.toISOString().split('T')[0];
    } else if (remainingHours === 0) {
      estimatedDaysToTarget = 0;
      estimatedDateToTarget = today.toISOString().split('T')[0];
    }

    // 8. Informe D: Ranking de vídeos por horas en los últimos 28 días
    const urlTopVideos = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${formatDate(date28Ago)}&endDate=${formatDate(today)}&dimensions=video&metrics=estimatedMinutesWatched,views&sort=-estimatedMinutesWatched&maxResults=10`;
    const resTopVideos = await fetch(urlTopVideos, { headers });
    const dataTopVideos = resTopVideos.ok ? await resTopVideos.json() : null;
    const topVideos = (dataTopVideos?.rows || []).map(r => ({
      videoId: r[0],
      watchHours: Math.round((r[1] / 60) * 10) / 10,
      views: r[2] || 0
    }));

    // 9. Informe E: Horas por fuente de tráfico (últimos 28 días)
    const urlSources = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${formatDate(date28Ago)}&endDate=${formatDate(today)}&dimensions=insightTrafficSourceType&metrics=estimatedMinutesWatched,views&sort=-estimatedMinutesWatched`;
    const resSources = await fetch(urlSources, { headers });
    const dataSources = resSources.ok ? await resSources.json() : null;

    const sourceTranslations = {
      'YT_SEARCH': 'Búsqueda de YouTube',
      'RELATED_VIDEO': 'Vídeos sugeridos',
      'EXT_URL': 'Externo y Embebido (capacero3d.com, web)',
      'SUBSCRIBER': 'Feed de suscripciones',
      'YT_CHANNEL': 'Página del canal',
      'NOTIFICATION': 'Notificaciones de YouTube',
      'PLAYLIST': 'Listas de reproducción',
      'DIRECT': 'Directo o desconocido',
      'END_SCREEN': 'Pantallas finales',
      'CARD': 'Tarjetas de información',
      'SHORTS': 'Feed de Shorts',
      'CAMPAIGN': 'Campañas y anuncios'
    };

    const trafficSources = (dataSources?.rows || []).map(r => ({
      sourceKey: r[0],
      sourceName: sourceTranslations[r[0]] || r[0],
      watchHours: Math.round((r[1] / 60) * 10) / 10,
      views: r[2] || 0,
      isEmbedded: r[0] === 'EXT_URL'
    }));

    return res.status(200).json({
      configured: true,
      notConfigured: false,
      watchHours365,
      watchHoursTarget: 4000,
      progressPercentHours: Math.min(100, Math.round((watchHours365 / 4000) * 100)),
      subscribers,
      subscribersTarget: 1000,
      progressPercentSubs: Math.min(100, Math.round((subscribers / 1000) * 100)),
      expiringHours30Days,
      watchHours28,
      dailyRateHours28Days,
      remainingHours,
      estimatedDaysToTarget,
      estimatedDateToTarget,
      topVideos,
      trafficSources,
      views365,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error procesando YouTube Analytics:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Error al consultar la API de YouTube Analytics.',
      details: error.message
    });
  }
}
