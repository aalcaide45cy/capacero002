import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SECRETS_DIR = path.resolve(ROOT_DIR, '.secrets');
const OUTPUT_FILE = path.resolve(SECRETS_DIR, 'youtube-oauth.json');
const CLIENT_FILE = path.resolve(SECRETS_DIR, 'youtube-client.json');

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
].join(' ');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function openBrowser(targetUrl) {
  const startCmd = process.platform === 'win32'
    ? `start "" "${targetUrl}"`
    : process.platform === 'darwin'
      ? `open "${targetUrl}"`
      : `xdg-open "${targetUrl}"`;

  exec(startCmd, (err) => {
    if (err) {
      console.log('⚠️ No se pudo abrir el navegador automáticamente. Abre este enlace manualmente:');
      console.log(targetUrl);
    }
  });
}

async function main() {
  console.log('========================================================');
  console.log('   GENERADOR DE REFRESH TOKEN — YOUTUBE ANALYTICS API   ');
  console.log('========================================================\n');

  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true });
  }

  let clientId = process.env.YT_CLIENT_ID || '';
  let clientSecret = process.env.YT_CLIENT_SECRET || '';

  // Intentar leer de .secrets/youtube-client.json si existe
  if (fs.existsSync(CLIENT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf-8'));
      const installed = data.installed || data.web || data;
      clientId = clientId || installed.client_id;
      clientSecret = clientSecret || installed.client_secret;
      console.log('📄 Credenciales leídas desde .secrets/youtube-client.json');
    } catch (e) {
      console.warn('Advertencia al leer .secrets/youtube-client.json:', e.message);
    }
  }

  // Comprobar argumentos CLI (--client-id=... --client-secret=...)
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--client-id=')) clientId = arg.split('=')[1];
    if (arg.startsWith('--client-secret=')) clientSecret = arg.split('=')[1];
  }

  if (!clientId) {
    clientId = await askQuestion('Introduce tu Google OAuth Client ID: ');
  }

  if (!clientSecret) {
    clientSecret = await askQuestion('Introduce tu Google OAuth Client Secret: ');
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID y Client Secret son obligatorios.');
    process.exit(1);
  }

  console.log('\n🚀 Iniciando servidor local en el puerto', PORT, 'para recibir el callback de OAuth...');

  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/oauth2callback') {
      const code = parsed.query.code;
      const error = parsed.query.error;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Error de autorización: ${error}</h2>`);
        console.error('\n❌ Autorización rechazada por el usuario o error:', error);
        server.close();
        process.exit(1);
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>❌ Código de autorización no recibido.</h2>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body style="font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; text-align: center; padding: 50px;">
            <h1 style="color: #22d3ee;">✅ Autorización Completada</h1>
            <p>Se ha recibido el código y generado el token con éxito.</p>
            <p style="color: #71717a;">Ya puedes cerrar esta pestaña y volver a la terminal.</p>
          </body>
        </html>
      `);

      console.log('🔄 Canjeando código de autorización por Refresh Token en Google...');

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: String(code),
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          throw new Error(`Google respondió con error ${tokenRes.status}: ${errBody}`);
        }

        const tokenData = await tokenRes.json();
        const refreshToken = tokenData.refresh_token;

        if (!refreshToken) {
          console.warn('⚠️ No se devolvió refresh_token. Es posible que la aplicación ya estuviese autorizada previamente.');
          console.warn('💡 Para forzar un nuevo refresh_token, revoca el acceso en https://myaccount.google.com/permissions o añade prompt=consent');
        }

        const oauthResult = {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken || 'YA_EXISTENTE_REVOCAR_EN_GOOGLE_SI_HACE_FALTA',
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          created_at: new Date().toISOString()
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(oauthResult, null, 2), 'utf-8');

        console.log('\n🎉 ¡REFRESH TOKEN OBTENIDO CON ÉXITO!');
        console.log(`📁 Guardado en: .secrets/youtube-oauth.json (ignorado por git)`);
        console.log('\nVariables para Vercel (Fase 11):');
        console.log(`YT_CLIENT_ID=${clientId}`);
        console.log(`YT_CLIENT_SECRET=${clientSecret}`);
        console.log(`YT_REFRESH_TOKEN=${refreshToken || '(revisa .secrets/youtube-oauth.json)'}\n`);

      } catch (err) {
        console.error('❌ Error al canjear el token:', err.message);
      } finally {
        server.close();
        process.exit(0);
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log('🌐 Abriendo navegador para iniciar sesión en Google...');
    console.log('Si no se abre automáticamente, entra en este enlace:\n');
    console.log(authUrl, '\n');
    openBrowser(authUrl);
  });
}

main().catch(err => {
  console.error('🔥 Error:', err);
  process.exit(1);
});
