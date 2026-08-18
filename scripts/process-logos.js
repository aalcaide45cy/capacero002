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

  // 2. Process trimmed panoramic Logo Fondo (removes excess black vertical margins)
  const trimmed = await sharp(bannerInput)
    .trim({ threshold: 5 })
    .toBuffer({ resolveWithObject: true });

  const w = 1400;
  const h = Math.round((trimmed.info.height / trimmed.info.width) * w);

  const maskSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fade" cx="50%" cy="50%" rx="48%" ry="48%">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="55%" stop-color="white" stop-opacity="1" />
          <stop offset="80%" stop-color="white" stop-opacity="0.85" />
          <stop offset="94%" stop-color="white" stop-opacity="0.15" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  `;

  const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  await sharp(trimmed.data)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .webp({ quality: 92, effort: 6 })
    .toFile('public/logo-capa-cero.webp');

  await sharp(trimmed.data)
    .resize(w, h)
    .ensureAlpha()
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile('public/logo-capa-cero.png');

  console.log('✅ Generated compact panoramic public/logo-capa-cero.webp (' + w + 'x' + h + ')');
}

processAllLogos().catch(console.error);
