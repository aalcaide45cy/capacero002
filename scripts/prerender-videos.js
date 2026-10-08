import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const TEMPLATE_FILE = path.resolve(DIST_DIR, 'index.html');
const VIDEOS_FILE = path.resolve(ROOT_DIR, 'src', 'data', 'videos_v4.json');
const SLUGS_FILE = path.resolve(ROOT_DIR, 'src', 'data', 'slugs.json');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanDescriptionForMeta(desc) {
  if (!desc) return 'Tutorial oficial de Capa Cero 3D sobre Bambu Studio e impresión 3D.';
  const oneLine = desc.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 155) return oneLine;
  return oneLine.substring(0, 152) + '...';
}

function parseChapters(description) {
  if (!description) return [];
  const lines = description.split('\n');
  const chapters = [];
  const regex = /^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:]?\s*(.+)$/;

  for (const line of lines) {
    const match = line.trim().match(regex);
    if (match) {
      const timeStr = match[1];
      const title = match[2].trim();
      const parts = timeStr.split(':').map(Number);
      let seconds = 0;
      if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      chapters.push({ timeStr, seconds, title });
    }
  }
  return chapters;
}

function prerender() {
  console.log('⚡ Iniciando prerenderizado estático de vídeos...');

  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error(`❌ No se encontró ${TEMPLATE_FILE}. Debes compilar con Vite antes de prerenderizar.`);
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
  const videos = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf-8'));
  const slugs = fs.existsSync(SLUGS_FILE) ? JSON.parse(fs.readFileSync(SLUGS_FILE, 'utf-8')) : {};

  const publishedVideos = videos.filter(v => v.published !== false && v.isPublished !== false);
  console.log(`📹 Encontrados ${publishedVideos.length} vídeos publicados para prerenderizar.`);

  let createdCount = 0;

  publishedVideos.forEach((video, index) => {
    const slug = slugs[video.youtubeId] || video.slug;
    if (!slug) {
      console.warn(`⚠️ Sin slug para vídeo ${video.youtubeId} (${video.title})`);
      return;
    }

    const videoUrl = `https://www.capacero3d.com/video/${slug}`;
    const pageTitle = `${video.title} | Capa Cero 3D`;
    const metaDesc = cleanDescriptionForMeta(video.description);
    const chapters = parseChapters(video.description || '');

    // Generar Clips para Schema.org si hay capítulos
    const clips = chapters.map((ch, idx) => {
      const nextCh = chapters[idx + 1];
      const clip = {
        "@type": "Clip",
        "name": ch.title,
        "startOffset": ch.seconds,
        "url": `${videoUrl}#t=${ch.seconds}`
      };
      if (nextCh) {
        clip.endOffset = nextCh.seconds;
      }
      return clip;
    });

    // Schema.org VideoObject + BreadcrumbList
    const videoLdJson = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Inicio",
              "item": "https://www.capacero3d.com/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": video.category || "Videoteca",
              "item": `https://www.capacero3d.com/#${encodeURIComponent(video.category || "")}`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": video.title,
              "item": videoUrl
            }
          ]
        },
        {
          "@type": "VideoObject",
          "name": video.title,
          "description": video.description ? video.description.slice(0, 500) : video.title,
          "thumbnailUrl": [video.thumbnail],
          "uploadDate": video.publishedAt || "2024-01-01T00:00:00Z",
          ...(video.duration ? { "duration": video.duration } : {}),
          "embedUrl": `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": { "@type": "WatchAction" },
            "userInteractionCount": Number(video.views) || 0
          },
          ...(clips.length > 0 ? { "hasPart": clips } : {})
        }
      ]
    };

    // Navegación anterior / siguiente
    const prevVideo = index > 0 ? publishedVideos[index - 1] : null;
    const nextVideo = index < publishedVideos.length - 1 ? publishedVideos[index + 1] : null;

    // Relacionados de la misma categoría
    const relatedVideos = publishedVideos
      .filter(v => v.youtubeId !== video.youtubeId && v.category === video.category)
      .slice(0, 3);

    // Contenido visible HTML estático semántico
    const chaptersHtml = chapters.length > 0 ? `
      <section style="margin: 2rem 0; padding: 1.25rem; background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem;">
        <h3 style="font-size: 1.125rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">📑 Capítulos del Vídeo</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem;">
          ${chapters.map(ch => `
            <li>
              <a href="https://www.youtube.com/watch?v=${video.youtubeId}&t=${ch.seconds}s" target="_blank" rel="noopener noreferrer" style="color: #22d3ee; text-decoration: none; font-size: 0.95rem; display: flex; gap: 0.75rem;">
                <span style="font-family: monospace; color: #38bdf8; font-weight: 600;">${ch.timeStr}</span>
                <span>${escapeHtml(ch.title)}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : '';

    const keyAdviceHtml = video.keyAdvice ? `
      <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: rgba(8, 47, 73, 0.4); border-left: 4px solid #38bdf8; border-radius: 0.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #7dd3fc; margin: 0 0 0.5rem 0;">💡 Consejo Clave</h4>
        <p style="margin: 0; color: #e0f2fe; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(video.keyAdvice)}</p>
      </div>
    ` : '';

    const downloadsHtml = (video.downloads && video.downloads.length > 0) ? `
      <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #18181b; border: 1px solid #27272a; border-radius: 0.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0 0 0.5rem 0;">📥 Descargas y Archivos 3D</h4>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem;">
          ${video.downloads.map(dl => `
            <li>
              <a href="${escapeHtml(dl.url)}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-size: 0.9rem;">
                ${escapeHtml(dl.title || 'Descargar archivo')}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const prevNextHtml = `
      <nav style="display: flex; justify-content: space-between; gap: 1rem; margin: 2rem 0; padding-top: 1.5rem; border-top: 1px solid #27272a;">
        ${prevVideo ? `
          <a href="/video/${slugs[prevVideo.youtubeId] || prevVideo.slug}" style="color: #a1a1aa; text-decoration: none; font-size: 0.9rem; max-width: 48%;">
            <span style="font-size: 0.75rem; text-transform: uppercase; color: #71717a; display: block;">← Vídeo anterior</span>
            <span style="color: #fff; font-weight: 600;">${escapeHtml(prevVideo.title)}</span>
          </a>
        ` : '<div></div>'}
        ${nextVideo ? `
          <a href="/video/${slugs[nextVideo.youtubeId] || nextVideo.slug}" style="color: #a1a1aa; text-decoration: none; font-size: 0.9rem; text-align: right; max-width: 48%;">
            <span style="font-size: 0.75rem; text-transform: uppercase; color: #71717a; display: block;">Siguiente vídeo →</span>
            <span style="color: #fff; font-weight: 600;">${escapeHtml(nextVideo.title)}</span>
          </a>
        ` : '<div></div>'}
      </nav>
    `;

    const relatedHtml = relatedVideos.length > 0 ? `
      <section style="margin: 2.5rem 0;">
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">Vídeos relacionados de ${escapeHtml(video.category || 'la misma categoría')}</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          ${relatedVideos.map(rel => `
            <a href="/video/${slugs[rel.youtubeId] || rel.slug}" style="display: block; background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; overflow: hidden; text-decoration: none; color: inherit;">
              <img src="${rel.thumbnail}" alt="${escapeHtml(rel.title)}" loading="lazy" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block;" />
              <div style="padding: 0.75rem;">
                <h4 style="font-size: 0.9rem; font-weight: 600; color: #fff; margin: 0; line-height: 1.4;">${escapeHtml(rel.title)}</h4>
              </div>
            </a>
          `).join('')}
        </div>
      </section>
    ` : '';

    const prerenderedBody = `
      <div id="root">
        <header style="padding: 1rem 1.5rem; border-bottom: 1px solid #27272a; background: #09090b;">
          <div style="max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
            <a href="/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: #fff; font-weight: 700;">
              <img src="/logo-capa-cero.webp" alt="Capa Cero 3D" style="height: 32px; width: auto;" />
              <span>Capa Cero 3D</span>
            </a>
            <a href="/" style="color: #38bdf8; text-decoration: none; font-size: 0.9rem; font-weight: 600;">← Volver a la videoteca</a>
          </div>
        </header>

        <main style="max-width: 1000px; margin: 0 auto; padding: 1.5rem; font-family: system-ui, -apple-system, sans-serif;">
          <article>
            <div style="margin-bottom: 1rem;">
              <span style="display: inline-block; padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #38bdf8; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 0.375rem;">
                ${escapeHtml(video.category || 'Tutorial')}
              </span>
            </div>

            <h1 style="font-size: 1.875rem; font-weight: 800; color: #fff; line-height: 1.25; margin: 0 0 0.75rem 0;">
              ${escapeHtml(video.title)}
            </h1>

            <div style="color: #a1a1aa; font-size: 0.875rem; margin-bottom: 1.5rem;">
              <span>${Number(video.views || 0).toLocaleString('es-ES')} visualizaciones</span>
              ${video.likes ? ` • <span>${Number(video.likes).toLocaleString('es-ES')} me gusta</span>` : ''}
            </div>

            <div style="position: relative; aspect-ratio: 16/9; width: 100%; background: #000; border-radius: 1rem; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
              <iframe
                src="https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&playsinline=1"
                title="${escapeHtml(video.title)}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>

            ${keyAdviceHtml}
            ${chaptersHtml}
            ${downloadsHtml}

            <div style="margin: 2rem 0; color: #d4d4d8; font-size: 1rem; line-height: 1.7; white-space: pre-line;">
              <h3 style="font-size: 1.125rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">Descripción del tutorial</h3>
              <p>${escapeHtml(video.description || '')}</p>
            </div>

            ${prevNextHtml}
            ${relatedHtml}
          </article>
        </main>
      </div>
    `;

    // Reemplazos en el HTML
    let outputHtml = templateHtml;

    // Title
    outputHtml = outputHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // Meta Description
    outputHtml = outputHtml.replace(
      /<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(metaDesc)}" />`
    );

    // Canonical
    outputHtml = outputHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i,
      `<link rel="canonical" href="${videoUrl}" />`
    );

    // Open Graph
    outputHtml = outputHtml.replace(
      /<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(metaDesc)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+property=["']og:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta property="og:image" content="${escapeHtml(video.thumbnail)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+property=["']og:image:secure_url["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta property="og:image:secure_url" content="${escapeHtml(video.thumbnail)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta property="og:url" content="${videoUrl}" />`
    );

    // Twitter
    outputHtml = outputHtml.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(metaDesc)}" />`
    );
    outputHtml = outputHtml.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtml(video.thumbnail)}" />`
    );

    // Reemplazar Schema.org JSON-LD
    const jsonLdTag = `<script type="application/ld+json" id="seo-jsonld">\n${JSON.stringify(videoLdJson, null, 2)}\n  </script>`;
    outputHtml = outputHtml.replace(
      /<script\s+type=["']application\/ld\+json["']\s+id=["']seo-jsonld["']>[\s\S]*?<\/script>/i,
      jsonLdTag
    );

    // Reemplazar el contenedor #root y noscript
    // Buscamos <div id="root"></div> y lo sustituimos por prerenderedBody
    outputHtml = outputHtml.replace(/<div\s+id=["']root["']>[\s\S]*?<\/div>/i, prerenderedBody);

    // Crear carpeta dist/video/<slug>
    const videoDistDir = path.resolve(DIST_DIR, 'video', slug);
    if (!fs.existsSync(videoDistDir)) {
      fs.mkdirSync(videoDistDir, { recursive: true });
    }

    const outputFile = path.resolve(videoDistDir, 'index.html');
    fs.writeFileSync(outputFile, outputHtml, 'utf-8');
    createdCount++;
  });

  console.log(`✅ Prerenderizados con éxito ${createdCount} vídeos en dist/video/<slug>/index.html`);
}

prerender();
