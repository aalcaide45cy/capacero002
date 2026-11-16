// Genera en vercel.json redirecciones 301 /video/<id interno | id de YouTube> -> /video/<slug>.
// Evita soft 404: antes esas URLs servían la SPA y redirigían solo en el navegador.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERCEL = path.join(ROOT, 'vercel.json');
const videos = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/videos_v4.json'), 'utf-8'));
const slugs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/slugs.json'), 'utf-8'));

const cfg = JSON.parse(fs.readFileSync(VERCEL, 'utf-8'));
const isAuto = (r) => /^\/video\/[^/:()*]+$/.test(r.source);
const fixed = cfg.redirects.filter((r) => !isAuto(r));

const auto = [];
for (const v of videos) {
  if (v.published === false || v.isPublished === false) continue;
  const slug = v.slug || slugs[v.youtubeId];
  if (!slug) continue;
  for (const key of [v.id, v.youtubeId]) {
    if (key && key !== slug) auto.push({ source: `/video/${key}`, destination: `/video/${slug}`, permanent: true });
  }
}

const next = JSON.stringify({ ...cfg, redirects: [...fixed, ...auto] }, null, 4) + '\n';
if (next !== fs.readFileSync(VERCEL, 'utf-8')) {
  fs.writeFileSync(VERCEL, next);
  console.log(`🔀 vercel.json: ${auto.length} redirecciones /video/<id> -> slug`);
} else {
  console.log('🔀 Redirecciones de vídeo sin cambios.');
}
