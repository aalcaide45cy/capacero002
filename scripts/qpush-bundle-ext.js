// Empaqueta chrome-extension/ en api/_lib/qpush/extension-files.js (base64) para que /qpush/extension.zip se genere
// desde la propia web. Uso: npm run qpush:ext   (tests/qpush.test.js comprueba que el resultado está al día).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function readExtensionFiles() {
  const dir = path.join(root, 'chrome-extension');
  const out = {};
  const walk = (d, rel = '') => {
    for (const name of fs.readdirSync(d).sort()) {
      const full = path.join(d, name), r = rel ? `${rel}/${name}` : name;
      if (fs.statSync(full).isDirectory()) walk(full, r);
      else out[r] = fs.readFileSync(full).toString('base64');
    }
  };
  walk(dir);
  return out;
}
export function renderModule(files) {
  return '// Generado por scripts/qpush-bundle-ext.js. No editar a mano.\nexport const EXTENSION_FILES = ' + JSON.stringify(files, null, 1) + ';\n';
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(root, 'api/_lib/qpush/extension-files.js'), renderModule(readExtensionFiles()));
  console.log('extension-files.js actualizado');
}
