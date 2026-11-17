// Empaqueta jsQR (MIT, ya es dependencia del proyecto) minificado en api/_lib/qpush/jsqr-source.js para servirlo
// desde /qpush/jsqr.js sin depender de ningún tercero. Uso: npm run qpush:jsqr
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/jsqr/dist/jsQR.js');
const min = execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [src, '--minify']).toString();
fs.writeFileSync(path.join(root, 'api/_lib/qpush/jsqr-source.js'),
  '// Generado por scripts/qpush-bundle-jsqr.js (jsQR 1.4.0, MIT). No editar a mano.\nexport const JSQR_SOURCE = ' + JSON.stringify(min) + ';\n');
console.log('jsqr-source.js actualizado');
