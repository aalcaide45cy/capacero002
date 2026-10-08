import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const scriptId = process.argv[2];

if (!scriptId || scriptId.includes('<PEGA') || scriptId.trim().length < 15) {
  console.error('\n❌ ERROR: Debes proporcionar el Script ID de Google Apps Script como argumento.');
  console.log('Uso: node scripts/sync-appsscript.js <SCRIPT_ID>\n');
  console.log('👉 Cómo obtener el ID en 10 segundos:');
  console.log('   1. Abre tu hoja de cálculo de Google Sheets.');
  console.log('   2. Entra en Extensiones > Apps Script.');
  console.log('   3. Pulsa en el engranaje ⚙️ (Configuración del proyecto).');
  console.log('   4. Copia el valor de "ID de la secuencia de comandos".\n');
  process.exit(1);
}

const secretsDir = path.join(rootDir, '.secrets');
const appsscriptDir = path.join(secretsDir, 'appsscript');
const backupDir = path.join(secretsDir, 'appsscript-backup');
const codigoTxtPath = path.join(rootDir, 'google-sheet-scripts/Codigo.txt');

console.log(`🚀 Iniciando sincronización de Apps Script para el proyecto: ${scriptId}`);

// 1. Preparar directorios
fs.mkdirSync(secretsDir, { recursive: true });
fs.mkdirSync(appsscriptDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

// 2. Clonar proyecto
console.log('📥 Clonando proyecto con clasp...');
try {
  execSync(`npx @google/clasp clone "${scriptId}" --rootDir "${appsscriptDir}"`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('❌ Error al clonar con clasp:', e.message);
  process.exit(1);
}

// 3. Clasp pull
console.log('📥 Ejecutando clasp pull...');
try {
  execSync(`npx @google/clasp pull`, {
    cwd: appsscriptDir,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('❌ Error al hacer pull:', e.message);
  process.exit(1);
}

// 4. Crear copia de seguridad íntegra e intacta en .secrets/appsscript-backup
console.log('💾 Creando copia de seguridad intacta en .secrets/appsscript-backup...');
const files = fs.readdirSync(appsscriptDir);
files.forEach(f => {
  const src = path.join(appsscriptDir, f);
  const dest = path.join(backupDir, f);
  if (fs.statSync(src).isFile()) {
    fs.copyFileSync(src, dest);
  }
});
console.log('✅ Copia de seguridad guardada con éxito.');

// 5. Comparar código real con Codigo.txt
console.log('🔍 Comparando código real con google-sheet-scripts/Codigo.txt...');
const codeFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.gs'));
let realCode = '';
let mainCodeFileName = codeFiles[0] || 'Codigo.js';

codeFiles.forEach(cf => {
  realCode += fs.readFileSync(path.join(appsscriptDir, cf), 'utf8') + '\n\n';
});

const repoCode = fs.readFileSync(codigoTxtPath, 'utf8');

// Extraer funciones del código real y de Codigo.txt
function extractFunctions(code) {
  const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{[\s\S]*?^\})/gm;
  const map = new Map();
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    map.set(match[1], match[0]);
  }
  return map;
}

const realFns = extractFunctions(realCode);
const repoFns = extractFunctions(repoCode);

const extraInReal = [];
for (const [fnName, fnBody] of realFns.entries()) {
  if (!repoFns.has(fnName)) {
    extraInReal.push({ name: fnName, body: fnBody });
  }
}

console.log('\n📊 RESULTADOS DE LA COMPARACIÓN:');
if (extraInReal.length === 0) {
  console.log('✅ No hay funciones adicionales en el código real que falten en Codigo.txt.');
} else {
  console.log(`⚠️ Se encontraron ${extraInReal.length} funciones en el código real que no estaban en Codigo.txt:`);
  extraInReal.forEach(f => console.log(`   - ${f.name}`));

  // Integrar funciones extra en Codigo.txt
  let updatedRepoCode = repoCode.trim() + '\n\n// --- FUNCIONES INTEGRADAS DEL CÓDIGO REAL ---\n\n';
  extraInReal.forEach(f => {
    updatedRepoCode += f.body + '\n\n';
  });
  fs.writeFileSync(codigoTxtPath, updatedRepoCode, 'utf8');
  console.log('✅ Funciones integradas en google-sheet-scripts/Codigo.txt.');
}

// 6. Preparar archivo en .secrets/appsscript para push
const mergedCodeToPush = fs.readFileSync(codigoTxtPath, 'utf8');
fs.writeFileSync(path.join(appsscriptDir, mainCodeFileName), mergedCodeToPush, 'utf8');

// 7. Clasp push
console.log('\n📤 Subiendo código integrado a Apps Script con clasp push...');
try {
  execSync(`npx @google/clasp push --force`, {
    cwd: appsscriptDir,
    stdio: 'inherit'
  });
  console.log('✅ Clasp push completado con éxito.');
} catch (e) {
  console.error('❌ Error al hacer push:', e.message);
  process.exit(1);
}

// 8. Desplegar manteniendo la implementación existente
console.log('\n🚀 Actualizando la implementación activa existente...');
try {
  const deploymentsOutput = execSync(`npx @google/clasp deployments`, {
    cwd: appsscriptDir,
    encoding: 'utf8'
  });
  console.log('Implementaciones encontradas:\n' + deploymentsOutput);

  // Buscar el deployment ID activo (de tipo @XX o con ID AKfy...)
  const knownDeploymentId = 'AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg';
  
  let targetDepId = knownDeploymentId;
  const match = deploymentsOutput.match(new RegExp(`(${knownDeploymentId}|AKfy[a-zA-Z0-9_-]+)`));
  if (match) {
    targetDepId = match[1];
  }

  console.log(`Desplegando sobre la implementación existente ID: ${targetDepId}...`);
  execSync(`npx @google/clasp deploy -i "${targetDepId}" -d "Actualización automática Capa Cero 3D"`, {
    cwd: appsscriptDir,
    stdio: 'inherit'
  });
  console.log('🎉 Despliegue completado con éxito sin cambiar la URL /exec.');
} catch (e) {
  console.warn('⚠️ Nota sobre el despliegue:', e.message);
  console.log('Si clasp no pudo actualizar el ID directamente, puedes crear una nueva versión desde el editor web de Apps Script.');
}

console.log('\n🏁 Sincronización finalizada.');
