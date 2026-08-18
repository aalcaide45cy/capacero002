import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'M:/Canal Capa Cero - Web v2/Nuevo Logotipo/Logo Fondo.png';
const outputPathWebP = './public/logo-capa-cero.webp';
const outputPathPNG = './public/logo-capa-cero.png';
const outputPathSmall = './public/logo-capa-cero-small.png';

async function processFeatheredLogo() {
  const meta = await sharp(inputPath).metadata();
  const w = 1200;
  const h = Math.round((meta.height / meta.width) * w);

  // SVG Elliptical gradient to softly fade the black perimeter to 100% transparent
  const maskSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fade" cx="50%" cy="50%" rx="48%" ry="46%">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="60%" stop-color="white" stop-opacity="1" />
          <stop offset="80%" stop-color="white" stop-opacity="0.8" />
          <stop offset="94%" stop-color="white" stop-opacity="0.15" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  `;

  const maskBuffer = Buffer.from(maskSvg);
  const maskPng = await sharp(maskBuffer).png().toBuffer();

  // 1. WebP version
  await sharp(inputPath)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .webp({ quality: 92, effort: 6 })
    .toFile(outputPathWebP);

  console.log('✅ Generated feathered public/logo-capa-cero.webp');

  // 2. PNG version
  await sharp(inputPath)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPathPNG);

  console.log('✅ Generated feathered public/logo-capa-cero.png');

  // 3. Small version
  await sharp(inputPath)
    .resize(400, null)
    .ensureAlpha()
    .webp({ quality: 85 })
    .toFile(outputPathSmall);

  console.log('✅ Generated public/logo-capa-cero-small.png');
}

processFeatheredLogo().catch(console.error);
