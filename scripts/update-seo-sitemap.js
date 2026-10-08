import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const VIDEOS_FILE = path.join(ROOT_DIR, 'src/data/videos_v4.json');
const SLUGS_FILE = path.join(ROOT_DIR, 'src/data/slugs.json');
const INDEX_HTML_FILE = path.join(ROOT_DIR, 'index.html');
const SITEMAP_FILE = path.join(ROOT_DIR, 'public/sitemap.xml');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function getLatestDate(videoList) {
  let latest = '2026-10-06';
  for (const v of videoList) {
    if (v.publishedAt) {
      const d = v.publishedAt.split('T')[0];
      if (d > latest) latest = d;
    }
  }
  return latest;
}

export function updateSeoSitemap() {
  if (!fs.existsSync(VIDEOS_FILE)) {
    console.warn('⚠️ No se encontró videos_v4.json. Saltando generación de sitemap.');
    return;
  }

  const allVideos = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf8'));
  // Filtrar solo vídeos publicados (sin estrenos programados pendientes)
  const publishedVideos = allVideos.filter(v => !v.isScheduled && v.youtubeId);

  // Leer mapa de slugs si ya existe (Fase 04 en adelante)
  let slugsMap = {};
  if (fs.existsSync(SLUGS_FILE)) {
    try {
      slugsMap = JSON.parse(fs.readFileSync(SLUGS_FILE, 'utf8'));
    } catch {
      slugsMap = {};
    }
  }

  const rootLastMod = getLatestDate(publishedVideos);

  // 1. GENERAR SITEMAP.XML
  const xmlVideos = publishedVideos.map(v => `    <video:video>
      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>
      <video:title>${escapeXml(v.title)}</video:title>
      <video:description>${escapeXml((v.description || v.title).slice(0, 200))}</video:description>
      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${v.youtubeId}</video:player_loc>
      <video:publication_date>${v.publishedAt}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:view_count>${v.views || 100}</video:view_count>
      <video:category>${escapeXml(v.category || 'Bambu Studio')}</video:category>
    </video:video>`).join('\n');

  // Si existen páginas individuales /video/<slug> (Fase 04), añadirlas al sitemap
  const videoUrlsXml = publishedVideos
    .filter(v => slugsMap[v.youtubeId])
    .map(v => {
      const slug = slugsMap[v.youtubeId];
      const videoDate = (v.publishedAt || rootLastMod).split('T')[0];
      return `  <url>
    <loc>https://www.capacero3d.com/video/${slug}</loc>
    <lastmod>${videoDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <video:video>
      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>
      <video:title>${escapeXml(v.title)}</video:title>
      <video:description>${escapeXml((v.description || v.title).slice(0, 200))}</video:description>
      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${v.youtubeId}</video:player_loc>
      <video:publication_date>${v.publishedAt}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:view_count>${v.views || 100}</video:view_count>
      <video:category>${escapeXml(v.category || 'Bambu Studio')}</video:category>
    </video:video>
  </url>`;
    }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://www.capacero3d.com/</loc>
    <lastmod>${rootLastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
${xmlVideos}
  </url>
${videoUrlsXml ? videoUrlsXml + '\n' : ''}  <url>
    <loc>https://www.capacero3d.com/politica-privacidad</loc>
    <lastmod>2026-03-01</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`;

  // Idempotencia: solo escribir si el contenido ha cambiado
  if (fs.existsSync(SITEMAP_FILE)) {
    const currentSitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');
    if (currentSitemap !== sitemapXml) {
      fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf8');
      console.log(`✅ Actualizado public/sitemap.xml con ${publishedVideos.length} vídeos (lastmod: ${rootLastMod})`);
    } else {
      console.log(`ℹ️ public/sitemap.xml sin cambios (${publishedVideos.length} vídeos)`);
    }
  } else {
    fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf8');
    console.log(`✅ Generado public/sitemap.xml con ${publishedVideos.length} vídeos`);
  }

  // 2. GENERAR INDEX.HTML CON SCHEMA JSON-LD COMPLETO Y LISTA SEMÁNTICA DE VÍDEOS
  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.capacero3d.com/#website",
        "url": "https://www.capacero3d.com/",
        "name": "Capa Cero 3D",
        "description": "Videoteca oficial de tutoriales de Bambu Studio, cursos estructurados y modelos 3D listos para imprimir.",
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
        "description": "Lista completa de tutoriales, cursos y guías paso a paso de Capa Cero 3D",
        "numberOfItems": publishedVideos.length,
        "itemListElement": publishedVideos.map((v, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "item": {
            "@type": "VideoObject",
            "name": v.title,
            "description": (v.description || v.title).slice(0, 200),
            "thumbnailUrl": [v.thumbnail],
            "uploadDate": v.publishedAt,
            "contentUrl": v.youtubeUrl || `https://www.youtube.com/watch?v=${v.youtubeId}`,
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
      }
    ]
  };

  const noscriptList = publishedVideos.map(v => {
    const slug = slugsMap[v.youtubeId];
    const linkHref = slug ? `/video/${slug}` : (v.youtubeUrl || `https://www.youtube.com/watch?v=${v.youtubeId}`);
    return `        <li><a href="${linkHref}">${escapeXml(v.title)}</a> — ${escapeXml(v.category || 'Tutorial')}</li>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="es">

<head>
  <meta charset="UTF-8" />

  <!-- Preconnect y DNS-Prefetch para recursos críticos -->
  <link rel="preconnect" href="https://img.youtube.com" crossorigin />
  <link rel="dns-prefetch" href="https://img.youtube.com" />

  <!-- Google Analytics (GA4) Diferido en Idle para First Contentful Paint ultrarrápido -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-Y8RT9QWCD9');

    function loadGA4() {
      if (window.__ga4_loaded) return;
      window.__ga4_loaded = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-Y8RT9QWCD9';
      document.head.appendChild(s);
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadGA4, { timeout: 2000 });
    } else {
      window.addEventListener('load', loadGA4, { once: true });
    }
  </script>

  <!-- Favicons optimizados para Google Search y dispositivos móviles -->
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
  <link rel="shortcut icon" href="/favicon-48x48.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="canonical" href="https://www.capacero3d.com/" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

  <!-- Social Media & SEO -->
  <meta name="description"
    content="Aprende Bambu Studio e impresión 3D paso a paso. Videoteca oficial de Capa Cero con cursos estructurados, trucos de calibración y modelos 3D descargables en MakerWorld." />
  <meta name="keywords"
    content="tutoriales bambu studio, bambu lab espanol, cursos bambu studio, modelos 3d makerworld, fusion 360 impresion 3d, costuras scarf bambu studio, multicolor sin ams, capa cero 3d" />
  <meta name="author" content="Capa Cero 3D" />
  
  <meta property="og:site_name" content="Capa Cero 3D" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Capa Cero 3D | Videos, Cursos y Modelos de Bambu Studio e Impresión 3D" />
  <meta property="og:description"
    content="Domina Bambu Studio, ahorra horas de impresión y elimina fallos. Videoteca oficial de Capa Cero con cursos completos y modelos para imprimir." />
  <meta property="og:image" content="https://www.capacero3d.com/og-image.jpg" />
  <meta property="og:image:secure_url" content="https://www.capacero3d.com/og-image.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Capa Cero 3D | Tutoriales Bambu Studio e Impresión 3D" />
  <meta property="og:url" content="https://www.capacero3d.com/" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@CapaCero0" />
  <meta name="twitter:title" content="Capa Cero 3D | Videos, Cursos y Modelos de Bambu Studio" />
  <meta name="twitter:description"
    content="Domina Bambu Studio, ahorra horas de impresión y elimina fallos. Videoteca oficial de Capa Cero 3D." />
  <meta name="twitter:image" content="https://www.capacero3d.com/og-image.jpg" />

  <!-- PWA & Mobile Web App Standalone -->
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Capa Cero 3D" />
  <meta name="application-name" content="Capa Cero 3D" />
  <meta name="theme-color" content="#000000" />

  <title>Capa Cero 3D | Videos, Cursos y Modelos de Bambu Studio e Impresión 3D</title>

  <!-- Schema.org JSON-LD for Google Sitelinks & Rich Results -->
  <script type="application/ld+json" id="seo-jsonld">
${JSON.stringify(jsonLdGraph, null, 2)}
  </script>
</head>

<body class="bg-black text-white antialiased selection:bg-cyan-500 selection:text-black">
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>

  <!-- Fallback semántico para rastreadores de Googlebot y accesibilidad -->
  <noscript>
    <main style="padding: 2rem; font-family: sans-serif; background-color: #09090b; color: #fff;">
      <h1>Capa Cero 3D — Videos, Cursos y Modelos de Impresión 3D</h1>
      <p>Aprende a dominar tu impresora 3D, configurar perfiles en Bambu Studio, cursos completos y modelos para imprimir en MakerWorld.</p>
      
      <h2>Tutoriales Oficiales en YouTube:</h2>
      <ul>
${noscriptList}
      </ul>
      <p>Canal Oficial de YouTube: <a href="https://www.youtube.com/@CapaCero0?sub_confirmation=1">Suscríbete a Capa Cero 3D</a></p>
      <p>Perfil Oficial de MakerWorld: <a href="https://makerworld.com/en/@capa_cero">Descargar Modelos 3D en MakerWorld</a></p>
      <p><a href="https://www.capacero3d.com/politica-privacidad">Política de Privacidad</a></p>
    </main>
  </noscript>
</body>

</html>
`;

  if (fs.existsSync(INDEX_HTML_FILE)) {
    const currentIndexHtml = fs.readFileSync(INDEX_HTML_FILE, 'utf8');
    if (currentIndexHtml !== html) {
      fs.writeFileSync(INDEX_HTML_FILE, html, 'utf8');
      console.log(`✅ Actualizado index.html con ${publishedVideos.length} vídeos en noscript y JSON-LD`);
    } else {
      console.log(`ℹ️ index.html sin cambios (${publishedVideos.length} vídeos)`);
    }
  } else {
    fs.writeFileSync(INDEX_HTML_FILE, html, 'utf8');
    console.log(`✅ Generado index.html con ${publishedVideos.length} vídeos`);
  }
}

// Ejecutar si se invoca directamente desde CLI
if (process.argv[1] && process.argv[1].endsWith('update-seo-sitemap.js')) {
  updateSeoSitemap();
}
