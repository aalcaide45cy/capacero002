// api/video-stats.js - Vercel Serverless Function to fetch live YouTube stats with multi-layer fallback
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Cache in Vercel Edge CDN for 10 minutes (stale-while-revalidate for 20 minutes)
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

  const { id, ids } = req.query;
  const rawIds = ids ? String(ids).split(',').map(s => s.trim()).filter(Boolean) : (id ? [String(id).trim()] : []);

  if (rawIds.length === 0) {
    return res.status(400).json({ error: 'missing_id', message: 'Se requiere el parámetro ?id= o ?ids=' });
  }

  // Limitar a máximo 5 IDs por petición para prevenir sobrecarga
  const targetIds = rawIds.slice(0, 5);

  try {
    const results = {};
    for (const vid of targetIds) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        results[vid] = await fetchVideoStats(vid);
      }
    }

    if (id && targetIds.length === 1) {
      const single = results[targetIds[0]];
      if (single) {
        return res.status(200).json({ success: true, id: targetIds[0], ...single });
      } else {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Error en /api/video-stats:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function formatDurationSec(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return null;
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function fetchVideoStats(videoId) {
  const payload = {
    videoId: videoId,
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'es',
        gl: 'ES'
      }
    }
  };

  let views = null;
  let publishedAt = null;
  let lengthSeconds = null;
  let likes = null;
  let comments = null;

  // Capa 1: Endpoint Player oficial interno
  try {
    const pRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      const rawViews = pData.videoDetails?.viewCount;
      if (rawViews !== undefined && rawViews !== null) {
        const parsed = parseInt(rawViews, 10);
        if (!isNaN(parsed) && parsed > 0) views = parsed;
      }
      const rawDate = pData.microformat?.playerMicroformatRenderer?.publishDate;
      if (rawDate) publishedAt = new Date(rawDate).toISOString();
      const rawLen = pData.videoDetails?.lengthSeconds;
      if (rawLen) lengthSeconds = parseInt(rawLen, 10);
    }
  } catch (e) {}

  // Capa 2: Endpoint Next interno (comentarios, likes y vistas en vivo)
  try {
    const nRes = await fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    if (nRes.ok) {
      const nData = await nRes.json();
      const nStr = JSON.stringify(nData);

      const mLike = nStr.match(/"iconName":"LIKE","title":"([\d.,]+)"/);
      if (mLike) {
        likes = parseInt(mLike[1].replace(/[^0-9]/g, ''), 10) || 0;
      }

      if (nData.engagementPanels) {
        for (const ep of nData.engagementPanels) {
          const panel = ep.engagementPanelSectionListRenderer;
          if (panel && panel.panelIdentifier === 'engagement-panel-comments-section') {
            const text = panel.header?.engagementPanelTitleHeaderRenderer?.contextualInfo?.runs?.[0]?.text;
            if (text) {
              comments = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
            } else {
              comments = 0;
            }
          }
        }
      }
      if (comments === null) comments = 0;

      // Extraer visualizaciones desde Next si Player no las suministró
      if (!views || views === 0) {
        const mViewMatch = nStr.match(/"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([^"]+)"\}/) ||
                           nStr.match(/"viewCount":\{"simpleText":"([^"]+)"\}/) ||
                           nStr.match(/"viewCount":\{"runs":\[\{"text":"([^"]+)"\}/);
        if (mViewMatch) {
          const parsed = parseInt(mViewMatch[1].replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) views = parsed;
        }
      }
    }
  } catch (e) {}

  // Capa 3: Fallback a página pública de YouTube si falta views o duración
  if (!views || views === 0 || !lengthSeconds || lengthSeconds === 0) {
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (watchRes.ok) {
        const html = await watchRes.text();
        if (!views || views === 0) {
          const mHtmlView = html.match(/"viewCount":"(\d+)"/) || html.match(/itemprop="interactionCount"\s+content="(\d+)"/);
          if (mHtmlView) views = parseInt(mHtmlView[1], 10);
        }
        if (!lengthSeconds || lengthSeconds === 0) {
          const mSec = html.match(/"lengthSeconds":"(\d+)"/);
          const mMs = html.match(/"approxDurationMs":"(\d+)"/);
          if (mSec) {
            lengthSeconds = parseInt(mSec[1], 10);
          } else if (mMs) {
            lengthSeconds = Math.round(parseInt(mMs[1], 10) / 1000);
          }
        }
        if (!publishedAt) {
          const mDate = html.match(/"publishDate":"([^"]+)"/) || html.match(/"uploadDate":"([^"]+)"/);
          if (mDate) publishedAt = new Date(mDate[1]).toISOString();
        }
        if (likes === null) {
          const mLike = html.match(/"iconName":"LIKE","title":"([\d.,]+)"/) || html.match(/"likeCount":"(\d+)"/);
          if (mLike) likes = parseInt(mLike[1].replace(/[^0-9]/g, ''), 10) || 0;
        }
      }
    } catch (e) {}
  }

  return {
    views: views || 0,
    likes: likes || 0,
    comments: comments || 0,
    duration: formatDurationSec(lengthSeconds),
    durationSec: lengthSeconds || 0,
    publishedAt
  };
}
