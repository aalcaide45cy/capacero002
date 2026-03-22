import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    try {
        // En Vercel, el ID vendrá en req.query.id gracias al rewrite de vercel.json
        const productId = req.query.id || req.url.split('/').pop().split('?')[0];
        
        // Cargar productos en local. Vercel rastrea fs.readFileSync para empaquetar el archivo.
        const productsRaw = fs.readFileSync(
            path.join(process.cwd(), 'src', 'data', 'products.json'), 
            'utf8'
        );
        const products = JSON.parse(productsRaw);
        const product = products.find(p => p.id === productId);

        if (!product) {
            // Producto no encontrado, devolvemos un redirect al inicio
            return res.redirect(302, '/');
        }

        // Fetch the baseline HTML from ourselves
        // Using X-Forwarded-Host handles both localhost and production correctly
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const htmlResponse = await fetch(`${protocol}://${host}/`);
        
        if (!htmlResponse.ok) {
            throw new Error(`Failed to fetch HTML: ${htmlResponse.statusText}`);
        }
        
        let html = await htmlResponse.text();

        // ==========================================
        // 🎯 SEO INJECTION: Modify HTML String
        // ==========================================
        
        const cleanUrl = `https://capacero.vercel.app/producto/${productId}`;

        // 1. Matar la etiqueta canonical genérica suicida y poner la correcta
        html = html.replace(/<link rel="canonical" href="[^"]+"\s*\/>/gi, '');
        html = html.replace('</head>', `  <link rel="canonical" href="${cleanUrl}" />\n</head>`);

        // 2. Insertar Título del Producto (Esto es lo que Google mostrará en azul gigante)
        html = html.replace(/<title>.*?<\/title>/gi, `<title>${product.name} | Capa Cero</title>`);
        
        // 3. Insertar Meta Descripción limpia
        const desc = product.description ? product.description.substring(0, 155).replace(/"/g, '&quot;') : product.name;
        html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/gi, `<meta name="description" content="${desc}" />`);
        html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/gi, `<meta property="og:description" content="${desc}" />`);
        html = html.replace(/<meta property="twitter:description" content="[^"]*"\s*\/>/gi, `<meta property="twitter:description" content="${desc}" />`);

        // 4. Setear Títulos OG para Redes Sociales/Discord/WhatsApp
        html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/gi, `<meta property="og:title" content="${product.name}" />`);
        html = html.replace(/<meta property="twitter:title" content="[^"]*"\s*\/>/gi, `<meta property="twitter:title" content="${product.name}" />`);

        // 5. Intercambiar la URL compartida
        html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/gi, `<meta property="og:url" content="${cleanUrl}" />`);

        // 6. Cambiar la Imagen de Previsualización (Thumbnail)
        if (product.image && product.image.length > 0) {
            const imgUrl = product.image[0].startsWith('http') ? product.image[0] : `https://capacero.vercel.app${product.image[0]}`;
            html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/gi, `<meta property="og:image" content="${imgUrl}" />`);
            html = html.replace(/<meta property="twitter:image" content="[^"]*"\s*\/>/gi, `<meta property="twitter:image" content="${imgUrl}" />`);
        }

        // Devolvemos el HTML adulterado súper rápido
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Cache Edge: Vercel guardará este renderizado 24h para escupirlo al instante al próximo bot
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200'); 
        return res.status(200).send(html);

    } catch (error) {
        console.error("SSR Rendering Error:", error);
        return res.redirect(302, '/');
    }
}
