// Auditoría SEO del build (dist/): detecta lo que luego Search Console reportaría como error.
// No bloquea el despliegue (salida 0); los avisos quedan en el log de Vercel / GitHub.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASE = 'https://www.capacero3d.com';
const read = (p) => fs.readFileSync(p, 'utf-8');
const problems = [];
const warn = (m) => problems.push(m);

const fileFor = (pathname) => {
  const f = pathname === '/' ? 'index.html' : path.join(pathname, 'index.html');
  return path.join(DIST, f);
};

// 1. Sitemap: solo URLs con página real y canonical que coincide
const sitemap = read(path.join(ROOT, 'public/sitemap.xml'));
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of locs) {
  if (!u.startsWith(BASE)) { warn(`sitemap: URL fuera de ${BASE}: ${u}`); continue; }
  const f = fileFor(u.slice(BASE.length) || '/');
  if (!fs.existsSync(f)) { warn(`sitemap: ${u} no tiene página en dist (daría 404)`); continue; }
  const h = read(f);
  const c = h.match(/rel="canonical" href="([^"]+)"/);
  if (!c || c[1] !== u) warn(`canonical distinto de la URL: ${u} -> ${c && c[1]}`);
  if (/name="robots" content="[^"]*noindex/i.test(h)) warn(`sitemap: ${u} es noindex`);
}

// 2. Vídeos: datos estructurados completos y redirecciones por id
const videos = JSON.parse(read(path.join(ROOT, 'src/data/videos_v4.json')));
const slugs = JSON.parse(read(path.join(ROOT, 'src/data/slugs.json')));
const vercel = JSON.parse(read(path.join(ROOT, 'vercel.json')));
const redirects = new Map(vercel.redirects.map((r) => [r.source, r.destination]));
for (const v of videos) {
  if (v.published === false || v.isPublished === false) continue;
  const slug = v.slug || slugs[v.youtubeId];
  if (!slug) { warn(`vídeo sin slug: ${v.youtubeId}`); continue; }
  if (!locs.includes(`${BASE}/video/${slug}`)) warn(`vídeo fuera del sitemap: ${slug}`);
  for (const alias of [v.id, v.youtubeId]) {
    if (alias && alias !== slug && redirects.get(`/video/${alias}`) !== `/video/${slug}`) {
      warn(`falta 301 /video/${alias} -> /video/${slug} (lo crea update-redirects.js en el próximo auto-sync)`);
    }
  }
  const f = fileFor(`/video/${slug}`);
  if (!fs.existsSync(f)) { warn(`sin página prerenderizada: ${slug}`); continue; }
  const m = read(f).match(/id="seo-jsonld">([\s\S]*?)<\/script>/);
  let vo;
  try { vo = JSON.parse(m[1])['@graph'].find((x) => x['@type'] === 'VideoObject'); } catch { vo = null; }
  if (!vo) { warn(`JSON-LD inválido: ${slug}`); continue; }
  for (const k of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'embedUrl', 'duration']) {
    if (!vo[k] || (Array.isArray(vo[k]) && !vo[k][0])) warn(`VideoObject sin ${k}: ${slug}`);
  }
  if (vo.uploadDate && !/^\d{4}-\d\d-\d\dT/.test(vo.uploadDate)) warn(`uploadDate sin formato ISO: ${slug}`);
  for (const c of vo.hasPart || []) if (!(c.endOffset > c.startOffset)) warn(`Clip con offsets inválidos: ${slug}`);
}

// 3. Enlaces internos de las páginas estáticas: todos deben existir
const pages = [path.join(DIST, 'index.html')];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory() && e.name !== 'assets') walk(p);
  else if (e.name === 'index.html' && p !== pages[0]) pages.push(p);
});
walk(DIST);
const redirected = (p) => vercel.redirects.some((r) => r.source === p);
const seen = new Set();
for (const f of pages) {
  for (const m of read(f).matchAll(/href="(\/[^"#?]*)/g)) {
    const l = m[1];
    if (seen.has(l) || /\.(png|webp|ico|jpg|webmanifest|txt|xml)$/.test(l)) continue;
    seen.add(l);
    if (redirected(l)) warn(`enlace interno a URL que redirige: ${l}`);
    else if (l !== '/' && !fs.existsSync(path.join(DIST, l, 'index.html')) && !fs.existsSync(path.join(DIST, l))) warn(`enlace interno roto: ${l}`);
  }
}

if (problems.length) {
  console.warn(`⚠️ Auditoría SEO: ${problems.length} aviso(s)`);
  problems.forEach((p) => console.warn('  - ' + p));
} else {
  console.log(`✅ Auditoría SEO sin avisos (${locs.length} URLs del sitemap, ${pages.length} páginas revisadas).`);
}
