/**
 * Utility for Google Analytics (GA4) and Custom Google Sheets Analytics
 */

// --- GOOGLE SHEETS ANALYTICS CONFIG ---
const SHEETS_DB_URL = "https://script.google.com/macros/s/AKfycbx4_oOWg3bri93p57u2q__jeo33S0ZHT2VSMSHQEGBL_LMTD-g6H5KTw-fyP76h5AI/exec";

// Get or generate an anonymous user ID for the session
const getUserId = () => {
    let uid = localStorage.getItem('capa_cero_uid');
    if (!uid) {
        uid = 'User-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        localStorage.setItem('capa_cero_uid', uid);
    }
    return uid;
};

// Detect where the user came from (e.g., TikTok, YouTube)
const getOrigin = () => {
    // Check if there is an explicit UTM or origin parameter
    const params = new URLSearchParams(window.location.search);
    const paramOrigin = params.get('origen') || params.get('utm_source');
    if (paramOrigin) return paramOrigin;

    // Fallback to referrer
    const referrer = document.referrer;
    if (referrer) {
        if (referrer.includes('tiktok.com')) return 'TikTok';
        if (referrer.includes('youtube.com')) return 'YouTube';
        if (referrer.includes('instagram.com')) return 'Instagram';
        if (referrer.includes('facebook.com')) return 'Facebook';
        if (referrer.includes('t.co') || referrer.includes('twitter.com')) return 'X / Twitter';
        if (referrer.includes('google.')) return 'Google Search';
        try {
            return new URL(referrer).hostname;
        } catch (e) {
            return referrer;
        }
    }

    return 'Directo / Desconocido';
};

// Internal function to send data to the Google Sheets backend quietly
const sendToSheets = (payload) => {
    try {
        const fullPayload = {
            ...payload,
            userId: getUserId(),
            origin: getOrigin()
        };

        fetch(SHEETS_DB_URL, {
            method: 'POST',
            mode: 'no-cors', // Para evitar bloqueos del navegador en peticiones cruzadas simples
            headers: {
                'Content-Type': 'text/plain', // Usamos text/plain para saltar el preflight CORS
            },
            body: JSON.stringify(fullPayload)
        }).catch(() => {
            // Silently fail if adblocker blocks it
        });
    } catch (e) {
        // Silently fail to never break the UI
    }
};

// --- GA4 TRACKING ---

// Track a custom event
export const trackEvent = (eventName, params = {}) => {
    if (window.gtag) {
        window.gtag('event', eventName, params);
    }
};

// Track search queries
let searchTimeout = null;
export const trackSearch = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;

    trackEvent('search', {
        search_term: searchTerm
    });

    // Envío a Google Sheets (con pequeño retraso para no enviar cada letra si teclea rápido)
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        sendToSheets({
            action: 'log_search',
            searchTerm: searchTerm
        });
    }, 1500); // Esperar 1.5s desde la última pulsación para registrar la palabra final
};

// Track product clicks (Vista de la Tarjeta al Modal)
export const trackProductClick = (product) => {
    trackEvent('select_content', {
        content_type: 'product',
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price
    });

    // Envío a Google Sheets (Vista)
    sendToSheets({
        action: 'log_product',
        type: 'view',
        productId: product.id,
        productName: product.name
    });
};

// Track category filter clicks
export const trackCategorySelect = (category) => {
    trackEvent('select_category', {
        category_name: category
    });
};

// Track social media clicks
export const trackSocialClick = (platform) => {
    trackEvent('click_social', {
        platform: platform
    });
};

// Track badge/filter clicks (Top, Oferta, Nuevo)
export const trackFilterSelect = (filterType) => {
    trackEvent('select_filter', {
        filter_type: filterType
    });
};

// Track affiliate link clicks (Final conversion click, ¡EL QUE IMPORTA!)
export const trackAffiliateClick = (product) => {
    trackEvent('click_offer', {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        destination: product.link,
        price: product.price
    });

    // Envío a Google Sheets (Clic final)
    sendToSheets({
        action: 'log_product',
        type: 'click',
        productId: product.id,
        productName: product.name
    });
};

