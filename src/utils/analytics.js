/**
 * Utility for Google Analytics (GA4) tracking
 */

// Track a custom event
export const trackEvent = (eventName, params = {}) => {
    if (window.gtag) {
        window.gtag('event', eventName, params);
    }
};

// Track search queries
export const trackSearch = (searchTerm) => {
    if (!searchTerm) return;
    trackEvent('search', {
        search_term: searchTerm
    });
};

// Track product clicks
export const trackProductClick = (product) => {
    trackEvent('select_content', {
        content_type: 'product',
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price
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

// Track affiliate link clicks (Final conversion click)
export const trackAffiliateClick = (product) => {
    trackEvent('click_offer', {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        destination: product.link,
        price: product.price
    });
};
