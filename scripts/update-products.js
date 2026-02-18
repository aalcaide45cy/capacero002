import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { SHEETS_CONFIG } from '../src/config/sheets.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const PUBLIC_IMG_DIR = path.resolve(__dirname, '../public/images/products');
const OUTPUT_FILE = path.join(DATA_DIR, 'products.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_IMG_DIR)) fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });

// Helper to download and optimize image
async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Optimize with sharp
        // Change extension to .webp
        const optimizedFilename = filename.replace(/\.[^.]+$/, '.webp');
        const filePath = path.join(PUBLIC_IMG_DIR, optimizedFilename);

        await sharp(buffer)
            .resize(800, null, { withoutEnlargement: true }) // Max width 800px (sufficient for mobile)
            .webp({ quality: 80 }) // Convert to modern WebP format
            .toFile(filePath);

        console.log(`✅ Optimized: ${optimizedFilename}`);
        return `/images/products/${optimizedFilename}`;
    } catch (error) {
        console.error(`❌ Error downloading ${url}:`, error.message);
        return null;
    }
}

// Helper: Parse Boolean (same as in googleSheets.js)
const parseBoolean = (value) => {
    if (!value) return false;
    const normalized = String(value).trim().toUpperCase();
    return normalized === 'TRUE' || normalized === 'VERDADERO' || normalized === '1';
};

const extractCategory = (sheetName) => {
    const parts = sheetName.split('-');
    if (parts.length > 1) return parts.slice(1).join('-').trim();
    return sheetName.trim();
};

async function main() {
    console.log('🚀 Starting Static Product Update...');
    console.log(`📂 Source Sheet: ${SHEETS_CONFIG.spreadsheetUrl}`);

    try {
        const response = await fetch(SHEETS_CONFIG.spreadsheetUrl);
        if (!response.ok) throw new Error('Failed to fetch spreadsheet');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const allProducts = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            console.log(`📄 Processing Sheet: ${sheetName} (${jsonData.length} rows)`);

            for (const row of jsonData) {
                if (!row.name) continue;

                const id = row.id || `sheet-${Math.random().toString(36).substr(2, 9)}`;

                // Process Images
                const images = [];
                for (let i = 1; i <= 10; i++) {
                    const imgUrl = row[`image${i}`];
                    // Handle image column being just "image" if coming from single column legacy
                    const legacyImg = i === 1 ? row.image : null;
                    const targetUrl = imgUrl || legacyImg;

                    if (targetUrl && typeof targetUrl === 'string' && targetUrl.trim()) {
                        const url = targetUrl.trim();
                        // Generate filename based on ID and index
                        const ext = path.extname(url).split('?')[0] || '.jpg';
                        const filename = `${id}-${i}${ext}`;

                        // Download image
                        const localPath = await downloadImage(url, filename);
                        if (localPath) images.push(localPath);
                        else images.push(url); // Fallback to remote if download fails
                    }
                }

                const product = {
                    id: id,
                    name: row.name,
                    category: extractCategory(sheetName),
                    image: images, // Valid Local Paths
                    price: row.price ? String(row.price) : '',
                    showPrice: row.showPrice !== undefined ? parseBoolean(row.showPrice) : false,
                    link: row.link || '',
                    description: row.description || '',
                    tag: row.tag || null,
                    buttonText: row.buttonText || 'VER OFERTA',
                    carouselInterval: row.carouselInterval ? parseInt(row.carouselInterval) : 3000,
                    order: row.order ? parseFloat(row.order) : null
                };

                allProducts.push(product);
            }
        }

        // Sort products
        allProducts.sort((a, b) => {
            const orderA = (a.order !== null && a.order !== undefined) ? a.order : Infinity;
            const orderB = (b.order !== null && b.order !== undefined) ? b.order : Infinity;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });

        // Write to file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
        console.log(`\n✨ Success! Generated ${allProducts.length} products in src/data/products.json`);

    } catch (error) {
        console.error('🔥 Fatal Error:', error);
        process.exit(1);
    }
}

main();
