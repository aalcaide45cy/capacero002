const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sharp = require('sharp');
    const heroPng = path.join(__dirname, '../public/logo-capa-cero.png');
    const heroWebp = path.join(__dirname, '../public/logo-capa-cero.webp');
    const emblemPng = path.join(__dirname, '../public/logo-emblem.png');
    const emblemWebp = path.join(__dirname, '../public/logo-emblem.webp');

    console.log("Original logo-capa-cero.webp:", fs.statSync(heroWebp).size, "bytes");
    console.log("Original logo-emblem.webp:", fs.statSync(emblemWebp).size, "bytes");

    await sharp(heroPng)
      .resize(960, null, { withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(heroWebp);

    await sharp(emblemPng)
      .resize(128, 128, { withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(emblemWebp);

    console.log("Optimized logo-capa-cero.webp:", fs.statSync(heroWebp).size, "bytes");
    console.log("Optimized logo-emblem.webp:", fs.statSync(emblemWebp).size, "bytes");
  } catch (err) {
    console.log("Sharp not available or error:", err.message);
  }
}

run();
