import sharp from 'sharp';
import fs from 'fs';

const bannerInput = 'M:/Canal Capa Cero - Web v2/Nuevo Logotipo/Logo Fondo.png';
const emblemInput = 'M:/Canal Capa Cero - Web v2/Nuevo Logotipo/LogotipoNuegoAgosto2026.png';

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  let logoBuffer;
  if (fs.existsSync(bannerInput)) {
    const trimmed = await sharp(bannerInput)
      .trim({ threshold: 5 })
      .toBuffer();

    logoBuffer = await sharp(trimmed)
      .resize({
        width: 1100,
        height: 550,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .toBuffer();
  } else if (fs.existsSync(emblemInput)) {
    logoBuffer = await sharp(emblemInput)
      .resize({
        width: 500,
        height: 500,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .toBuffer();
  } else {
    logoBuffer = await sharp('public/logo-capa-cero.png')
      .resize({
        width: 1100,
        height: 550,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .toBuffer();
  }

  // Create solid pure black background and composite logo in the center
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
  .composite([
    {
      input: logoBuffer,
      gravity: 'center'
    }
  ])
  .jpeg({ quality: 95 })
  .toFile('public/og-image.jpg');

  // Also create PNG version with solid black (no transparency)
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
  .composite([
    {
      input: logoBuffer,
      gravity: 'center'
    }
  ])
  .png({ quality: 95 })
  .toFile('public/og-image.png');

  console.log('✅ Successfully generated public/og-image.jpg and public/og-image.png with solid black background (1200x630)!');
}

generateOgImage().catch(console.error);
