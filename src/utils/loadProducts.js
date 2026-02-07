// Auto-load all JSON files from src/data/
// Returns a unified array of all products from all JSON files

// Normaliza texto removiendo acentos para búsqueda
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Normaliza un producto a la nueva estructura
function normalizeProduct(product) {
    return {
        // Campos básicos con retrocompatibilidad
        id: product.id,
        name: product.name || product.title, // Soporta tanto 'name' como 'title' antiguo
        category: product.category || 'General',
        description: product.description || '',

        // Normalizar imágenes: siempre array
        image: Array.isArray(product.image) ? product.image : [product.image],

        // Precio y visualización
        price: product.price || '',
        showPrice: product.showPrice !== undefined ? product.showPrice : true,

        // Link de afiliado
        link: product.link || product.affiliateLink, // Soporta 'link' y 'affiliateLink' antiguo

        // Campos personalizables
        tag: product.tag || product.badge || null, // Soporta 'tag' y 'badge' antiguo
        buttonText: product.buttonText || 'VER OFERTA',
        carouselInterval: product.carouselInterval || 3000, // Tiempo en ms para el auto-play
    };
}

export async function loadProducts() {
    const productFiles = import.meta.glob('/src/data/*.json');
    const allProducts = [];

    for (const path in productFiles) {
        try {
            const module = await productFiles[path]();
            const products = module.default || module;

            if (Array.isArray(products)) {
                // Normalizar cada producto
                const normalizedProducts = products.map(normalizeProduct);
                allProducts.push(...normalizedProducts);
            }
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
        }
    }

    return allProducts;
}

export function filterProducts(products, query) {
    if (!query.trim()) return products;

    const normalizedQuery = normalizeText(query);

    return products.filter(product => {
        const normalizedName = normalizeText(product.name);
        const normalizedDesc = normalizeText(product.description);

        return normalizedName.includes(normalizedQuery) ||
            normalizedDesc.includes(normalizedQuery);
    });
}
