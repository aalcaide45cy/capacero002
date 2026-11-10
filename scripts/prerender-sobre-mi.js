import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SITE, ABOUT_URL, PERSON_ID, PERSON_NAME, PERSON_DESCRIPTION, PROFILES, personNode, organizationNode,
} from './lib/seo-entity.js';

// Genera dist/sobre-mi/index.html: página estática (HTML real, sin depender de JavaScript)
// con la identidad de Alfonso Alcaide Cornejo, sus perfiles y JSON-LD ProfilePage.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '..', 'dist', 'sobre-mi');

const TITLE = 'Alfonso Alcaide Cornejo | Impresión 3D y creador de CapaCero3D';
const DESCRIPTION =
  'Alfonso Alcaide Cornejo, creador de CapaCero3D: tutoriales en español de impresión 3D, Bambu Studio y Fusion 360, cursos en Udemy y comunidad en YouTube, TikTok e Instagram.';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${ABOUT_URL}#profilepage`,
      url: ABOUT_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: 'es',
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': PERSON_ID },
      mainEntity: { '@id': PERSON_ID },
    },
    personNode,
    organizationNode,
  ],
};

const SOCIAL_KEYS = ['youtube', 'instagram', 'tiktok'];
const links = PROFILES.filter((p) => SOCIAL_KEYS.includes(p.key)).map(
  (p) => `        <li><a href="${p.url}" rel="me noopener" target="_blank">${p.label}</a> — ${p.handle}</li>`,
).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${TITLE}</title>
  <meta name="description" content="${DESCRIPTION}" />
  <link rel="canonical" href="${ABOUT_URL}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="${PERSON_NAME}" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <meta property="og:type" content="profile" />
  <meta property="profile:first_name" content="Alfonso" />
  <meta property="profile:last_name" content="Alcaide Cornejo" />
  <meta property="og:site_name" content="Capa Cero 3D" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="${TITLE}" />
  <meta property="og:description" content="${DESCRIPTION}" />
  <meta property="og:url" content="${ABOUT_URL}" />
  <meta property="og:image" content="${SITE}/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
  <style>
    body{margin:0;background:#09090b;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;line-height:1.65}
    header{padding:1rem 1.5rem;border-bottom:1px solid #27272a}
    header a{color:#fff;font-weight:700;text-decoration:none}
    main{max-width:760px;margin:0 auto;padding:2rem 1.5rem 4rem}
    h1{font-size:2rem;color:#fff;line-height:1.2;margin:0 0 .5rem}
    h2{font-size:1.25rem;color:#fff;margin-top:2rem}
    a{color:#38bdf8}
    li{margin:.35rem 0}
  </style>
</head>
<body>
  <header><a href="/">← Capa Cero 3D</a></header>
  <main>
    <article>
      <h1>${PERSON_NAME}</h1>
      <p><strong>Creador de contenido sobre impresión 3D</strong> · fundador de CapaCero3D</p>
      <p>${PERSON_DESCRIPTION}</p>

      <h2>¿Qué hago?</h2>
      <p>Hago <strong>impresión 3D</strong> y la explico en español: cómo configurar Bambu Studio, calibrar una impresora FDM, diseñar piezas en Fusion 360, solucionar fallos de impresión y sacar partido a la fabricación digital y al grabado láser. Mi objetivo es que entiendas qué ajuste usar, por qué funciona y cómo evitar errores en el taller.</p>
      <p>Mi trabajo gira en torno a la impresión 3D y a la comunidad maker, y todo el contenido está en la <a href="/">videoteca de CapaCero3D</a>.</p>

      <h2>Dónde encontrarme</h2>
      <ul>
${links}
        <li><a href="${SITE}/" rel="me">capacero3d.com</a> — web oficial y videoteca</li>
      </ul>

      <h2>Cursos</h2>
      <p>Tengo cursos publicados de diseño 3D y desarrollo de videojuegos en <a href="${PROFILES.find((p) => p.key === 'udemy').url}" rel="me noopener" target="_blank">mi perfil de Udemy</a>. Mi foco actual es la impresión 3D, que es lo que explico en CapaCero3D.</p>

      <h2>Sobre CapaCero3D</h2>
      <p>CapaCero3D es mi marca de creación de contenido sobre impresión 3D. El nombre alude a la primera capa de una impresión, el punto de partida sobre el que se construye todo lo demás.</p>
      <p>Colaboraciones con marcas del sector 3D: escríbeme desde la sección de colaboraciones de la <a href="/">web</a>.</p>
    </article>
  </main>
</body>
</html>
`;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html, 'utf-8');
console.log('✅ Generado dist/sobre-mi/index.html');
