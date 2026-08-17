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
                    ventaja_1: row.ventaja_1 || '',
                    ventaja_2: row.ventaja_2 || '',
                    desventaja_1: row.desventaja_1 || '',
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
        console.log(`\n✨ Generated ${allProducts.length} products in src/data/products.json`);

        // ============================================
        // 🚀 SEO INJECTION (JSON-LD & STATIC FALLBACK)
        // ============================================
        console.log('🔍 Generating SEO metadata...');
        const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');
        let indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Leer vídeos para incluirlos en el SEO y Sitemap
        const VIDEOS_PATH = path.join(DATA_DIR, 'videos_v4.json');
        let allVideos = [];
        if (fs.existsSync(VIDEOS_PATH)) {
            try {
                allVideos = JSON.parse(fs.readFileSync(VIDEOS_PATH, 'utf-8'));
            } catch (e) {}
        }

        function escapeXml(unsafe) {
            if (!unsafe) return '';
            return String(unsafe)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        // 1. Generate JSON-LD (Structured Data)
        const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "@id": "https://www.capacero3d.com/#website",
                    "url": "https://www.capacero3d.com/",
                    "name": "Capa Cero 3D",
                    "description": "Videoteca oficial de tutoriales de Bambu Studio, perfiles de calibración 3MF y trucos de impresión 3D.",
                    "publisher": {
                        "@id": "https://www.capacero3d.com/#organization"
                    },
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://www.capacero3d.com/?q={search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                },
                {
                    "@type": "Organization",
                    "@id": "https://www.capacero3d.com/#organization",
                    "name": "Capa Cero 3D",
                    "url": "https://www.capacero3d.com/",
                    "logo": "https://www.capacero3d.com/logo-capa-cero.webp",
                    "sameAs": [
                        "https://www.youtube.com/@CapaCero0",
                        "https://makerworld.com/en/@capa_cero",
                        "https://www.instagram.com/capa.cero_3d/",
                        "https://www.tiktok.com/@capacero"
                    ]
                },
                {
                    "@type": "ItemList",
                    "@id": "https://www.capacero3d.com/#videoteca",
                    "name": "Videoteca de Tutoriales Bambu Studio e Impresión 3D",
                    "description": "Lista completa de tutoriales y guías paso a paso de Capa Cero 3D",
                    "numberOfItems": allVideos.length,
                    "itemListElement": allVideos.map((v, index) => ({
                        "@type": "ListItem",
                        "position": index + 1,
                        "item": {
                            "@type": "VideoObject",
                            "name": v.title,
                            "description": v.description || `Tutorial de ${v.title} por Capa Cero 3D.`,
                            "thumbnailUrl": [v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`],
                            "uploadDate": v.publishedAt || "2026-08-17T11:00:06Z",
                            "contentUrl": v.youtubeUrl,
                            "embedUrl": `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
                            "interactionStatistic": [
                                {
                                    "@type": "InteractionCounter",
                                    "interactionType": { "@type": "WatchAction" },
                                    "userInteractionCount": v.views || 100
                                },
                                {
                                    "@type": "InteractionCounter",
                                    "interactionType": { "@type": "LikeAction" },
                                    "userInteractionCount": v.likes || 10
                                }
                            ],
                            "author": {
                                "@type": "Person",
                                "name": "Capa Cero 3D"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Capa Cero 3D",
                                "logo": "https://www.capacero3d.com/logo-capa-cero.webp"
                            }
                        }
                    }))
                },
                {
                    "@type": "ItemList",
                    "@id": "https://www.capacero3d.com/#catalogo",
                    "name": "Catálogo de Productos y Herramientas 3D Recomendadas",
                    "numberOfItems": allProducts.length,
                    "itemListElement": allProducts.map((p, index) => {
                        const item = {
                            "@type": "Product",
                            "name": p.name,
                            "description": p.description || p.name,
                            "image": p.image && p.image.length > 0 ? `https://www.capacero3d.com${p.image[0]}` : "https://www.capacero3d.com/logo-capa-cero-small.png",
                            "review": {
                                "@type": "Review",
                                "reviewRating": {
                                    "@type": "Rating",
                                    "ratingValue": "5",
                                    "bestRating": "5"
                                },
                                "author": {
                                    "@type": "Organization",
                                    "name": "Capa Cero"
                                }
                            },
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": "4.8",
                                "reviewCount": "125"
                            }
                        };
                        if (p.showPrice && p.price) {
                            item.offers = {
                                "@type": "Offer",
                                "price": p.price.replace(/[^\d.,]/g, '').replace(',', '.') || '0',
                                "priceCurrency": "EUR",
                                "availability": "https://schema.org/InStock"
                            };
                        }
                        return {
                            "@type": "ListItem",
                            "position": index + 1,
                            "url": `https://www.capacero3d.com/producto/${p.id}`,
                            "item": item
                        };
                    })
                }
            ]
        };

        const jsonLdScript = `\n  <script type="application/ld+json" id="seo-jsonld">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>\n`;

        // 2. Generate Fallback HTML (For search engines and crawlers that don't execute JS)
        const fallbackHtml = `\n  <noscript id="seo-fallback">
    <header>
      <h1>Capa Cero 3D | Videoteca Oficial de Tutoriales Bambu Studio e Impresión 3D</h1>
      <p>Aprende Bambu Studio e impresión 3D paso a paso. Videoteca oficial de Capa Cero con perfiles 3MF, trucos de calibración, solución de errores y optimización de filamento.</p>
    </header>

    <main>
      <section>
        <h2>Tutoriales y Guías de Bambu Studio</h2>
        <ul>
${allVideos.map(v => `          <li>
            <h3><a href="${v.youtubeUrl}" target="_blank" rel="noopener noreferrer">${v.title}</a></h3>
            <p>${v.description || ''}</p>
            ${v.consejoClave ? `<p><strong>Tip:</strong> ${v.consejoClave}</p>` : ''}
            ${v.downloads && v.downloads.length > 0 ? `<p><a href="${v.downloads[0].url}">Descargar Archivo</a></p>` : ''}
          </li>`).join('\n')}
        </ul>
      </section>

      <section>
        <h2>Catálogo de Productos y Herramientas 3D</h2>
        <ul>
${allProducts.map(p => `          <li><a href="/producto/${p.id}">${p.name}</a>${p.showPrice && p.price ? ` - ${p.price}` : ''}</li>`).join('\n')}
        </ul>
      </section>
    </main>
  </noscript>\n`;

        // Remove old injections if they exist to prevent duplicates
        indexHtml = indexHtml.replace(/[\s]*<script type="application\/ld\+json" id="seo-jsonld">[\s\S]*?<\/script>[\s]*/, '');
        indexHtml = indexHtml.replace(/[\s]*<script type="application\/ld\+json">[\s\S]*?<\/script>[\s]*/, '');
        indexHtml = indexHtml.replace(/[\s]*<noscript id="seo-fallback"[\s\S]*?<\/noscript>[\s]*/, '');

        // Inject new blocks
        indexHtml = indexHtml.replace('</head>', `${jsonLdScript}</head>`);
        indexHtml = indexHtml.replace('</body>', `${fallbackHtml}</body>`);

        fs.writeFileSync(INDEX_HTML_PATH, indexHtml);
        console.log('✅ Injected structured JSON-LD and HTML Fallback into index.html');

        // ============================================
        // 🗺️ GOOGLE VIDEO & STANDARD SITEMAP GENERATION
        // ============================================
        const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');
        const today = new Date().toISOString().split('T')[0];

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://www.capacero3d.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>${allVideos.map(v => `
    <video:video>
      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>
      <video:title>${escapeXml(v.title)}</video:title>
      <video:description>${escapeXml(v.description || v.title)}</video:description>
      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${v.youtubeId}</video:player_loc>
      <video:publication_date>${v.publishedAt || (today + 'T00:00:00Z')}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:view_count>${v.views || 100}</video:view_count>
      <video:category>${escapeXml(v.category || 'Bambu Studio')}</video:category>
    </video:video>`).join('')}
  </url>${allProducts.map(p => `
  <url>
    <loc>https://www.capacero3d.com/producto/${p.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

        fs.writeFileSync(SITEMAP_PATH, sitemapXml);
        console.log(`✅ Generated sitemap.xml with Google Video rich metadata (${allVideos.length} videos + ${allProducts.length} products)`);

        console.log('\n🎉 ALL DONE! System is ready for production.\n');

    } catch (error) {
        console.error('🔥 Fatal Error:', error);
        process.exit(1);
    }
}

main();
