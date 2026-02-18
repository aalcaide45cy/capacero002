import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.resolve(__dirname, '../public/logo-capa-cero.png');
const OUTPUT_PATH_WEBP = path.resolve(__dirname, '../public/logo-capa-cero.webp');
const OUTPUT_PATH_PNG = path.resolve(__dirname, '../public/logo-capa-cero-small.png');

async function optimizeLogo() {
    try {
        console.log('🖼️ Optimizing Logo...');

        // 1. WebP Version (for website header)
        await sharp(INPUT_PATH)
            .resize(400, null, { withoutEnlargement: true })
            .webp({ quality: 90 })
            .toFile(OUTPUT_PATH_WEBP);
        console.log('✅ Generated WebP: logo-capa-cero.webp');

        // 2. Small PNG Version (for Favicon/SEO/OG Tags - max compatibility)
        await sharp(INPUT_PATH)
            .resize(500, null, { withoutEnlargement: true })
            .png({ quality: 80, compressionLevel: 8 })
            .toFile(OUTPUT_PATH_PNG);
        console.log('✅ Generated Small PNG: logo-capa-cero-small.png');

    } catch (error) {
        console.error('❌ Error optimizing logo:', error);
    }
}

optimizeLogo();
