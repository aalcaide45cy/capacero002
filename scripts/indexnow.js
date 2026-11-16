// Avisa a IndexNow (Bing, Yandex, Seznam, Naver...) de las URLs nuevas del sitemap.
// Google no admite ping de sitemaps desde 2023: lo descubre por sitemap.xml/robots.txt y por los enlaces internos.
import { execSync } from 'child_process';
import fs from 'fs';

const HOST = 'www.capacero3d.com';
const KEY = 'fb53ecb21be83fce1150c5b9f73f2f56';
const locs = (xml) => new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

const current = locs(fs.readFileSync('public/sitemap.xml', 'utf-8'));
let previous = new Set();
try {
  previous = locs(execSync('git show HEAD~1:public/sitemap.xml', { encoding: 'utf-8', maxBuffer: 1 << 26 }));
} catch { /* sin historial: se envía todo */ }

const urls = [...current].filter((u) => !previous.has(u));
if (!urls.length) { console.log('IndexNow: sin URLs nuevas.'); process.exit(0); }
urls.push(`https://${HOST}/`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs enviadas -> HTTP ${res.status}`);
if (res.status >= 500) process.exit(1);
