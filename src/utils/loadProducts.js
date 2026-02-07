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
        order: product.order !== undefined ? product.order : null, // Orden de visualización
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

    // Ordenar productos:
    // 1. Por 'order' ascendente (los que tienen número van primero)
    // 2. Si no tienen 'order' (null), se consideran Infinity para ir al final
    // 3. Empate o sin 'order': por orden alfabético de 'name'
    allProducts.sort((a, b) => {
        const orderA = (a.order !== null && a.order !== undefined) ? a.order : Infinity;
        const orderB = (b.order !== null && b.order !== undefined) ? b.order : Infinity;

        // Si tienen diferente orden (y no son ambos Infinity/null)
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // Si tienen el mismo orden o ambos son null -> Alfabético
        return a.name.localeCompare(b.name);
    });

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
