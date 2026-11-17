// Cambia la ruta de Llamadas rápidas en vercel.json (por defecto /qpush). Uso:
//   npm run qpush:base -- /otra-ruta     (subcarpeta)
//   npm run qpush:base -- /              (raíz del dominio: solo para un despliegue propio, tapa el resto de la web)
// Después define la variable BASE_PATH en Vercel con el mismo valor y vuelve a desplegar.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeBase } from '../api/_lib/qpush/core.js';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../vercel.json');
const base = normalizeBase(process.argv[2]);
if (base == null || process.argv[2] == null) {
  console.error('Uso: npm run qpush:base -- /ruta   (letras, números, "-", "_", ".", "~")');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
const isQ = (r) => /[?&]p=qpush/.test(r.destination || '');
const rest = cfg.rewrites.filter((r) => !isQ(r));
const mk = [
  { source: base === '' ? '/' : base, destination: `/api/admin?p=qpush&b=${base}` },
  ...(base === '' ? [] : [{ source: `${base}/`, destination: `/api/admin?p=qpush&b=${base}` }]), // con barra final (start_url del manifest)
  { source: `${base}/:path*`, destination: `/api/admin?p=qpush/:path*&b=${base}` }
];
cfg.rewrites = [...mk, ...rest];
fs.writeFileSync(file, JSON.stringify(cfg, null, 4) + '\n');
console.log(`vercel.json actualizado: Llamadas rápidas en "${base || '/'}". Pon BASE_PATH=${base || '/'} en Vercel y redespliega.`);
