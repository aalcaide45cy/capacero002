import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appsscriptDir = path.join(rootDir, '.secrets/appsscript');
const codigoTxtPath = path.join(rootDir, 'google-sheet-scripts/Codigo.txt');
const vapidPath = path.join(rootDir, '.secrets/vapid.json');
const statsPath = path.join(rootDir, '.secrets/stats.json');

const DEPLOYMENT_ID = 'AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg';
const SCRIPT_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

const claspCmd = process.platform === 'win32' ? 'npx.cmd @google/clasp' : 'npx @google/clasp';

async function run() {
  console.log('🔐 [1/5] Preparando configuración de un solo uso para PropertiesService...');
  
  const vapid = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  const vapidPrivateKey = vapid.privateKey;
  const statsApiToken = stats.STATS_API_TOKEN;

  // Generar código aleatorio de 32 bytes (64 caracteres hex)
  const oneTimeSecret = crypto.randomBytes(32).toString('hex');
  const tempActionName = `setup_config_${oneTimeSecret}`;

  const cleanCode = fs.readFileSync(codigoTxtPath, 'utf8');

  // Insertar la acción de un solo uso tanto en doGet como en doPost
  const tempSnippet = `
  // --- ACCIÓN TEMPORAL DE CONFIGURACIÓN DE UN SOLO USO ---
  var _tempAct = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  if (_tempAct === '${tempActionName}') {
    var props = PropertiesService.getScriptProperties();
    var vKey = e.parameter.v_key;
    var sTok = e.parameter.s_tok;
    if (vKey) props.setProperty('VAPID_PRIVATE_KEY', vKey);
    if (sTok) props.setProperty('STATS_API_TOKEN', sTok);
    var keys = props.getKeys();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      configuredKeys: keys
    })).setMimeType(ContentService.MimeType.JSON);
  }
`;

  const tempCode = cleanCode
    .replace('function doGet(e) {', 'function doGet(e) {' + tempSnippet)
    .replace('function doPost(e) {', 'function doPost(e) {' + tempSnippet);

  fs.writeFileSync(path.join(appsscriptDir, 'Código.js'), tempCode, 'utf8');

  console.log('📤 [2/5] Subiendo versión temporal a Apps Script y desplegando...');
  execSync(`${claspCmd} push --force`, { cwd: appsscriptDir, stdio: 'inherit' });
  execSync(`${claspCmd} deploy -i "${DEPLOYMENT_ID}" -d "Setup Temporal de Propiedades"`, { cwd: appsscriptDir, stdio: 'inherit' });

  console.log('🚀 [3/5] Llamando a la acción de configuración de un solo uso...');
  
  const setupUrl = `${SCRIPT_URL}?action=${tempActionName}&v_key=${encodeURIComponent(vapidPrivateKey)}&s_tok=${encodeURIComponent(statsApiToken)}`;
  
  let setupData = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Intento ${attempt}/3 de activación...`);
    await new Promise(r => setTimeout(r, 3000));
    try {
      const setupRes = await fetch(setupUrl);
      const setupText = await setupRes.text();
      try {
        setupData = JSON.parse(setupText);
      } catch (e) {
        console.log('Respuesta recibida:', setupText.slice(0, 150));
      }
      if (setupData?.success) break;
    } catch (err) {
      console.warn('Fallo de conexión:', err.message);
    }
  }

  console.log('Respuesta del setup temporal:', {
    success: setupData?.success,
    configuredKeys: setupData?.configuredKeys
  });

  if (!setupData?.success || !Array.isArray(setupData?.configuredKeys)) {
    console.error('❌ ERROR: No se pudieron configurar las propiedades:', setupData);
    process.exit(1);
  }

  const hasVapid = setupData.configuredKeys.includes('VAPID_PRIVATE_KEY');
  const hasToken = setupData.configuredKeys.includes('STATS_API_TOKEN');
  console.log(`✅ Propiedades configuradas en Apps Script: VAPID_PRIVATE_KEY (${hasVapid}), STATS_API_TOKEN (${hasToken})`);

  console.log('🧹 [4/5] Restaurando código definitivo limpio (eliminando acción temporal)...');
  fs.writeFileSync(path.join(appsscriptDir, 'Código.js'), cleanCode, 'utf8');
  execSync(`${claspCmd} push --force`, { cwd: appsscriptDir, stdio: 'inherit' });
  execSync(`${claspCmd} deploy -i "${DEPLOYMENT_ID}" -d "Versión Definitiva Producción Capa Cero 3D"`, { cwd: appsscriptDir, stdio: 'inherit' });
  console.log('✅ Despliegue definitivo completado.');

  console.log('🔍 [5/5] Verificando endpoints en producción...');
  await new Promise(r => setTimeout(r, 3000));

  // 1. latest_notification
  const r1 = await fetch(`${SCRIPT_URL}?action=latest_notification`);
  const d1 = await r1.json().catch(() => null);
  console.log('1. latest_notification status:', r1.status, '| respuesta válida:', Boolean(d1));

  // 2. push_stats sin token (debe ser rechazado)
  const r2 = await fetch(`${SCRIPT_URL}?action=push_stats`);
  const d2 = await r2.json().catch(() => null);
  const isRejected = d2?.error === 'unauthorized' || d2?.error === 'token_required' || r2.status === 401 || !d2?.devices;
  console.log('2. push_stats (sin token) status:', r2.status, '| rechazado:', isRejected, '| respuesta:', d2);

  // 3. stats-proxy con token contra Vercel producción
  const authRes = await fetch('https://www.capacero3d.com/api/auth-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: stats.STATS_PASSWORD })
  });
  const { token } = await authRes.json();
  const proxyRes = await fetch('https://www.capacero3d.com/api/stats-proxy?action=push_stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const proxyData = await proxyRes.json().catch(() => null);
  console.log('3. stats-proxy en producción status:', proxyRes.status, '| dispositivos recuperados:', proxyData?.devices?.length);

  // 4. Verificar que la acción temporal ya no existe
  const tempCheckRes = await fetch(`${SCRIPT_URL}?action=${tempActionName}`);
  const tempCheckText = await tempCheckRes.text();
  let tempCheckData = null;
  try { tempCheckData = JSON.parse(tempCheckText); } catch (e) {}
  const isTempGone = tempCheckData?.success !== true;
  console.log('4. Acción temporal eliminada:', isTempGone, '| respuesta:', tempCheckData?.message || tempCheckData?.error || tempCheckText.slice(0, 80));

  console.log('\n🎉 ¡PROCESO DE CONFIGURACIÓN DE APPS SCRIPT COMPLETADO CON ÉXITO!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
