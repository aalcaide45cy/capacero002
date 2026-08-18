import sharp from 'sharp';
import fs from 'fs';

const emblemInput = 'M:/Canal Capa Cero - Web v2/Nuevo Logotipo/LogotipoNuegoAgosto2026.png';
const bannerInput = 'M:/Canal Capa Cero - Web v2/Nuevo Logotipo/Logo Fondo.png';

async function processAllLogos() {
  // 1. Process square emblem for sticky bar, footer, and compact views
  await sharp(emblemInput)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, effort: 6 })
    .toFile('public/logo-emblem.webp');

  await sharp(emblemInput)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile('public/logo-emblem.png');

  console.log('✅ Generated public/logo-emblem.webp (Square emblem for sticky bar)');

  // 2. Process large wide Logo Fondo with pure black seamless feathering
  const meta = await sharp(bannerInput).metadata();
  const w = 1440;
  const h = Math.round((meta.height / meta.width) * w);

  // SVG Elliptical gradient: center 100% opaque, edges fade to 0% smoothly
  const maskSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fade" cx="50%" cy="50%" rx="48%" ry="45%">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="50%" stop-color="white" stop-opacity="1" />
          <stop offset="75%" stop-color="white" stop-opacity="0.85" />
          <stop offset="92%" stop-color="white" stop-opacity="0.1" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  `;

  const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  await sharp(bannerInput)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .webp({ quality: 92, effort: 6 })
    .toFile('public/logo-capa-cero.webp');

  await sharp(bannerInput)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile('public/logo-capa-cero.png');

  console.log('✅ Generated public/logo-capa-cero.webp (Large wide banner logo)');
}

processAllLogos().catch(console.error);
