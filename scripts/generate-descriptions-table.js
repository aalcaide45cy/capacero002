import fs from 'fs';
import path from 'path';

const videos = JSON.parse(fs.readFileSync('src/data/videos_v4.json', 'utf8'));
const slugs = JSON.parse(fs.readFileSync('src/data/slugs.json', 'utf8'));

console.log('Total videos in videos_v4.json:', videos.length);
console.log('Total slugs in slugs.json:', Object.keys(slugs).length);

let errors = 0;
const rows = [];
const verifiedBackup = [];

videos.forEach((v, index) => {
  const yId = v.youtubeId;
  const slug = slugs[yId];
  if (!yId) {
    console.error('Error: video without youtubeId at index', index);
    errors++;
  }
  if (!slug) {
    console.error('Error: no slug found in slugs.json for youtubeId', yId);
    errors++;
  }
  const cleanTitle = (v.title || '').replace(/\|/g, '-').trim();
  const appendText = `📖 Guía escrita, capítulos y descargas: https://www.capacero3d.com/video/${slug}`;
  const tableLine = `| \`${yId}\` | ${cleanTitle} | \`${appendText}\` |`;
  rows.push(tableLine);
  verifiedBackup.push({
    id: v.id,
    youtubeId: yId,
    title: v.title,
    slug: slug,
    targetUrl: `https://www.capacero3d.com/video/${slug}`,
    description: v.description || '',
    appendLine: appendText
  });
});

if (errors > 0) {
  console.error(`Validation failed with ${errors} errors!`);
  process.exit(1);
}

const tableContent = [
  '| ID Vídeo | Título | Línea a pegar al final de la descripción de YouTube |',
  '| :--- | :--- | :--- |',
  ...rows
].join('\n');

fs.writeFileSync('docs/backups/descripciones-2026-10-08.json', JSON.stringify(verifiedBackup, null, 2), 'utf8');
fs.writeFileSync('docs/backups/youtube_descriptions_table.md', tableContent, 'utf8');

console.log('✅ Verificación completada con éxito.');
console.log(`✅ ${rows.length} filas generadas a partir de datos reales.`);
console.log('✅ Actualizado docs/backups/descripciones-2026-10-08.json.');
