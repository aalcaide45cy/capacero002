import * as XLSX from 'xlsx';
import { SHEETS_CONFIG } from '../config/sheets';

// Función auxiliar para parsear booleanos de Sheets (TRUE/FALSE)
const parseBoolean = (value) => {
    if (!value) return true; // Default to true if empty (like showPrice)
    const normalized = String(value).trim().toUpperCase();
    return normalized === 'TRUE' || normalized === 'VERDADERO' || normalized === '1';
};

// Función para obtener imagenes de las columnas image1...image10
const parseImages = (row) => {
    const images = [];
    for (let i = 1; i <= 10; i++) {
        const imgUrl = row[`image${i}`];
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
            images.push(imgUrl.trim());
        }
    }
    return images;
};

// Obtener categoría desde el nombre de la hoja "Marketplace - Categoria"
const extractCategory = (sheetName) => {
    const parts = sheetName.split('-');
    if (parts.length > 1) {
        return parts.slice(1).join('-').trim();
    }
    return sheetName.trim();
};

export async function fetchGoogleSheetsProducts() {
    if (!SHEETS_CONFIG.spreadsheetUrl) {
        console.warn('Google Sheets URL is missing in config/sheets.js');
        return [];
    }

    const allProducts = [];

    try {
        const response = await fetch(SHEETS_CONFIG.spreadsheetUrl);
        if (!response.ok) throw new Error('Failed to fetch spreadsheet');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // defval ensures empty cells exist as empty strings

            const products = jsonData.map(row => {
                // Si falta el nombre, saltamos la fila
                if (!row.name) return null;

                return {
                    id: row.id || `sheet-${Math.random().toString(36).substr(2, 9)}`,
                    name: row.name,
                    category: extractCategory(sheetName), // Categoría = Nombre de la Pestaña
                    image: parseImages(row),
                    price: row.price ? String(row.price) : '',
                    showPrice: row.showPrice !== undefined ? parseBoolean(row.showPrice) : true,
                    link: row.link || '',
                    description: row.description || '',
                    tag: row.tag || null,
                    buttonText: row.buttonText || 'VER OFERTA',
                    carouselInterval: row.carouselInterval ? parseInt(row.carouselInterval) : 3000,
                    order: row.order ? parseFloat(row.order) : null
                };
            }).filter(Boolean); // Eliminar nulos

            allProducts.push(...products);
        });

    } catch (error) {
        console.error("Error loading Google Sheets:", error);
    }

    // Ordenar productos
    allProducts.sort((a, b) => {
        const orderA = (a.order !== null && a.order !== undefined) ? a.order : Infinity;
        const orderB = (b.order !== null && b.order !== undefined) ? b.order : Infinity;

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    return allProducts;
}
