/**
 * Capa Cero Analytics Engine v4
 * Sistema integral de telemetría, geolocalización, atribución de suscriptores,
 * dwell time por secciones, interacciones y sincronización inteligente con Google Sheets
 * sin impacto en el rendimiento ni en los Core Web Vitals.
 */

import { saveSession, saveEvent } from './analyticsStorage';

// --- CONFIGURACIÓN DE GOOGLE SHEETS ---
const GOOGLE_SHEETS_ENABLED = true;
const SHEETS_DB_URL = "https://script.google.com/macros/s/AKfycbx4_oOWg3bri93p57u2q__jeo33S0ZHT2VSMSHQEGBL_LMTD-g6H5KTw-fyP76h5AI/exec";

// Identificadores únicos y persistentes
export const getUserId = () => {
    let uid = localStorage.getItem('capa_cero_uid');
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
        localStorage.setItem('capa_cero_uid', uid);
    }
    return uid;
};

export const getSessionId = () => {
    let sid = sessionStorage.getItem('capa_cero_sid');
    if (!sid) {
        sid = 'ses_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        sessionStorage.setItem('capa_cero_sid', sid);
    }
    return sid;
};

// Detección del canal de origen / referrer / UTM
export const getOrigin = () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const paramOrigin = params.get('origen') || params.get('utm_source') || params.get('source');
        if (paramOrigin) {
            const med = params.get('utm_medium') ? ` (${params.get('utm_medium')})` : '';
            return `${paramOrigin}${med}`;
        }

        const referrer = document.referrer;
        if (referrer) {
            const refLower = referrer.toLowerCase();
            if (refLower.includes('youtube.com') || refLower.includes('youtu.be')) return 'YouTube (Canal/Vídeo)';
            if (refLower.includes('tiktok.com') || refLower.includes('vm.tiktok.com')) return 'TikTok (@capacero)';
            if (refLower.includes('instagram.com')) return 'Instagram (@capa.cero_3d)';
            if (refLower.includes('facebook.com') || refLower.includes('fb.me')) return 'Facebook';
            if (refLower.includes('t.co') || refLower.includes('twitter.com') || refLower.includes('x.com')) return 'X / Twitter';
            if (refLower.includes('google.')) return 'Google Search (Orgánico)';
            if (refLower.includes('bing.') || refLower.includes('duckduckgo.')) return 'Buscador Externo';
            try {
                return new URL(referrer).hostname;
            } catch (e) {
                return referrer;
            }
        }

        const ua = navigator.userAgent || '';
        const uaLower = ua.toLowerCase();
        if (uaLower.includes('tiktok') || uaLower.includes('bytedance') || uaLower.includes('musical_ly')) return 'TikTok (App)';
        if (uaLower.includes('instagram')) return 'Instagram (App)';
        if (uaLower.includes('fban') || uaLower.includes('fbav')) return 'Facebook (App)';

        return 'Directo / Favoritos';
    } catch (e) {
        return 'Directo';
    }
};

// Detección técnica de dispositivo, SO y Navegador
export const getDeviceDetails = () => {
    const ua = navigator.userAgent || '';
    let device = 'Desktop';
    let os = 'Desconocido';
    let browser = 'Desconocido';

    // Device
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        device = 'Tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
        device = 'Móvil';
    }

    // OS
    if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS / iPadOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Browser
    if (/TikTok/i.test(ua)) browser = 'TikTok In-App';
    else if (/Instagram/i.test(ua)) browser = 'Instagram In-App';
    else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome/i.test(ua) && !/Chromium|Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome|Edg/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

    return {
        device,
        os,
        browser,
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        language: navigator.language || 'es-ES'
    };
};

// Bandera Emoji según código ISO (ej: 'ES' -> 🇪🇸)
const getFlagEmoji = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

// Detección de GeoLocalización (con caché de sesión para máxima velocidad)
export const getGeoLocation = async () => {
    const cached = sessionStorage.getItem('capa_cero_geo');
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (e) {}
    }

    const defaultGeo = {
        country: 'España',
        countryCode: 'ES',
        flag: '🇪🇸',
        region: 'Madrid',
        city: 'Madrid',
        ip: '127.0.0.1'
    };

    try {
        // Proveedor GeoIP gratuito y sin API key (ipwho.is)
        const res = await fetch('https://ipwho.is/', { cache: 'force-cache' });
        const data = await res.json();
        if (data && data.success !== false) {
            const geo = {
                country: data.country || 'España',
                countryCode: data.country_code || 'ES',
                flag: data.flag?.emoji || getFlagEmoji(data.country_code || 'ES'),
                region: data.region || data.city || 'Madrid',
                city: data.city || 'Madrid',
                ip: data.ip ? data.ip.replace(/\.\d+$/, '.xxx') : 'Anon'
            };
            sessionStorage.setItem('capa_cero_geo', JSON.stringify(geo));
            return geo;
        }
    } catch (err) {
        // Fallback rápido
    }

    return defaultGeo;
};

// --- ESTADO DE SESIÓN GLOBAL EN MEMORIA ---
let currentSession = null;
let activeDwellInterval = null;
let sectionTimes = {
    'Hero Principal': 0,
    'Videoteca Grid': 0,
    'Doctor 3D': 0,
    'Descargas': 0,
    'Modal de Vídeo': 0
};
let currentActiveSection = 'Hero Principal';
let lastTickTime = Date.now();
let isWindowFocused = true;

// Buffers de interacciones en memoria
let sessionClickedCards = [];
let sessionDownloadedItems = [];
let sessionSearchTerms = [];
let sessionDoctorConsults = [];

// Envío a Google Sheets (Asíncrono de 0ms con sendBeacon o fetch keepalive)
export const sendToSheetsIfEnabled = (extraData = {}) => {
    try {
        const customWebhook = localStorage.getItem('capa_cero_sheets_webhook');
        const targetUrl = customWebhook || (GOOGLE_SHEETS_ENABLED ? SHEETS_DB_URL : null);
        if (!targetUrl) return;

        const payload = {
            timestamp: currentSession?.timestamp || new Date().toISOString(),
            sessionId: currentSession?.sessionId || getSessionId(),
            country: currentSession?.country || '',
            countryCode: currentSession?.countryCode || '',
            flag: currentSession?.flag || '',
            region: currentSession?.region || '',
            city: currentSession?.city || '',
            device: currentSession?.device || '',
            os: currentSession?.os || '',
            browser: currentSession?.browser || '',
            origin: currentSession?.origin || getOrigin(),
            totalActiveSeconds: currentSession?.totalActiveSeconds || 0,
            hasSubscribed: currentSession?.hasSubscribed || false,
            subscribedFrom: currentSession?.subscribedFrom || '',
            dwellTimes: currentSession?.dwellTimes || { ...sectionTimes },
            clickedCards: [...new Set(sessionClickedCards)],
            downloads: [...new Set(sessionDownloadedItems)],
            searches: [...new Set(sessionSearchTerms)],
            doctorConsults: [...new Set(sessionDoctorConsults)],
            ...extraData
        };

        const jsonStr = JSON.stringify(payload);

        // Envío en segundo plano sin bloquear el hilo principal (sendBeacon cuesta 0ms)
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([jsonStr], { type: 'text/plain;charset=utf-8' });
            navigator.sendBeacon(targetUrl, blob);
        } else {
            fetch(targetUrl, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: jsonStr
            }).catch(() => {});
        }
    } catch (e) {}
};

// Sincronizar sesión activa a IndexedDB
const persistCurrentSession = () => {
    if (!currentSession) return;
    currentSession.dwellTimes = { ...sectionTimes };
    saveSession(currentSession);
};

// Inicializar la sesión del visitante
export const initAnalyticsSession = async () => {
    if (currentSession) return currentSession;

    const sessionId = getSessionId();
    const userId = getUserId();
    const origin = getOrigin();
    const deviceDetails = getDeviceDetails();
    const geo = await getGeoLocation();

    currentSession = {
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        ip: geo.ip,
        country: geo.country,
        countryCode: geo.countryCode,
        flag: geo.flag,
        region: geo.region,
        city: geo.city,
        device: deviceDetails.device,
        os: deviceDetails.os,
        browser: deviceDetails.browser,
        screen: deviceDetails.screen,
        language: deviceDetails.language,
        origin,
        totalActiveSeconds: 0,
        scrollDepth: 0,
        hasSubscribed: false,
        subscribedFrom: null,
        isReal: true,
        isDemo: false,
        dwellTimes: { ...sectionTimes }
    };

    await saveSession(currentSession);
    await saveEvent({
        sessionId,
        type: 'session_start',
        details: {
            origin,
            country: geo.country,
            city: geo.city,
            device: deviceDetails.device,
            browser: deviceDetails.browser
        }
    });

    // Iniciar temporizador de tiempo activo
    setupActiveTimeTracker();

    // Iniciar observador de scroll depth
    setupScrollTracker();

    // Sincronizar con Google Sheets en segundo plano sin retrasar el primer render
    if (typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => sendToSheetsIfEnabled(), { timeout: 3500 });
        } else {
            setTimeout(() => sendToSheetsIfEnabled(), 3000);
        }
    }

    return currentSession;
};

// Temporizador de permanencia activa optimizado
const setupActiveTimeTracker = () => {
    if (activeDwellInterval) clearInterval(activeDwellInterval);

    window.addEventListener('focus', () => { isWindowFocused = true; lastTickTime = Date.now(); });
    window.addEventListener('blur', () => {
        isWindowFocused = false;
        persistCurrentSession();
        sendToSheetsIfEnabled();
    });
    document.addEventListener('visibilitychange', () => {
        isWindowFocused = !document.hidden;
        lastTickTime = Date.now();
        if (document.hidden) {
            persistCurrentSession();
            sendToSheetsIfEnabled();
        }
    });
    window.addEventListener('pagehide', () => {
        persistCurrentSession();
        sendToSheetsIfEnabled();
    });

    let ticksCount = 0;
    activeDwellInterval = setInterval(() => {
        if (!isWindowFocused || !currentSession) return;

        const now = Date.now();
        const deltaSec = Math.round((now - lastTickTime) / 1000);
        lastTickTime = now;

        if (deltaSec > 0 && deltaSec < 15) {
            currentSession.totalActiveSeconds = (currentSession.totalActiveSeconds || 0) + deltaSec;
            if (currentActiveSection && sectionTimes[currentActiveSection] !== undefined) {
                sectionTimes[currentActiveSection] += deltaSec;
            } else if (currentActiveSection) {
                sectionTimes[currentActiveSection] = (sectionTimes[currentActiveSection] || 0) + deltaSec;
            }

            ticksCount++;
            // Persistir de forma eficiente cada 15 segundos en segundo plano
            if (ticksCount % 3 === 0) {
                persistCurrentSession();
            }
        }
    }, 5000);
};

// Cambiar la sección activa actual para medir tiempo de permanencia (Dwell Time)
export const setActiveSection = (sectionName) => {
    currentActiveSection = sectionName;
    if (sectionTimes[sectionName] === undefined) {
        sectionTimes[sectionName] = 0;
    }
};

// Rastreador de Scroll Depth optimizado con requestAnimationFrame
let reachedMilestones = new Set();
const setupScrollTracker = () => {
    let ticking = false;
    const handleScroll = () => {
        if (reachedMilestones.size >= 4) {
            window.removeEventListener('scroll', handleScroll);
            return;
        }

        if (!ticking) {
            window.requestAnimationFrame(() => {
                const h = document.documentElement;
                const b = document.body;
                const totalHeight = (h.scrollHeight || b.scrollHeight) - h.clientHeight;
                if (totalHeight > 0) {
                    const scrollPos = h.scrollTop || b.scrollTop || window.scrollY;
                    const percent = Math.min(100, Math.round((scrollPos / totalHeight) * 100));

                    [25, 50, 75, 100].forEach(milestone => {
                        if (percent >= milestone && !reachedMilestones.has(milestone)) {
                            reachedMilestones.add(milestone);
                            if (currentSession) {
                                currentSession.scrollDepth = milestone;
                                persistCurrentSession();
                            }
                            saveEvent({
                                sessionId: getSessionId(),
                                type: 'scroll_depth',
                                details: { depth: milestone }
                            });
                        }
                    });
                }
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
};

// --- EVENTOS PÚBLICOS DE TELEMETRÍA ---

// 1. Clic en Tarjeta de Vídeo / Producto
export const trackCardClick = (cardData) => {
    const title = cardData.title || cardData.name || 'Tutorial';
    sessionClickedCards.push(title);

    const payload = {
        title,
        id: cardData.id || '',
        category: cardData.category || 'General',
        sourceSection: currentActiveSection
    };

    saveEvent({
        sessionId: getSessionId(),
        type: 'card_click',
        details: payload
    });

    if (window.gtag) {
        window.gtag('event', 'select_content', {
            content_type: 'video_card',
            item_id: cardData.id,
            item_name: title
        });
    }
};

// 2. Apertura de Modal de Vídeo / Reproducción
export const trackVideoOpen = (video) => {
    const title = video.title || 'Tutorial';
    sessionClickedCards.push(title);

    const payload = {
        title,
        id: video.id || '',
        category: video.category || 'General',
        youtubeId: video.youtubeId || ''
    };

    setActiveSection('Modal de Vídeo');

    saveEvent({
        sessionId: getSessionId(),
        type: 'video_open',
        details: payload
    });

    if (window.gtag) {
        window.gtag('event', 'video_start', {
            video_title: video.title,
            video_id: video.youtubeId
        });
    }
};

// 3. Suscripción al Canal (¡CON ATRIBUCIÓN EXACTA!)
export const trackSubscribe = (sourceContext = 'Hero CTA', videoDetails = null) => {
    const videoTitle = videoDetails?.title || (sourceContext.includes('Vídeo:') ? sourceContext.replace('Vídeo: ', '') : null);
    const attribution = videoTitle ? `Vídeo: ${videoTitle}` : sourceContext;

    if (currentSession) {
        currentSession.hasSubscribed = true;
        currentSession.subscribedFrom = attribution;
        persistCurrentSession();
    }

    saveEvent({
        sessionId: getSessionId(),
        type: 'subscribe_click',
        details: {
            source: attribution,
            videoTitle: videoTitle || null,
            section: currentActiveSection
        }
    });

    sendToSheetsIfEnabled({
        hasSubscribed: true,
        subscribedFrom: attribution
    });

    if (window.gtag) {
        window.gtag('event', 'conversion', {
            send_to: 'subscribe',
            event_category: 'Channel Subscription',
            event_label: attribution
        });
    }
};

// 4. Descarga de Perfil / Archivo .3MF
export const trackDownload = (downloadItem, video = null) => {
    const label = downloadItem.label || downloadItem.name || 'Descarga';
    sessionDownloadedItems.push(label);

    const payload = {
        label,
        url: downloadItem.url || '',
        videoTitle: video?.title || 'Descarga Directa',
        category: video?.category || 'Recursos'
    };

    saveEvent({
        sessionId: getSessionId(),
        type: 'download_click',
        details: payload
    });

    if (window.gtag) {
        window.gtag('event', 'file_download', {
            file_name: payload.label,
            video_origin: payload.videoTitle
        });
    }
};

// 5. Diagnóstico de Doctor 3D
export const trackDoctorSelect = (problem, clickedVideo = false) => {
    sessionDoctorConsults.push(problem.title);

    saveEvent({
        sessionId: getSessionId(),
        type: 'doctor3d_select',
        details: {
            symptom: problem.title,
            keyword: problem.keywordSearch,
            clickedVideoSolution: clickedVideo
        }
    });
};

// 6. Búsqueda en el buscador
let searchDebounce = null;
export const trackSearch = (searchTerm, resultsCount = 0) => {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    sessionSearchTerms.push(searchTerm.trim());

    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        saveEvent({
            sessionId: getSessionId(),
            type: 'search_query',
            details: {
                term: searchTerm.trim(),
                resultsCount
            }
        });

        if (window.gtag) {
            window.gtag('event', 'search', { search_term: searchTerm });
        }
    }, 1200);
};

// 7. Clic en Redes Sociales
export const trackSocialClick = (platform) => {
    saveEvent({
        sessionId: getSessionId(),
        type: 'social_click',
        details: { platform }
    });

    if (window.gtag) {
        window.gtag('event', 'social_interaction', { platform });
    }
};

// 8. Clics de compatibilidad con V2 / Afiliados
export const trackProductClick = (product) => trackCardClick(product);
export const trackAffiliateClick = (product) => {
    saveEvent({
        sessionId: getSessionId(),
        type: 'affiliate_click',
        details: { name: product.name, id: product.id, price: product.price }
    });
};
export const trackFilterSelect = (filter) => {
    saveEvent({ sessionId: getSessionId(), type: 'filter_select', details: { filter } });
};
export const trackCategorySelect = (category) => {
    saveEvent({ sessionId: getSessionId(), type: 'category_select', details: { category } });
};
export const trackEvent = (eventName, params = {}) => {
    if (window.gtag) window.gtag('event', eventName, params);
};
