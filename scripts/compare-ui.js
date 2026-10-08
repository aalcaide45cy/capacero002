import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function createStaticServer(distDir, port) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    const server = http.createServer((req, res) => {
      let parsedUrl = req.url.split('?')[0];
      if (parsedUrl === '/') parsedUrl = '/index.html';
      let filePath = path.join(distDir, parsedUrl);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(port, () => {
      console.log(`Server serving ${distDir} on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function run() {
  const antesDist = path.resolve('../temp-antes/dist');
  const nowDist = path.resolve('dist');

  const serverAntes = await createStaticServer(antesDist, 5173);
  const serverNow = await createStaticServer(nowDist, 5174);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const screenshotsDir = path.resolve('screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const vp of viewports) {
    console.log(`\n--- Analizando ${vp.name} (${vp.width}x${vp.height}) ---`);

    // 1. Antes de plan
    const pageAntes = await browser.newPage();
    await pageAntes.setViewport({ width: vp.width, height: vp.height });
    await pageAntes.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Scroll to video grid
    await pageAntes.evaluate(() => {
      window.scrollTo(0, 600);
    });
    await new Promise(r => setTimeout(r, 500));

    await pageAntes.screenshot({
      path: path.join(screenshotsDir, `antes_${vp.name}.png`),
      fullPage: false
    });

    const cardsAntes = await pageAntes.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim());
      return titles;
    });

    // 2. Ahora (HEAD)
    const pageNow = await browser.newPage();
    await pageNow.setViewport({ width: vp.width, height: vp.height });
    await pageNow.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Scroll to video grid
    await pageNow.evaluate(() => {
      window.scrollTo(0, 600);
    });
    await new Promise(r => setTimeout(r, 500));

    await pageNow.screenshot({
      path: path.join(screenshotsDir, `now_${vp.name}.png`),
      fullPage: false
    });

    const cardsNow = await pageNow.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim());
      return titles;
    });

    console.log(`[${vp.name}] Total cards antes: ${cardsAntes.length} | ahora: ${cardsNow.length}`);
    console.log(`[${vp.name}] Primeras 5 tarjetas ANTES:`);
    cardsAntes.slice(0, 5).forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
    console.log(`[${vp.name}] Primeras 5 tarjetas AHORA:`);
    cardsNow.slice(0, 5).forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

    // Comparar diferencias en la lista completa
    let diffFound = false;
    for (let i = 0; i < Math.max(cardsAntes.length, cardsNow.length); i++) {
      if (cardsAntes[i] !== cardsNow[i]) {
        console.log(`⚠️ Discrepancia en posición ${i + 1}:`);
        console.log(`   ANTES: "${cardsAntes[i]}"`);
        console.log(`   AHORA: "${cardsNow[i]}"`);
        diffFound = true;
      }
    }
    if (!diffFound) {
      console.log(`✅ El orden de las tarjetas coincide exactamente en ${vp.name}.`);
    }

    await pageAntes.close();
    await pageNow.close();
  }

  // Ahora comprobar pestañas y categorías
  console.log('\n--- Comprobando Pestañas y Categorías (Desktop 1440px) ---');
  const pageA = await browser.newPage();
  await pageA.setViewport({ width: 1440, height: 900 });
  await pageA.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  const pageN = await browser.newPage();
  await pageN.setViewport({ width: 1440, height: 900 });
  await pageN.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

  // Categorías presentes en la barra
  const catsA = await pageA.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);
  });
  const catsN = await pageN.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);
  });

  console.log('Botones ANTES:', catsA.slice(0, 15));
  console.log('Botones AHORA:', catsN.slice(0, 15));

  // Cursos tab
  console.log('\n--- Probando pestaña Cursos ---');
  // Click on "Cursos"
  const clickCourseA = await pageA.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cursos') || b.innerText.includes('Curso'));
    if (btn) { btn.click(); return btn.innerText; }
    return null;
  });
  const clickCourseN = await pageN.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cursos') || b.innerText.includes('Curso'));
    if (btn) { btn.click(); return btn.innerText; }
    return null;
  });
  console.log('Clicked Cursos button:', { antes: clickCourseA, now: clickCourseN });
  await new Promise(r => setTimeout(r, 600));

  await pageA.screenshot({ path: path.join(screenshotsDir, 'antes_cursos_desktop.png') });
  await pageN.screenshot({ path: path.join(screenshotsDir, 'now_cursos_desktop.png') });

  const coursesA = await pageA.evaluate(() => {
    return Array.from(document.querySelectorAll('h3, h4')).map(h => h.innerText.trim());
  });
  const coursesN = await pageN.evaluate(() => {
    return Array.from(document.querySelectorAll('h3, h4')).map(h => h.innerText.trim());
  });
  console.log('Cursos ANTES:', coursesA);
  console.log('Cursos AHORA:', coursesN);

  await browser.close();
  serverAntes.close();
  serverNow.close();
  console.log('\n🏁 Comparativa completada. Capturas guardadas en screenshots/');
}

run().catch(err => {
  console.error('Error en comparativa:', err);
  process.exit(1);
});
