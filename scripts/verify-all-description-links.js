import fs from 'fs';
import path from 'path';

const videos = JSON.parse(fs.readFileSync('src/data/videos_v4.json', 'utf8'));
const slugs = JSON.parse(fs.readFileSync('src/data/slugs.json', 'utf8'));
let informe = fs.readFileSync('INFORME_FINAL.md', 'utf8');

console.log('=== VERIFICANDO TODAS LAS FILAS DE LA TABLA CONTRA SLUGS.JSON Y VIDEOS_V4.JSON ===\n');

// 1. Validar que cada video de videos_v4.json tiene un slug exacto
const videoMap = new Map();
videos.forEach(v => videoMap.set(v.youtubeId, v));

let allCorrect = true;
const verifiedRows = [];
const verifiedBackup = [];

videos.forEach((v, idx) => {
  const yId = v.youtubeId;
  const exactSlug = slugs[yId];
  if (!exactSlug) {
    console.error(`❌ ERROR: No se encontró slug para el vídeo ${yId}`);
    allCorrect = false;
    return;
  }
  const expectedUrl = `https://www.capacero3d.com/video/${exactSlug}`;
  const appendText = `📖 Guía escrita, capítulos y descargas: ${expectedUrl}`;
  const cleanTitle = (v.title || '').replace(/\|/g, '-').trim();
  
  verifiedRows.push(`| \`${yId}\` | ${cleanTitle} | \`${appendText}\` |`);
  verifiedBackup.push({
    id: v.id,
    youtubeId: yId,
    title: v.title,
    slug: exactSlug,
    targetUrl: expectedUrl,
    description: v.description || '',
    appendLine: appendText
  });
});

// Reemplazar la tabla en INFORME_FINAL.md con la tabla 100% verificada
const tableHeader = '| ID Vídeo | Título | Línea a pegar al final de la descripción de YouTube |\n| :--- | :--- | :--- |';
const fullTable = [tableHeader, ...verifiedRows].join('\n');

const tableRegex = /\| ID Vídeo \| Título \| Línea a pegar al final de la descripción de YouTube \|[\s\S]*?(?=\n---|\n##|$)/;
if (tableRegex.test(informe)) {
  informe = informe.replace(tableRegex, fullTable);
  fs.writeFileSync('INFORME_FINAL.md', informe, 'utf8');
  console.log('✅ INFORME_FINAL.md actualizado con la tabla verificada.\n');
} else {
  console.error('❌ No se pudo localizar la tabla en INFORME_FINAL.md');
}

fs.writeFileSync('docs/backups/descripciones-2026-10-08.json', JSON.stringify(verifiedBackup, null, 2), 'utf8');

// Ahora leer de nuevo INFORME_FINAL.md y verificar cada fila individualmente
const updatedInforme = fs.readFileSync('INFORME_FINAL.md', 'utf8');
const lines = updatedInforme.split('\n');
const parsedRows = [];

lines.forEach(line => {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*`📖 Guía escrita, capítulos y descargas: https:\/\/www\.capacero3d\.com\/video\/([^`]+)`\s*\|$/);
  if (match) {
    parsedRows.push({
      youtubeId: match[1].trim(),
      title: match[2].trim(),
      slugInTable: match[3].trim()
    });
  }
});

console.log(`Verificando ${parsedRows.length} filas parseadas directamente desde INFORME_FINAL.md:`);
let matchCount = 0;
let mismatchCount = 0;

parsedRows.forEach((row, i) => {
  const expectedSlug = slugs[row.youtubeId];
  const videoExists = videoMap.has(row.youtubeId);
  const slugMatches = expectedSlug === row.slugInTable;
  
  if (videoExists && slugMatches) {
    matchCount++;
    console.log(`[${i + 1}/33] OK: ${row.youtubeId} -> /video/${row.slugInTable}`);
  } else {
    mismatchCount++;
    console.error(`[${i + 1}/33] MISMATCH: ${row.youtubeId} -> esperado: ${expectedSlug}, en tabla: ${row.slugInTable}`);
  }
});

console.log(`\n=== RESULTADO FINAL: ${matchCount} CORRECTAS, ${mismatchCount} DISCREPANCIAS ===`);
if (mismatchCount > 0) {
  process.exit(1);
}
