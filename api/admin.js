// api/admin.js - Panel de administración de Capa Cero 3D (capacero3d.com/admin).
// Una sola función que sirve HTML renderizado en el servidor. Seguridad: contraseña + TOTP, sesión en cookie
// HttpOnly/Secure/SameSite=Strict (solo se guarda su hash en la base), CSRF, comprobación de Origin, límite de intentos
// por IP y email, CSP con nonce, consultas parametrizadas y registro de auditoría.
import crypto from 'crypto';
import QRCode from 'qrcode';
import { getPool } from './_lib/db.js';
import {
  hashPassword, verifyPassword, newTotpSecret, verifyTotp, otpauthUrl, encrypt, decrypt,
  sha256, randomToken, csrfFor, safeEqual, signState, readState, parseCookies
} from './_lib/adminSecurity.js';
import { extractYoutubeId, fetchVideoById, insertVideo, triggerDeploy } from './_lib/youtube.js';
import { runSync } from './_lib/sync.js';
import { sendNotification, processDueNotifications } from './_lib/push.js';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'aalcaide45cy@gmail.com').toLowerCase();
const COOKIE = '__Host-cc_admin';
const SESSION_HOURS = 12;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' }) : '—';
const num = (n) => Number(n || 0).toLocaleString('es-ES');
const asBool = (v) => v === true || v === 'true';

// ---------- Respuesta HTML ----------
function page(res, title, body, { nonce, session, status = 200, nav = true, script = '' } = {}) {
  const links = [['', 'Inicio'], ['videos', 'Vídeos'], ['models', 'Modelos'], ['subscribers', 'Suscriptores'], ['notifications', 'Notificaciones'], ['stats', 'Estadísticas'], ['settings', 'Ajustes'], ['audit', 'Auditoría']];
  const menu = nav && session ? `<nav>${links.map(([p, l]) => `<a href="/admin${p ? '/' + p : ''}">${l}</a>`).join('')}
    <form method="post" action="/admin/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button class="link">Salir</button></form></nav>` : '';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)} · Panel Capa Cero 3D</title>
<style nonce="${nonce}">
:root{color-scheme:dark;--bg:#09090b;--card:#18181b;--line:#27272a;--text:#fafafa;--mut:#a1a1aa;--acc:#38bdf8;--ok:#4ade80;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,sans-serif}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center}
header b{font-size:16px}nav{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}nav a{color:var(--mut);text-decoration:none}nav a:hover{color:var(--acc)}
main{max-width:980px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0 16px}h2{font-size:16px;margin:0 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}.grid .card{margin:0}
.big{font-size:26px;font-weight:700}.mut{color:var(--mut);font-size:13px}.ok{color:var(--ok)}.bad{color:var(--bad)}
label{display:block;margin:10px 0 4px;color:var(--mut);font-size:13px}input,select,textarea{width:100%;background:#0c0c0f;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:10px;font:inherit}
input[type=checkbox]{width:auto;margin-right:8px}.chk{display:flex;align-items:center;margin:10px 0;color:var(--text);font-size:15px}
button{background:var(--acc);color:#04121a;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
button.sec{background:#27272a;color:var(--text)}button.link{background:none;color:var(--mut);padding:0;font-weight:400}button.danger{background:#7f1d1d;color:#fff}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:500}
.scroll{overflow-x:auto}.flash{background:#0c2a1a;border:1px solid #14532d;border-radius:8px;padding:10px 14px;margin-bottom:16px}.flash.err{background:#2a0c0c;border-color:#7f1d1d}
form.inline{display:inline}.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1 1 200px}.qr svg{width:200px;height:200px;background:#fff;padding:8px;border-radius:8px}
code{background:#0c0c0f;padding:2px 6px;border-radius:4px;word-break:break-all}
</style></head><body>
<header><b>Capa Cero 3D · Panel</b>${menu}</header><main>${body}</main>${script ? `<script nonce="${nonce}">${script}</script>` : ''}</body></html>`;
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
}

const flashBox = (q) => q.m ? `<div class="flash">${esc(String(q.m).slice(0, 300))}</div>` : q.e ? `<div class="flash err">${esc(String(q.e).slice(0, 300))}</div>` : '';
function redirect(res, to, kind, msg) {
  const sep = to.includes('?') ? '&' : '?';
  res.status(303).setHeader('Location', msg ? `${to}${sep}${kind}=${encodeURIComponent(msg)}` : to).end();
}

// ---------- Utilidades ----------
const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';

async function audit(pool, session, action, detail, ip) {
  await pool.query('INSERT INTO audit_log (admin_id, action, detail, ip) VALUES ($1,$2,$3,$4)', [session?.adminId ?? null, action, JSON.stringify(detail || {}), ip]).catch(() => {});
}

async function getSession(pool, req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || token.length < 30) return null;
  const { rows } = await pool.query(
    `SELECT s.id, s.admin_id, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`, [sha256(token)]);
  if (!rows[0]) return null;
  return { id: rows[0].id, adminId: rows[0].admin_id, email: rows[0].email, token, csrf: csrfFor(token) };
}

async function startSession(pool, req, res, adminId) {
  const token = randomToken(32);
  await pool.query(
    `INSERT INTO admin_sessions (admin_id, token_hash, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4, now() + ($5 || ' hours')::interval)`,
    [adminId, sha256(token), clientIp(req), String(req.headers['user-agent'] || '').slice(0, 300), String(SESSION_HOURS)]);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`);
}

function sameOrigin(req) {
  const host = req.headers.host;
  const src = req.headers.origin || req.headers.referer;
  if (!src) return false;
  try { return new URL(src).host === host; } catch { return false; }
}

async function tooManyAttempts(pool, ip, email) {
  const { rows } = await pool.query(
    `SELECT count(*) FILTER (WHERE ip = $1) AS by_ip, count(*) FILTER (WHERE email = $2) AS by_email
     FROM login_attempts WHERE NOT success AND ts > now() - interval '15 minutes'`, [ip, email]);
  return Number(rows[0].by_ip) >= 5 || Number(rows[0].by_email) >= 8;
}

async function getSetting(pool, key, def) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0] ? rows[0].value : def;
}
async function setSetting(pool, key, value) {
  await pool.query(`INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, JSON.stringify(value)]);
}

// ---------- Login y alta ----------
function loginForm(nonce, res, error) {
  return page(res, 'Entrar', `<div class="card" style="max-width:420px;margin:40px auto"><h1>Entrar</h1>${error ? `<div class="flash err">${esc(error)}</div>` : ''}
    <form method="post" action="/admin/login" autocomplete="off">
    <label>Email</label><input name="email" type="email" required autocomplete="username">
    <label>Contraseña</label><input name="password" type="password" required autocomplete="current-password">
    <label>Código de la app de autenticación (6 dígitos)</label><input name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" required autocomplete="one-time-code">
    <p><button>Entrar</button></p></form></div>`, { nonce, nav: false, status: error ? 401 : 200 });
}

async function handleLogin(pool, req, res, nonce) {
  if (req.method === 'GET') return loginForm(nonce, res);
  if (!sameOrigin(req)) return res.status(403).send('Origen no permitido');
  const ip = clientIp(req);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
  if (await tooManyAttempts(pool, ip, email)) return page(res, 'Bloqueado', '<div class="card" style="max-width:420px;margin:40px auto"><h1>Demasiados intentos</h1><p>Espera 15 minutos antes de volver a intentarlo.</p></div>', { nonce, nav: false, status: 429 });

  const { rows } = await pool.query('SELECT id, email, password_hash, totp_secret_enc FROM admin_users WHERE email = $1', [email]);
  const user = rows[0];
  // Se verifica siempre la contraseña (con hash de relleno si el usuario no existe) para no revelar si el email es válido.
  const pwOk = verifyPassword(String(req.body?.password || ''), user?.password_hash);
  let step = null;
  if (user && pwOk) {
    step = verifyTotp(decrypt(user.totp_secret_enc), req.body?.code);
    if (step !== null) {
      const last = Number(await getSetting(pool, 'admin_totp_last', 0));
      if (step <= last) step = null; // un código TOTP solo vale una vez
    }
  }
  const ok = Boolean(user && pwOk && step !== null);
  await pool.query('INSERT INTO login_attempts (ip, email, success) VALUES ($1,$2,$3)', [ip, email, ok]);
  if (!ok) {
    await audit(pool, null, 'login_failed', { email }, ip);
    return loginForm(nonce, res, 'Datos incorrectos.');
  }
  await setSetting(pool, 'admin_totp_last', step);
  await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [user.id]);
  await startSession(pool, req, res, user.id);
  await audit(pool, { adminId: user.id }, 'login', {}, ip);
  return redirect(res, '/admin');
}

async function handleSetup(pool, req, res, nonce) {
  const ip = clientIp(req);
  const noSetup = () => page(res, 'Alta', '<div class="card" style="max-width:420px;margin:40px auto"><h1>Enlace no válido</h1><p>El enlace de alta ha caducado o ya se usó.</p></div>', { nonce, nav: false, status: 404 });
  const { rows: existing } = await pool.query('SELECT 1 FROM admin_users LIMIT 1');
  if (existing.length) return noSetup();
  const setup = await getSetting(pool, 'admin_setup', null);
  const token = String(req.query.t || req.body?.t || '');
  if (!setup || new Date(setup.exp) < new Date() || !token || !safeEqual(sha256(token), setup.hash)) return noSetup();

  if (req.method === 'POST' && !sameOrigin(req)) return res.status(403).send('Origen no permitido');
  const hidden = `<input type="hidden" name="t" value="${esc(token)}">`;

  if (req.method === 'POST' && req.body?.step === 'confirm') {
    const st = readState(req.body.state);
    if (!st || st.email !== setup.email) return noSetup();
    const secret = decrypt(st.secret);
    const firstStep = verifyTotp(secret, req.body.code);
    if (firstStep === null) {
      return page(res, 'Alta', setupConfirmHtml(await qr(secret, st.email), secret, req.body.state, hidden, 'Código incorrecto, prueba de nuevo.'), { nonce, nav: false, status: 400 });
    }
    const { rows } = await pool.query('INSERT INTO admin_users (email, password_hash, totp_secret_enc) VALUES ($1,$2,$3) RETURNING id', [st.email, st.ph, st.secret]);
    await pool.query(`DELETE FROM settings WHERE key = 'admin_setup'`);
    await setSetting(pool, 'admin_totp_last', firstStep);
    await startSession(pool, req, res, rows[0].id);
    await audit(pool, { adminId: rows[0].id }, 'admin_created', { email: st.email }, ip);
    return redirect(res, '/admin', 'm', 'Cuenta creada. Ya estás dentro.');
  }
  if (req.method === 'POST' && req.body?.step === 'password') {
    const pw = String(req.body.password || '');
    if (pw.length < 12 || pw !== String(req.body.password2 || '')) {
      return page(res, 'Alta', setupPasswordHtml(hidden, 'La contraseña debe tener al menos 12 caracteres y coincidir en los dos campos.'), { nonce, nav: false, status: 400 });
    }
    const secret = newTotpSecret();
    const state = signState({ email: setup.email, ph: hashPassword(pw), secret: encrypt(secret) }, 15 * 60000);
    return page(res, 'Alta', setupConfirmHtml(await qr(secret, setup.email), secret, state, hidden), { nonce, nav: false });
  }
  return page(res, 'Alta', setupPasswordHtml(hidden), { nonce, nav: false });
}
const qr = async (secret, email) => QRCode.toString(otpauthUrl(secret, email), { type: 'svg', margin: 0 });
const setupPasswordHtml = (hidden, error) => `<div class="card" style="max-width:460px;margin:40px auto"><h1>Crear cuenta de administrador</h1>${error ? `<div class="flash err">${esc(error)}</div>` : ''}
  <form method="post" action="/admin/setup" autocomplete="off">${hidden}<input type="hidden" name="step" value="password">
  <label>Contraseña (mínimo 12 caracteres)</label><input name="password" type="password" minlength="12" required autocomplete="new-password">
  <label>Repite la contraseña</label><input name="password2" type="password" minlength="12" required autocomplete="new-password">
  <p><button>Continuar</button></p></form></div>`;
const setupConfirmHtml = (svg, secret, state, hidden, error) => `<div class="card" style="max-width:460px;margin:40px auto"><h1>Activa el segundo factor</h1>
  <p class="mut">Escanea el código con Google Authenticator, Microsoft Authenticator, 1Password o similar. Si no puedes escanearlo, introduce esta clave: <code>${esc(secret)}</code></p>
  <div class="qr">${svg}</div>${error ? `<div class="flash err">${esc(error)}</div>` : ''}
  <form method="post" action="/admin/setup" autocomplete="off">${hidden}<input type="hidden" name="step" value="confirm"><input type="hidden" name="state" value="${esc(state)}">
  <label>Código de 6 dígitos que muestra la app</label><input name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" required autocomplete="one-time-code">
  <p><button>Crear cuenta</button></p></form></div>`;

// ---------- Páginas ----------
async function pageDashboard(pool, ctx) {
  const [v, s, n, r, d] = await Promise.all([
    pool.query(`SELECT count(*) total, count(*) FILTER (WHERE hidden) hidden, coalesce(sum(views),0) views, max(published_at) last FROM videos`),
    pool.query(`SELECT count(*) FILTER (WHERE status='active') active FROM push_subscriptions`),
    pool.query(`SELECT count(*) FILTER (WHERE status='scheduled') pending, max(sent_at) last FROM notifications`),
    pool.query(`SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1`),
    pool.query(`SELECT count(*) c FROM visits WHERE ts > now() - interval '7 days'`)
  ]);
  const run = r.rows[0];
  const checks = [
    ['Despliegue automático (Deploy Hook)', process.env.VERCEL_DEPLOY_HOOK_URL],
    ['Notificaciones push (claves VAPID)', process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PUBLIC_KEY],
    ['Clave de la API de YouTube (estadísticas en vivo)', process.env.YOUTUBE_API_KEY]
  ];
  return `<h1>Inicio</h1>${flashBox(ctx.query)}
  <div class="grid">
    <div class="card"><div class="mut">Vídeos</div><div class="big">${num(v.rows[0].total)}</div><div class="mut">${num(v.rows[0].hidden)} ocultos</div></div>
    <div class="card"><div class="mut">Visualizaciones</div><div class="big">${num(v.rows[0].views)}</div></div>
    <div class="card"><div class="mut">Suscriptores push</div><div class="big">${num(s.rows[0].active)}</div></div>
    <div class="card"><div class="mut">Avisos pendientes</div><div class="big">${num(n.rows[0].pending)}</div><div class="mut">Último: ${fmtDate(n.rows[0].last)}</div></div>
    <div class="card"><div class="mut">Visitas 7 días</div><div class="big">${num(d.rows[0].c)}</div></div>
  </div>
  <div class="card"><h2>Última sincronización</h2>${run ? `<p>${fmtDate(run.started_at)} · <span class="${run.status === 'ok' ? 'ok' : 'bad'}">${esc(run.status)}</span> · ${run.new_videos ?? 0} nuevos · ${run.updated_videos ?? 0} actualizados ${run.error ? `<br><span class="bad">${esc(run.error)}</span>` : ''}</p>` : '<p class="mut">Aún no se ha ejecutado.</p>'}
  <p class="mut">Último vídeo publicado: ${fmtDate(v.rows[0].last)}</p></div>
  <div class="card"><h2>Estado de la configuración</h2>${checks.map(([l, ok]) => `<p>${ok ? '<span class="ok">✔</span>' : '<span class="bad">✖</span>'} ${esc(l)}</p>`).join('')}</div>`;
}

async function pageVideos(pool, ctx) {
  const { rows } = await pool.query(`SELECT youtube_id, slug, title, published_at, views, hidden, is_featured, is_scheduled, extra->>'category' AS category FROM videos ORDER BY published_at DESC NULLS LAST LIMIT 300`);
  const cats = (await pool.query(`SELECT DISTINCT extra->>'category' c FROM videos WHERE extra->>'category' IS NOT NULL ORDER BY 1`)).rows.map(r => r.c);
  const csrf = esc(ctx.session.csrf);
  return `<h1>Vídeos</h1>${flashBox(ctx.query)}
  <div class="card"><h2>Añadir vídeo pegando el enlace</h2>
  <form method="post" action="/admin/videos/add"><input type="hidden" name="csrf" value="${csrf}">
    <label>Enlace de YouTube</label><input name="url" required placeholder="https://www.youtube.com/watch?v=..." autocomplete="off">
    <div class="row"><div><label>Categoría</label><select name="category"><option value="">(sin categoría)</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    <div><label>Consejo clave (opcional)</label><input name="tip" maxlength="300"></div></div>
    <div class="chk"><input type="checkbox" name="notify" id="n" checked><label for="n" style="margin:0;color:inherit">Avisar a los suscriptores cuando la página esté publicada</label></div>
    <button>Añadir vídeo</button></form>
    <p class="mut">Se leen los datos del vídeo, se guarda en la base, se regenera la web y se programa el aviso.</p></div>
  <div class="card scroll"><table><tr><th>Vídeo</th><th>Fecha</th><th>Vistas</th><th></th></tr>
  ${rows.map(v => `<tr><td><a href="/video/${esc(v.slug)}" style="color:var(--acc)">${esc(v.title)}</a><div class="mut">${esc(v.category || 'sin categoría')}${v.hidden ? ' · <span class="bad">oculto</span>' : ''}${v.is_featured ? ' · ⭐ destacado' : ''}${v.is_scheduled ? ' · programado' : ''}</div></td>
    <td>${fmtDate(v.published_at)}</td><td>${num(v.views)}</td><td style="white-space:nowrap">
    <form class="inline" method="post" action="/admin/videos/toggle"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${esc(v.youtube_id)}"><input type="hidden" name="field" value="hidden"><button class="sec">${v.hidden ? 'Mostrar' : 'Ocultar'}</button></form>
    <form class="inline" method="post" action="/admin/videos/toggle"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${esc(v.youtube_id)}"><input type="hidden" name="field" value="is_featured"><button class="sec">${v.is_featured ? 'Quitar ⭐' : '⭐'}</button></form></td></tr>`).join('')}
  </table></div>`;
}

async function pageNotifications(pool, ctx) {
  await processDueNotifications(pool).catch(() => {});
  const [subs, list] = await Promise.all([
    pool.query(`SELECT count(*) FILTER (WHERE status='active') active, count(*) total FROM push_subscriptions`),
    pool.query(`SELECT * FROM notifications ORDER BY id DESC LIMIT 50`)
  ]);
  const csrf = esc(ctx.session.csrf);
  const enabled = asBool(await getSetting(pool, 'notifications_enabled', false));
  return `<h1>Notificaciones</h1>${flashBox(ctx.query)}
  ${enabled ? '' : '<div class="flash err">Las notificaciones están desactivadas en Ajustes: no se enviará nada.</div>'}
  <div class="card"><h2>Enviar una notificación</h2><p class="mut">${num(subs.rows[0].active)} suscriptores activos (${num(subs.rows[0].total)} registrados).</p>
  <form method="post" action="/admin/notifications/send"><input type="hidden" name="csrf" value="${csrf}">
    <label>Título</label><input name="title" required maxlength="80"><label>Mensaje</label><textarea name="body" rows="3" required maxlength="200"></textarea>
    <label>Enlace al pulsar (ruta de la web)</label><input name="url" value="/" maxlength="300">
    <label>Cuándo</label><select name="when"><option value="now">Ahora</option><option value="later">Programar…</option></select>
    <label>Fecha y hora (hora de Madrid, solo si programas)</label><input name="at" type="datetime-local">
    <p><button>Enviar</button></p></form></div>
  <div class="card"><h2>Recibir avisos en este dispositivo</h2><p class="mut">Registra este navegador como suscriptor de prueba del nuevo sistema.</p>
    <button id="sub" class="sec" type="button">Activar en este dispositivo</button> <span id="subst" class="mut"></span></div>
  <div class="card scroll"><h2>Historial</h2><table><tr><th>Aviso</th><th>Estado</th><th>Fecha</th><th>Enviados</th></tr>
  ${list.rows.map(n => `<tr><td><b>${esc(n.title)}</b><div class="mut">${esc(n.body)}</div><div class="mut">${esc(n.url)}</div></td><td>${esc(n.status)}${n.status === 'scheduled' ? `<form class="inline" method="post" action="/admin/notifications/cancel"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${n.id}"> <button class="link">cancelar</button></form>` : ''}</td>
    <td>${fmtDate(n.sent_at || n.scheduled_for || n.created_at)}</td><td>${n.status === 'sent' ? `${num(n.sent_count)} (${num(n.failed_count)} fallos)` : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Todavía no hay avisos.</td></tr>'}
  </table></div>`;
}

const SUBSCRIBE_JS = (csrf, vapid) => `
const b=document.getElementById('sub'),st=document.getElementById('subst');
const key=${JSON.stringify(vapid)};
function u8(s){const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0));}
b&&b.addEventListener('click',async()=>{try{
 if(!key){st.textContent='Faltan las claves VAPID en el servidor.';return;}
 if(!('serviceWorker' in navigator)||!('PushManager' in window)){st.textContent='Este navegador no admite push.';return;}
 if(await Notification.requestPermission()!=='granted'){st.textContent='Permiso denegado.';return;}
 const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();
 sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(key)});
 const r=await fetch('/admin/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF':${JSON.stringify(csrf)}},body:JSON.stringify(sub.toJSON())});
 st.textContent=r.ok?'Dispositivo activado ✔':'Error al registrar ('+r.status+')';
}catch(e){st.textContent='Error: '+e.message;}});`;

async function pageStats(pool) {
  const [tot, top, subs, runs, vis] = await Promise.all([
    pool.query(`SELECT coalesce(sum(views),0) v, coalesce(sum(likes),0) l, coalesce(sum(comments),0) c FROM videos WHERE NOT hidden`),
    pool.query(`SELECT title, slug, views, likes, comments FROM videos WHERE NOT hidden ORDER BY views DESC LIMIT 10`),
    pool.query(`SELECT status, count(*) c FROM push_subscriptions GROUP BY 1`),
    pool.query(`SELECT * FROM sync_runs ORDER BY id DESC LIMIT 15`),
    pool.query(`SELECT date_trunc('day', ts) d, count(*) c, count(DISTINCT visitor_id) u FROM visits WHERE ts > now() - interval '14 days' GROUP BY 1 ORDER BY 1 DESC`)
  ]);
  return `<h1>Estadísticas</h1><div class="grid">
  <div class="card"><div class="mut">Visualizaciones</div><div class="big">${num(tot.rows[0].v)}</div></div>
  <div class="card"><div class="mut">Me gusta</div><div class="big">${num(tot.rows[0].l)}</div></div>
  <div class="card"><div class="mut">Comentarios</div><div class="big">${num(tot.rows[0].c)}</div></div>
  <div class="card"><div class="mut">Suscripciones push</div>${subs.rows.map(s => `<div>${esc(s.status)}: <b>${num(s.c)}</b></div>`).join('') || '<div class="mut">ninguna</div>'}</div></div>
  <div class="card scroll"><h2>Vídeos más vistos</h2><table><tr><th>Vídeo</th><th>Vistas</th><th>Me gusta</th><th>Comentarios</th></tr>
  ${top.rows.map(v => `<tr><td><a style="color:var(--acc)" href="/video/${esc(v.slug)}">${esc(v.title)}</a></td><td>${num(v.views)}</td><td>${num(v.likes)}</td><td>${num(v.comments)}</td></tr>`).join('')}</table></div>
  <div class="card scroll"><h2>Visitas (14 días)</h2><table><tr><th>Día</th><th>Visitas</th><th>Visitantes</th></tr>${vis.rows.map(r => `<tr><td>${new Date(r.d).toLocaleDateString('es-ES')}</td><td>${num(r.c)}</td><td>${num(r.u)}</td></tr>`).join('') || '<tr><td colspan="3" class="mut">Aún no se registran visitas en la base nueva (siguen en la hoja).</td></tr>'}</table></div>
  <div class="card scroll"><h2>Sincronizaciones</h2><table><tr><th>Inicio</th><th>Origen</th><th>Estado</th><th>Nuevos</th><th>Error</th></tr>
  ${runs.rows.map(r => `<tr><td>${fmtDate(r.started_at)}</td><td>${esc(r.source)}</td><td class="${r.status === 'ok' ? 'ok' : 'bad'}">${esc(r.status)}</td><td>${r.new_videos ?? '—'}</td><td>${esc(r.error || '')}</td></tr>`).join('')}</table></div>`;
}

async function pageSettings(pool, ctx) {
  const notif = asBool(await getSetting(pool, 'notifications_enabled', false));
  const auto = asBool(await getSetting(pool, 'auto_notify_new_video', false));
  const csrf = esc(ctx.session.csrf);
  return `<h1>Ajustes</h1>${flashBox(ctx.query)}
  <div class="card"><h2>Notificaciones</h2><form method="post" action="/admin/settings"><input type="hidden" name="csrf" value="${csrf}">
    <div class="chk"><input type="checkbox" name="notifications_enabled" id="a" ${notif ? 'checked' : ''}><label for="a" style="margin:0;color:inherit">Notificaciones activadas</label></div>
    <div class="chk"><input type="checkbox" name="auto_notify_new_video" id="b" ${auto ? 'checked' : ''}><label for="b" style="margin:0;color:inherit">Avisar automáticamente de cada vídeo nuevo que detecte la sincronización</label></div>
    <button>Guardar</button></form></div>
  <div class="card"><h2>Sincronización</h2><p class="mut">Busca vídeos nuevos del canal y actualiza estadísticas. También se ejecuta sola cada hora.</p>
    <form method="post" action="/admin/sync"><input type="hidden" name="csrf" value="${csrf}"><button class="sec">Sincronizar ahora</button></form>
    <form method="post" action="/admin/deploy" style="margin-top:10px"><input type="hidden" name="csrf" value="${csrf}"><button class="sec">Regenerar la web ahora</button></form></div>
  <div class="card"><h2>Seguridad</h2><p class="mut">Sesión de ${esc(ctx.session.email)}. Las sesiones caducan a las ${SESSION_HOURS} horas.</p>
    <form method="post" action="/admin/logout-all"><input type="hidden" name="csrf" value="${csrf}"><button class="danger">Cerrar todas las sesiones</button></form></div>`;
}


async function pageModels(pool, ctx) {
  const { rows } = await pool.query('SELECT * FROM models ORDER BY sort_order, id');
  const csrf = esc(ctx.session.csrf);
  const editId = parseInt(ctx.query.edit, 10) || 0;
  const m = rows.find(r => r.id == editId) || { id: '', sort_order: (rows.length ? Math.max(...rows.map(r => r.sort_order)) + 1 : 1), name: '', link: 'https://makerworld.com/es/models/', description: '', tag: '✨ NUEVO', button_text: 'IR A DISEÑO', price: '0', show_price: false, carousel_interval: 3500, images: [] };
  return `<h1>Modelos de MakerWorld</h1>${flashBox(ctx.query)}
  <div class="card"><h2>${m.id ? 'Editar modelo' : 'Añadir modelo'}</h2>
  <form method="post" action="/admin/models/save"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${esc(m.id)}">
    <div class="row"><div><label>Nombre</label><input name="name" required maxlength="150" value="${esc(m.name)}"></div><div><label>Orden</label><input name="sort_order" type="number" value="${esc(m.sort_order)}"></div></div>
    <label>Enlace al modelo</label><input name="link" required maxlength="400" value="${esc(m.link)}">
    <label>Descripción</label><textarea name="description" rows="3" maxlength="600">${esc(m.description)}</textarea>
    <div class="row"><div><label>Etiqueta</label><input name="tag" maxlength="40" value="${esc(m.tag)}"></div><div><label>Texto del botón</label><input name="button_text" maxlength="40" value="${esc(m.button_text)}"></div>
    <div><label>Precio</label><input name="price" maxlength="20" value="${esc(m.price)}"></div><div><label>Segundos por imagen</label><input name="interval" type="number" step="0.5" min="2.5" value="${esc(m.carousel_interval / 1000)}"></div></div>
    <div class="chk"><input type="checkbox" name="show_price" id="sp" ${m.show_price ? 'checked' : ''}><label for="sp" style="margin:0;color:inherit">Mostrar precio</label></div>
    <label>Imágenes (una URL por línea, máximo 10)</label><textarea name="images" rows="5">${esc((m.images || []).join('\n'))}</textarea>
    <p><button>Guardar</button> ${m.id ? '<a href="/admin/models" style="color:var(--mut)">cancelar</a>' : ''}</p></form></div>
  <div class="card scroll"><table><tr><th>#</th><th>Modelo</th><th></th></tr>
  ${rows.map(r => `<tr><td>${r.sort_order}</td><td><b>${esc(r.name)}</b>${r.active ? '' : ' <span class="bad">(oculto)</span>'}<div class="mut">${(r.images || []).length} imágenes · ${esc(r.link)}</div></td><td style="white-space:nowrap">
    <a href="/admin/models?edit=${r.id}" style="color:var(--acc)">Editar</a>
    <form class="inline" method="post" action="/admin/models/toggle"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${r.id}"><button class="sec">${r.active ? 'Ocultar' : 'Mostrar'}</button></form>
    <form class="inline" method="post" action="/admin/models/delete"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${r.id}"><button class="danger">Borrar</button></form></td></tr>`).join('') || '<tr><td colspan="3" class="mut">Sin modelos.</td></tr>'}
  </table></div>`;
}

async function pageSubscribers(pool, ctx) {
  const q = String(ctx.query.q || '').trim().slice(0, 80);
  const [tot, list] = await Promise.all([
    pool.query(`SELECT count(*) total, count(*) FILTER (WHERE status='active') active, count(*) FILTER (WHERE status='active' AND consent_marketing) consent, count(*) FILTER (WHERE status IN ('unsubscribed','bounced','invalid')) out FROM subscribers`),
    pool.query(`SELECT * FROM subscribers WHERE ($1 = '' OR email ILIKE '%' || $1 || '%' OR coalesce(first_name,'') ILIKE '%' || $1 || '%' OR coalesce(last_name,'') ILIKE '%' || $1 || '%') ORDER BY created_at DESC, id DESC LIMIT 300`, [q])
  ]);
  const csrf = esc(ctx.session.csrf);
  const t = tot.rows[0];
  return `<h1>Suscriptores de email</h1>${flashBox(ctx.query)}
  <div class="grid"><div class="card"><div class="mut">Total</div><div class="big">${num(t.total)}</div></div><div class="card"><div class="mut">Activos</div><div class="big">${num(t.active)}</div></div>
  <div class="card"><div class="mut">Con consentimiento</div><div class="big">${num(t.consent)}</div></div><div class="card"><div class="mut">Baja / inválidos</div><div class="big">${num(t.out)}</div></div></div>
  <div class="card"><h2>Añadir suscriptor</h2><form method="post" action="/admin/subscribers/add"><input type="hidden" name="csrf" value="${csrf}">
    <div class="row"><div><label>Email</label><input name="email" type="email" required></div><div><label>Nombre</label><input name="first_name" maxlength="80"></div><div><label>Origen</label><input name="source" value="manual" maxlength="60"></div></div>
    <div class="chk"><input type="checkbox" name="consent" id="c"><label for="c" style="margin:0;color:inherit">Ha dado su consentimiento para recibir emails</label></div><button>Añadir</button></form>
    <p class="mut" style="margin-top:12px"><a style="color:var(--acc)" href="/admin/subscribers/export">Descargar CSV</a> (solo activos con consentimiento, para MailerLite u otro servicio).</p></div>
  <div class="card scroll"><form method="get" action="/admin/subscribers" style="margin-bottom:10px"><input name="q" placeholder="Buscar por email o nombre" value="${esc(q)}"></form>
  <table><tr><th>Email</th><th>Nombre</th><th>País</th><th>Origen</th><th>Estado</th><th></th></tr>
  ${list.rows.map(r => `<tr><td>${esc(r.email)}</td><td>${esc([r.first_name, r.last_name].filter(Boolean).join(' '))}</td><td>${esc(r.country || '')}</td><td class="mut">${esc(r.source)}<div>${esc(r.consent_note || '')}</div></td>
    <td>${esc(r.status)}${r.consent_marketing ? ' · <span class="ok">consentimiento</span>' : ' · <span class="mut">sin consentimiento marketing</span>'}</td>
    <td style="white-space:nowrap"><form class="inline" method="post" action="/admin/subscribers/status"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="id" value="${r.id}"><input type="hidden" name="status" value="${r.status === 'active' ? 'unsubscribed' : 'active'}"><button class="sec">${r.status === 'active' ? 'Dar de baja' : 'Reactivar'}</button></form></td></tr>`).join('') || '<tr><td colspan="6" class="mut">Sin resultados.</td></tr>'}
  </table></div>`;
}

async function pageAudit(pool) {
  const { rows } = await pool.query(`SELECT * FROM audit_log ORDER BY id DESC LIMIT 100`);
  return `<h1>Auditoría</h1><div class="card scroll"><table><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>IP</th></tr>
  ${rows.map(r => `<tr><td>${fmtDate(r.ts)}</td><td>${esc(r.action)}</td><td class="mut">${esc(JSON.stringify(r.detail))}</td><td class="mut">${esc(r.ip)}</td></tr>`).join('')}</table></div>`;
}

// ---------- Acciones (POST) ----------
async function addVideo(pool, ctx) {
  const id = extractYoutubeId(ctx.body.url);
  if (!id) return ['e', 'No reconozco ese enlace de YouTube.'];
  if ((await pool.query('SELECT 1 FROM videos WHERE youtube_id = $1', [id])).rowCount) return ['e', 'Ese vídeo ya está en la web.'];
  let meta;
  try { meta = await fetchVideoById(id); } catch (err) { return ['e', `No pude leer el vídeo en YouTube: ${err.message}`]; }
  if (!meta) return ['e', 'YouTube no devuelve datos de ese vídeo (¿es privado o no existe?).'];
  if (meta.isShort) return ['e', 'Ese vídeo es un Short (un vídeo vertical de hasta 3 minutos); la web solo muestra vídeos largos.'];
  const slug = await insertVideo(pool, meta, { source: 'admin', category: String(ctx.body.category || '').slice(0, 80) || null, keyTip: String(ctx.body.tip || '').slice(0, 300) || null });
  if (!slug) return ['e', 'Ese vídeo ya estaba guardado.'];
  const deployed = await triggerDeploy();
  let extra = '';
  if (ctx.body.notify === 'on' && asBool(await getSetting(pool, 'notifications_enabled', false))) {
    await pool.query(`INSERT INTO notifications (kind, title, body, url, status, scheduled_for, youtube_id, created_by) VALUES ('new_video',$1,$2,$3,'scheduled', now() + interval '5 minutes',$4,$5)`,
      ['Nuevo vídeo en Capa Cero 3D', meta.title, `/video/${slug}`, id, ctx.session.adminId]);
    extra = ' Aviso programado para dentro de 5 minutos.';
  } else if (ctx.body.notify === 'on') extra = ' El aviso no se programó porque las notificaciones están desactivadas en Ajustes.';
  await audit(pool, ctx.session, 'video_added', { id, slug, deployed }, ctx.ip);
  return ['m', deployed
    ? `Añadido «${meta.title}». La web se está regenerando (1-2 minutos).${extra}`
    : `Añadido «${meta.title}». Falta configurar el Deploy Hook: la página saldrá en el próximo despliegue automático.${extra}`];
}

const POST_ACTIONS = {
  async 'videos/add'(pool, ctx) { return ['/admin/videos', ...(await addVideo(pool, ctx))]; },
  async 'videos/toggle'(pool, ctx) {
    const field = { hidden: 'hidden', is_featured: 'is_featured' }[ctx.body.field];
    if (!field || !/^[A-Za-z0-9_-]{11}$/.test(String(ctx.body.id))) return ['/admin/videos', 'e', 'Petición no válida.'];
    await pool.query(`UPDATE videos SET ${field} = NOT ${field}, updated_at = now() WHERE youtube_id = $1`, [ctx.body.id]);
    await audit(pool, ctx.session, 'video_toggle', { id: ctx.body.id, field }, ctx.ip);
    const deployed = await triggerDeploy();
    return ['/admin/videos', 'm', deployed ? 'Guardado. La web se está regenerando.' : 'Guardado. Se verá en el próximo despliegue.'];
  },
  async 'notifications/send'(pool, ctx) {
    const title = String(ctx.body.title || '').trim().slice(0, 80), body = String(ctx.body.body || '').trim().slice(0, 200);
    let url = String(ctx.body.url || '/').trim();
    if (!/^\/[^\s]*$/.test(url) && !/^https:\/\/(www\.)?capacero3d\.com(\/\S*)?$/.test(url)) return ['/admin/notifications', 'e', 'El enlace debe ser una ruta de la web (por ejemplo /video/...).'];
    if (!title || !body) return ['/admin/notifications', 'e', 'Falta el título o el mensaje.'];
    let at = new Date();
    if (ctx.body.when === 'later') {
      // El campo datetime-local viene sin zona: se interpreta como hora de Madrid.
      const m = String(ctx.body.at || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
      if (!m) return ['/admin/notifications', 'e', 'Indica la fecha y hora.'];
      const guess = new Date(`${m[1]}T${m[2]}:00Z`);
      const madrid = new Date(guess.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
      at = new Date(guess.getTime() - (madrid.getTime() - new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()));
      if (at.getTime() < Date.now()) return ['/admin/notifications', 'e', 'La fecha ya ha pasado.'];
    }
    const { rows } = await pool.query(`INSERT INTO notifications (kind, title, body, url, status, scheduled_for, created_by) VALUES ('manual',$1,$2,$3,'scheduled',$4,$5) RETURNING id`, [title, body, url, at, ctx.session.adminId]);
    await audit(pool, ctx.session, 'notification_created', { id: rows[0].id, title, at }, ctx.ip);
    if (ctx.body.when !== 'later') {
      if (!asBool(await getSetting(pool, 'notifications_enabled', false))) return ['/admin/notifications', 'e', 'Las notificaciones están desactivadas en Ajustes. El aviso queda programado.'];
      const r = await sendNotification(pool, rows[0].id).catch(err => ({ error: err.message }));
      return ['/admin/notifications', r.error ? 'e' : 'm', r.error ? `No se pudo enviar: ${r.error}` : `Enviado a ${r.sent} dispositivos (${r.failed} fallos).`];
    }
    return ['/admin/notifications', 'm', 'Aviso programado.'];
  },
  async 'notifications/cancel'(pool, ctx) {
    await pool.query(`UPDATE notifications SET status = 'cancelled' WHERE id = $1 AND status = 'scheduled'`, [parseInt(ctx.body.id, 10) || 0]);
    await audit(pool, ctx.session, 'notification_cancelled', { id: ctx.body.id }, ctx.ip);
    return ['/admin/notifications', 'm', 'Aviso cancelado.'];
  },
  async 'models/save'(pool, ctx) {
    const b = ctx.body;
    const name = String(b.name || '').trim().slice(0, 150);
    const link = String(b.link || '').trim().slice(0, 400);
    if (!name || !/^https:\/\/(www\.)?makerworld\.com\/\S*$/.test(link)) return ['/admin/models', 'e', 'Falta el nombre o el enlace no es de makerworld.com.'];
    const images = String(b.images || '').split(/\r?\n/).map(x => x.trim()).filter(x => /^https:\/\/\S+$/.test(x)).slice(0, 10);
    const interval = Math.max(2500, Math.round((parseFloat(b.interval) || 3.5) * 1000));
    const vals = [parseInt(b.sort_order, 10) || 0, name, link, String(b.description || '').slice(0, 600), String(b.tag || '').slice(0, 40), String(b.button_text || '').slice(0, 40) || 'IR A DISEÑO', String(b.price || '0').slice(0, 20), b.show_price === 'on', interval, JSON.stringify(images)];
    const id = parseInt(b.id, 10) || 0;
    if (id) await pool.query(`UPDATE models SET sort_order=$1, name=$2, link=$3, description=$4, tag=$5, button_text=$6, price=$7, show_price=$8, carousel_interval=$9, images=$10, updated_at=now() WHERE id=$11`, [...vals, id]);
    else await pool.query(`INSERT INTO models (sort_order, name, link, description, tag, button_text, price, show_price, carousel_interval, images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, vals);
    await audit(pool, ctx.session, id ? 'model_updated' : 'model_created', { id, name }, ctx.ip);
    return ['/admin/models', 'm', 'Modelo guardado. En la web se verá en un minuto.'];
  },
  async 'models/toggle'(pool, ctx) {
    await pool.query('UPDATE models SET active = NOT active, updated_at = now() WHERE id = $1', [parseInt(ctx.body.id, 10) || 0]);
    await audit(pool, ctx.session, 'model_toggle', { id: ctx.body.id }, ctx.ip);
    return ['/admin/models', 'm', 'Guardado.'];
  },
  async 'models/delete'(pool, ctx) {
    await pool.query('DELETE FROM models WHERE id = $1', [parseInt(ctx.body.id, 10) || 0]);
    await audit(pool, ctx.session, 'model_deleted', { id: ctx.body.id }, ctx.ip);
    return ['/admin/models', 'm', 'Modelo borrado.'];
  },
  async 'subscribers/add'(pool, ctx) {
    const email = String(ctx.body.email || '').trim().toLowerCase().slice(0, 200);
    if (!/^[a-z0-9][a-z0-9._%+'-]*@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return ['/admin/subscribers', 'e', 'Email no válido.'];
    const consent = ctx.body.consent === 'on';
    const r = await pool.query(
      `INSERT INTO subscribers (email, first_name, source, consent_marketing, consent_at, consent_note) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (lower(email)) DO NOTHING`,
      [email, String(ctx.body.first_name || '').slice(0, 80) || null, String(ctx.body.source || 'manual').slice(0, 60), consent, consent ? new Date() : null, consent ? 'Marcado manualmente en el panel' : null]);
    await audit(pool, ctx.session, 'subscriber_added', { added: r.rowCount }, ctx.ip);
    return ['/admin/subscribers', r.rowCount ? 'm' : 'e', r.rowCount ? 'Suscriptor añadido.' : 'Ese email ya existe.'];
  },
  async 'subscribers/status'(pool, ctx) {
    const status = ctx.body.status === 'active' ? 'active' : 'unsubscribed';
    await pool.query(`UPDATE subscribers SET status = $2, unsubscribed_at = CASE WHEN $2 = 'unsubscribed' THEN now() ELSE NULL END WHERE id = $1`, [parseInt(ctx.body.id, 10) || 0, status]);
    await audit(pool, ctx.session, 'subscriber_status', { id: ctx.body.id, status }, ctx.ip);
    return ['/admin/subscribers', 'm', 'Guardado.'];
  },
  async settings(pool, ctx) {
    await setSetting(pool, 'notifications_enabled', ctx.body.notifications_enabled === 'on');
    await setSetting(pool, 'auto_notify_new_video', ctx.body.auto_notify_new_video === 'on');
    await audit(pool, ctx.session, 'settings_saved', { notifications: ctx.body.notifications_enabled === 'on', auto: ctx.body.auto_notify_new_video === 'on' }, ctx.ip);
    return ['/admin/settings', 'm', 'Ajustes guardados.'];
  },
  async sync(pool, ctx) {
    const r = await runSync(pool, 'admin').catch(err => ({ error: err.message }));
    await audit(pool, ctx.session, 'sync_now', r, ctx.ip);
    return ['/admin/settings', r.error ? 'e' : 'm', r.error ? `Error: ${r.error}` : `Sincronizado: ${r.new} vídeos nuevos, ${r.updated} actualizados.`];
  },
  async deploy(pool, ctx) {
    const ok = await triggerDeploy();
    await audit(pool, ctx.session, 'deploy_now', { ok }, ctx.ip);
    return ['/admin/settings', ok ? 'm' : 'e', ok ? 'Despliegue lanzado.' : 'No hay Deploy Hook configurado (VERCEL_DEPLOY_HOOK_URL).'];
  },
  async 'logout-all'(pool, ctx) {
    await pool.query(`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = $1 AND revoked_at IS NULL`, [ctx.session.adminId]);
    await audit(pool, ctx.session, 'logout_all', {}, ctx.ip);
    return ['/admin/login'];
  }
};

// ---------- Enrutador ----------
export default async function handler(req, res) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`);

  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const route = String(req.query.p || '').replace(/^\/+|\/+$/g, '');
  const pool = getPool();
  try {
    if (route === 'login') return await handleLogin(pool, req, res, nonce);
    if (route === 'setup') return await handleSetup(pool, req, res, nonce);

    const session = await getSession(pool, req);
    if (!session) return route === '' && req.method === 'GET' ? loginForm(nonce, res) : redirect(res, '/admin/login');
    const ctx = { session, query: req.query, body: req.body || {}, ip: clientIp(req) };

    if (req.method === 'POST') {
      if (!sameOrigin(req)) return res.status(403).send('Origen no permitido');
      const token = req.headers['x-csrf'] || ctx.body.csrf;
      if (!token || !safeEqual(token, session.csrf)) return res.status(403).send('Token de seguridad no válido. Recarga la página.');
      if (route === 'logout') {
        await pool.query('UPDATE admin_sessions SET revoked_at = now() WHERE id = $1', [session.id]);
        res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
        return redirect(res, '/admin/login');
      }
      if (route === 'push/subscribe') {
        const s = req.body || {};
        if (!/^https:\/\/[^\s]+$/.test(String(s.endpoint)) || !s.keys?.p256dh || !s.keys?.auth) return res.status(400).json({ ok: false });
        await pool.query(
          `INSERT INTO push_subscriptions (endpoint, p256dh, auth, status, device, user_agent) VALUES ($1,$2,$3,'active','admin',$4)
           ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, status = 'active', last_seen_at = now()`,
          [s.endpoint, s.keys.p256dh, s.keys.auth, String(req.headers['user-agent'] || '').slice(0, 300)]);
        await audit(pool, session, 'push_device_added', {}, ctx.ip);
        return res.status(200).json({ ok: true });
      }
      const action = POST_ACTIONS[route];
      if (!action) return res.status(404).send('No encontrado');
      const [to, kind, msg] = await action(pool, ctx);
      return redirect(res, to, kind, msg);
    }

    if (route === 'subscribers/export' && req.method === 'GET') {
      const { rows } = await pool.query(`SELECT email, first_name, last_name, country, source, consent_at FROM subscribers WHERE status = 'active' AND consent_marketing ORDER BY id`);
      // Los campos que empiezan por = + - @ se neutralizan para que Excel no los ejecute como fórmulas.
      const cell = (v) => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
      const csv = ['email,first_name,last_name,country,source,consent_at', ...rows.map(r => [r.email, r.first_name, r.last_name, r.country, r.source, r.consent_at ? new Date(r.consent_at).toISOString() : ''].map(cell).join(','))].join('\n');
      await audit(pool, session, 'subscribers_exported', { rows: rows.length }, ctx.ip);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="suscriptores.csv"');
      return res.status(200).send(csv);
    }

    const views = { '': pageDashboard, videos: pageVideos, models: pageModels, subscribers: pageSubscribers, notifications: pageNotifications, stats: pageStats, settings: pageSettings, audit: pageAudit };
    if (!(route in views)) return page(res, 'No encontrado', '<h1>No encontrado</h1>', { nonce, session, status: 404 });
    const body = await views[route](pool, ctx);
    const script = route === 'notifications' ? SUBSCRIBE_JS(session.csrf, process.env.VAPID_PUBLIC_KEY || '') : '';
    return page(res, route || 'Inicio', body, { nonce, session, script });
  } catch (err) {
    console.error('admin error:', err);
    return page(res, 'Error', '<div class="card"><h1>Algo ha fallado</h1><p>Revisa los registros del servidor.</p></div>', { nonce, status: 500, nav: false });
  }
}
