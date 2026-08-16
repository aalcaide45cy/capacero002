import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const inputLogo = path.join(publicDir, 'logo-capa-cero.png');

async function createOptimizedFavicons() {
  console.log('Inspecting logo:', inputLogo);
  
  const trimmed = sharp(inputLogo).trim();
  const trimmedBuffer = await trimmed.toBuffer();
  const meta = await sharp(trimmedBuffer).metadata();
  console.log('Trimmed dimensions:', meta.width, 'x', meta.height);

  const maxDim = Math.max(meta.width, meta.height);
  const padding = Math.round(maxDim * 0.05);
  const targetSize = maxDim + (padding * 2);

  const squared = await sharp(trimmedBuffer)
    .resize({
      width: targetSize,
      height: targetSize,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  await sharp(squared)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('Created favicon-48x48.png');

  await sharp(squared)
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'favicon-96x96.png'));
  console.log('Created favicon-96x96.png');

  await sharp(squared)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'favicon-192x192.png'));
  console.log('Created favicon-192x192.png');

  await sharp(squared)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Updated apple-touch-icon.png');

  await sharp(squared)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'logo-capa-cero-small.png'));
  console.log('Updated logo-capa-cero-small.png');
}

createOptimizedFavicons().catch(console.error);
