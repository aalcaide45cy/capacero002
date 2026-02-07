// Auto-load all JSON files from src/data/
// Returns a unified array of all products from all JSON files

export async function loadProducts() {
    // Use Vite's glob import to load all JSON files
    const dataFiles = import.meta.glob('/src/data/*.json');

    let allProducts = [];

    // Load each file and merge into single array
    for (const path in dataFiles) {
        try {
            const module = await dataFiles[path]();
            const products = module.default;

            if (Array.isArray(products)) {
                allProducts = [...allProducts, ...products];
            }
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
        }
    }

    return allProducts;
}

// Normalize text to remove accents/tildes for search
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

// Filter products by search query
export function filterProducts(products, query) {
    if (!query || query.trim() === '') {
        return products;
    }

    const normalizedQuery = normalizeText(query);

    return products.filter(product => {
        const normalizedTitle = normalizeText(product.title);
        const normalizedDesc = normalizeText(product.description);
        return normalizedTitle.includes(normalizedQuery) || normalizedDesc.includes(normalizedQuery);
    });
}
