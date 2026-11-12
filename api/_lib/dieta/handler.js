// API JSON privada del módulo /dieta. Se sirve desde la función api/admin.js (ruta p=dieta/...) para no superar
// el límite de funciones del plan de Vercel. Toda lectura/escritura exige sesión de propietario validada en servidor.
import { getPool } from '../db.js';
import { verifyPassword, verifyTotp, decrypt, sha256, randomToken, safeEqual, parseCookies } from '../adminSecurity.js';
import {
  NUTRIENTS, QUALITIES, computeItems, sumResults, checkRestrictions, classifyAlternative, DEFAULT_TOLERANCES,
  scaleItems, addDays, weekStart, madridDate, isYmd, costItems, itemGrams, packInfo
} from './nutrition.js';
import { SEED_FOODS, SEED_RECIPES, buildWeek } from './menu.js';

const COOKIE = '__Host-cc_diet';
const SHORT_HOURS = 12;
const REMEMBER_OPTIONS = [7, 30, 60];
const ROTATE_AFTER_HOURS = 24;
const NUTRIENT_KEYS = new Set(NUTRIENTS.map(n => n.key));

const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
function sameOrigin(req) {
  const src = req.headers.origin || req.headers.referer;
  if (!src) return false;
  try { return new URL(src).host === req.headers.host; } catch { return false; }
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg) => new HttpError(400, msg);

// ---------- Sesión ----------
function setCookie(res, token, maxAgeSec) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`);
}

async function getSession(pool, req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || token.length < 30) return null;
  const { rows } = await pool.query(
    `SELECT s.id, s.owner_id, s.expires_at, s.rotated_at, u.email
       FROM diet_sessions s JOIN admin_users u ON u.id = s.owner_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`, [sha256(token)]);
  const s = rows[0];
  if (!s) return null;
  let current = token;
  // Rotación del token: se cambia como mucho una vez cada 24 h, sin alargar la caducidad.
  if (Date.now() - new Date(s.rotated_at).getTime() > ROTATE_AFTER_HOURS * 3600e3) {
    current = randomToken(32);
    await pool.query('UPDATE diet_sessions SET token_hash = $1, rotated_at = now() WHERE id = $2', [sha256(current), s.id]);
    setCookie(res, current, Math.max(60, Math.floor((new Date(s.expires_at).getTime() - Date.now()) / 1000)));
  }
  return { id: s.id, ownerId: Number(s.owner_id), email: s.email };
}

async function tooManyAttempts(pool, ip, email) {
  const { rows } = await pool.query(
    `SELECT count(*) FILTER (WHERE ip = $1) AS by_ip, count(*) FILTER (WHERE email = $2) AS by_email
       FROM login_attempts WHERE NOT success AND ts > now() - interval '15 minutes'`, [ip, email]);
  return Number(rows[0].by_ip) >= 5 || Number(rows[0].by_email) >= 8;
}

async function login(pool, req, res) {
  const ip = clientIp(req);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
  if (await tooManyAttempts(pool, ip, email)) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.');
  const { rows } = await pool.query('SELECT id, email, password_hash, totp_secret_enc FROM admin_users WHERE email = $1', [email]);
  const user = rows[0];
  const pwOk = verifyPassword(String(req.body?.password || ''), user?.password_hash);
  let step = null;
  if (user && pwOk) {
    step = verifyTotp(decrypt(user.totp_secret_enc), req.body?.code);
    if (step !== null) {
      const last = await pool.query(`SELECT value FROM settings WHERE key = 'admin_totp_last'`);
      if (step <= Number(last.rows[0]?.value ?? 0)) step = null; // un código TOTP solo vale una vez
    }
  }
  const ok = Boolean(user && pwOk && step !== null);
  await pool.query('INSERT INTO login_attempts (ip, email, success) VALUES ($1,$2,$3)', [ip, email, ok]);
  if (!ok) throw new HttpError(401, 'Datos incorrectos.');
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('admin_totp_last', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(step)]);
  const remember = req.body?.remember === false ? 0 : Number(req.body?.remember_days || 30);
  const days = remember === 0 ? 0 : REMEMBER_OPTIONS.includes(remember) ? remember : 30;
  const maxAge = days ? days * 86400 : SHORT_HOURS * 3600;
  const token = randomToken(32);
  await pool.query(
    `INSERT INTO diet_sessions (owner_id, token_hash, ip, user_agent, remember_days, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + ($6 || ' seconds')::interval)`,
    [user.id, sha256(token), ip, String(req.headers['user-agent'] || '').slice(0, 300), days, String(maxAge)]);
  setCookie(res, token, maxAge);
  return { ok: true, email: user.email, remember_days: days };
}

// ---------- Datos base ----------
let seeded = false;
async function ensureSeed(pool) {
  if (seeded) return;
  for (const f of SEED_FOODS) {
    await pool.query(
      `INSERT INTO diet_foods (owner_id, slug, name, state, basis, allergens, allergen_status, dairy, category, source)
       VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,'Borrador inicial sin valores nutricionales')
       ON CONFLICT ((COALESCE(owner_id, 0)), slug) DO NOTHING`,
      [f.slug, f.name, f.state, f.basis, f.allergens, f.allergen_status, f.dairy, f.category]);
  }
  for (const r of SEED_RECIPES) {
    await pool.query(
      `INSERT INTO diet_recipes (owner_id, slug, name, slot, ingredients, servings, prep, active_minutes, tags)
       VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ((COALESCE(owner_id, 0)), slug) DO NOTHING`,
      [r.slug, r.name, r.slot, JSON.stringify(r.ingredients), r.servings, r.prep, r.active_minutes, r.tags]);
  }
  seeded = true;
}

const mergeBySlug = (rows) => {
  const out = {};
  for (const r of rows.filter(x => x.owner_id == null)) out[r.slug] = r;
  for (const r of rows.filter(x => x.owner_id != null)) out[r.slug] = r; // lo del propietario prevalece sobre el catálogo
  return out;
};
async function loadFoods(pool, ownerId) {
  const { rows } = await pool.query('SELECT * FROM diet_foods WHERE owner_id IS NULL OR owner_id = $1', [ownerId]);
  return mergeBySlug(rows);
}
async function loadRecipes(pool, ownerId) {
  const { rows } = await pool.query('SELECT * FROM diet_recipes WHERE owner_id IS NULL OR owner_id = $1', [ownerId]);
  return mergeBySlug(rows);
}
async function loadPrices(pool, ownerId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (food_slug) food_slug, pack_net_g, pack_drained_g, price_eur, store, price_date, origin, offer, conditions
       FROM diet_food_prices WHERE owner_id = $1 ORDER BY food_slug, price_date DESC, id DESC`, [ownerId]);
  const out = {};
  for (const r of rows) out[r.food_slug] = r;
  return out;
}
async function loadProfile(pool, ownerId) {
  const { rows } = await pool.query('SELECT data, version FROM diet_profiles WHERE owner_id = $1', [ownerId]);
  return rows[0] ? { data: rows[0].data, version: rows[0].version } : { data: {}, version: 0 };
}
const publicFood = (f) => ({
  slug: f.slug, name: f.name, state: f.state, basis: f.basis, density_g_ml: f.density_g_ml == null ? null : Number(f.density_g_ml),
  unit_g: f.unit_g == null ? null : Number(f.unit_g), allergens: f.allergens, allergen_status: f.allergen_status, dairy: f.dairy,
  category: f.category, nutrients: f.nutrients, source: f.source, source_id: f.source_id, source_version: f.source_version,
  consulted_on: f.consulted_on, version: f.version, own: f.owner_id != null
});
const publicRecipe = (r) => ({
  slug: r.slug, name: r.name, slot: r.slot, ingredients: r.ingredients, prep: r.prep, active_minutes: r.active_minutes, tags: r.tags, own: r.owner_id != null
});
// Para el motor: los números llegan como cadenas desde pg.
const engineFoods = (foods) => Object.fromEntries(Object.entries(foods).map(([k, f]) => [k, {
  ...f, density_g_ml: f.density_g_ml == null ? null : Number(f.density_g_ml), unit_g: f.unit_g == null ? null : Number(f.unit_g)
}]));

async function getPlan(pool, ownerId, ws, recipes) {
  let { rows } = await pool.query('SELECT id, week_start, data, version FROM diet_plans WHERE owner_id = $1 AND week_start = $2', [ownerId, ws]);
  if (!rows[0]) {
    await pool.query(
      'INSERT INTO diet_plans (owner_id, week_start, data) VALUES ($1,$2,$3) ON CONFLICT (owner_id, week_start) DO NOTHING',
      [ownerId, ws, JSON.stringify(buildWeek(ws, recipes, addDays))]);
    rows = (await pool.query('SELECT id, week_start, data, version FROM diet_plans WHERE owner_id = $1 AND week_start = $2', [ownerId, ws])).rows;
  }
  return { id: Number(rows[0].id), week_start: ws, data: rows[0].data, version: rows[0].version };
}

const weekParam = (q) => {
  const raw = q.week || madridDate();
  if (!isYmd(raw)) throw bad('Fecha no válida');
  const ws = weekStart(raw);
  const today = weekStart(madridDate());
  const diff = Math.abs((Date.parse(ws) - Date.parse(today)) / 604800000);
  if (diff > 52) throw bad('Semana fuera de rango');
  return ws;
};

async function bootstrap(pool, s, q) {
  await ensureSeed(pool);
  const ws = weekParam(q);
  const [foods, recipes, prices, profile] = await Promise.all([loadFoods(pool, s.ownerId), loadRecipes(pool, s.ownerId), loadPrices(pool, s.ownerId), loadProfile(pool, s.ownerId)]);
  const plan = await getPlan(pool, s.ownerId, ws, recipes);
  const we = addDays(ws, 6);
  const [cons, meas, symp, pantry, checks, hist, goals] = await Promise.all([
    pool.query('SELECT id, day::text AS day, slot, meal_name, items, snapshot FROM diet_consumption_entries WHERE owner_id=$1 AND day BETWEEN $2 AND $3 ORDER BY created_at', [s.ownerId, ws, we]),
    pool.query(`SELECT id, day::text AS day, kind, weight_kg, systolic, diastolic, context FROM diet_measurements WHERE owner_id=$1 AND day >= current_date - 365 ORDER BY day, id`, [s.ownerId]),
    pool.query(`SELECT id, day::text AS day, bloating, pain, bowel, notes FROM diet_symptom_entries WHERE owner_id=$1 AND day >= current_date - 365 ORDER BY day, id`, [s.ownerId]),
    pool.query('SELECT food_slug, grams FROM diet_pantry_items WHERE owner_id=$1', [s.ownerId]),
    pool.query('SELECT food_slug, bought FROM diet_shopping_checks WHERE owner_id=$1 AND week_start=$2', [s.ownerId, ws]),
    pool.query('SELECT id, day::text AS day, meal_id, summary, undone_at, created_at FROM diet_change_history WHERE owner_id=$1 AND plan_id=$2 ORDER BY id DESC LIMIT 20', [s.ownerId, plan.id]),
    pool.query('SELECT id, nutrient, kind, value, unit, period, source, status FROM diet_goals WHERE owner_id=$1 ORDER BY id', [s.ownerId])
  ]);
  return {
    ok: true, today: madridDate(), email: s.email, week_start: ws,
    profile: profile.data, profile_version: profile.version,
    foods: Object.values(foods).map(publicFood), recipes: Object.values(recipes).map(publicRecipe),
    prices: Object.fromEntries(Object.entries(prices).map(([k, p]) => [k, { ...p, price_eur: Number(p.price_eur), pack_net_g: Number(p.pack_net_g), pack_drained_g: p.pack_drained_g == null ? null : Number(p.pack_drained_g), price_date: String(p.price_date).slice(0, 10) }])),
    plan: { id: plan.id, version: plan.version, data: plan.data },
    consumption: cons.rows, measurements: meas.rows.map(r => ({ ...r, weight_kg: r.weight_kg == null ? null : Number(r.weight_kg) })), symptoms: symp.rows,
    pantry: pantry.rows.map(r => ({ food_slug: r.food_slug, grams: Number(r.grams) })), checks: checks.rows,
    history: hist.rows, goals: goals.rows.map(g => ({ ...g, value: g.value == null ? null : Number(g.value) })),
    tolerances: { ...DEFAULT_TOLERANCES, ...(profile.data.tolerances || {}) }
  };
}

// ---------- Validación ----------
const num = (v, min, max, name) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`${name} no válido`);
  return n;
};
const slugOk = (s) => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s);
const keyOk = (s) => typeof s === 'string' && /^[A-Za-z0-9:_-]{8,80}$/.test(s);
function cleanItems(items, foods) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) throw bad('Lista de alimentos no válida');
  return items.map(it => {
    if (!slugOk(it.food) || !foods[it.food]) throw bad('Alimento desconocido');
    const out = { food: it.food };
    if (it.g != null) out.g = num(it.g, 0, 5000, 'Gramos');
    else if (it.units != null) out.units = num(it.units, 0, 50, 'Unidades');
    else if (it.ml != null) out.ml = num(it.ml, 0, 5000, 'Mililitros');
    else throw bad('Falta la cantidad');
    return out;
  });
}

function evaluateMeal(meal, newItems, foods, profile, tol) {
  const restr = checkRestrictions(newItems, foods, profile);
  const o = computeItems(meal.items, foods);
  const a = computeItems(newItems, foods);
  return { restr, o, a, cls: classifyAlternative(o, a, restr, tol) };
}

function findMeal(plan, day, mealId) {
  const d = plan.data.days?.[day];
  const m = d?.meals?.find(x => x.id === mealId);
  if (!m) throw bad('Comida no encontrada');
  return m;
}

const PRACTICAL_FACTORS = [0.8, 0.9, 1, 1.1, 1.2];

async function swapCandidates(pool, s, body) {
  const ws = weekParam({ week: body.week });
  const [foods0, recipes, prices, profile] = await Promise.all([loadFoods(pool, s.ownerId), loadRecipes(pool, s.ownerId), loadPrices(pool, s.ownerId), loadProfile(pool, s.ownerId)]);
  const foods = engineFoods(foods0);
  const plan = await getPlan(pool, s.ownerId, ws, recipes);
  if (!isYmd(body.day)) throw bad('Fecha no válida');
  const meal = findMeal(plan, body.day, String(body.meal_id));
  const mode = String(body.mode || 'todas');
  const tol = { ...DEFAULT_TOLERANCES, ...(profile.data.tolerances || {}) };
  const pantry = new Set((await pool.query('SELECT food_slug FROM diet_pantry_items WHERE owner_id=$1 AND grams > 0', [s.ownerId])).rows.map(r => r.food_slug));
  const origCost = costItems(meal.items, foods, prices);
  const origRecipe = recipes[meal.recipe];
  const out = [];
  for (const r of Object.values(recipes)) {
    if (r.slot !== meal.slot || r.slug === meal.recipe) continue;
    const items = r.ingredients;
    if (mode === 'rapido' && !(origRecipe?.active_minutes != null && r.active_minutes != null && r.active_minutes < origRecipe.active_minutes)) continue;
    if (mode === 'taper' && !r.tags.includes('táper')) continue;
    if (mode === 'sin-cocinar' && !r.tags.includes('sin-cocinar')) continue;
    const cost = costItems(items, foods, prices);
    if (mode === 'barato' && !(origCost.complete && cost.complete && cost.value < origCost.value)) continue;
    const inPantry = items.filter(i => pantry.has(i.food)).length;
    if (mode === 'despensa' && inPantry === 0) continue;
    const ev = evaluateMeal(meal, items, foods, profile.data, tol);
    out.push({ recipe: r.slug, name: r.name, minutes: r.active_minutes, status: ev.cls.status, notes: ev.cls.notes, dims: ev.cls.dims, in_pantry: inPantry, ingredients: items, cost: { value: cost.value, complete: cost.complete }, factors: PRACTICAL_FACTORS });
  }
  const rank = { dentro: 0, con_diferencias: 1, datos_insuficientes: 2, no_compatible: 3 };
  out.sort((a, b) => rank[a.status] - rank[b.status]);
  return { ok: true, meal, candidates: out.filter(c => c.status !== 'no_compatible'), excluded: out.filter(c => c.status === 'no_compatible').map(c => ({ name: c.name, notes: c.notes })) };
}

async function swapApply(pool, s, body) {
  const ws = weekParam({ week: body.week });
  if (!keyOk(body.client_key)) throw bad('Clave de operación no válida');
  const [foods0, recipes, profile] = await Promise.all([loadFoods(pool, s.ownerId), loadRecipes(pool, s.ownerId), loadProfile(pool, s.ownerId)]);
  const foods = engineFoods(foods0);
  const plan = await getPlan(pool, s.ownerId, ws, recipes);
  if (Number(body.version) !== plan.version) throw new HttpError(409, 'El plan cambió en otro dispositivo. Recarga y vuelve a intentarlo.');
  const meal = findMeal(plan, body.day, String(body.meal_id));
  if (meal.locked) throw bad('La comida está bloqueada');
  const r = recipes[String(body.recipe)];
  if (!r || r.slot !== meal.slot) throw bad('Receta no válida para esta toma');
  const factor = Number(body.factor ?? 1);
  if (!PRACTICAL_FACTORS.includes(factor)) throw bad('Ajuste de cantidad no válido');
  const items = factor === 1 ? r.ingredients : scaleItems(r.ingredients, factor);
  const tol = { ...DEFAULT_TOLERANCES, ...(profile.data.tolerances || {}) };
  const ev = evaluateMeal(meal, items, foods, profile.data, tol); // se vuelve a validar en servidor tras redondear
  if (ev.cls.status === 'no_compatible') throw bad('La alternativa vulnera una restricción firme');
  if (ev.restr.pending.length && body.accept_pending !== true) throw bad('Hay datos pendientes de confirmar; acéptalos explícitamente');
  const dup = await pool.query('SELECT 1 FROM diet_change_history WHERE owner_id=$1 AND summary LIKE $2', [s.ownerId, `%[${body.client_key}]`]);
  if (dup.rows[0]) return { ok: true, duplicate: true };
  const before = { ...meal };
  const after = { ...meal, recipe: r.slug, name: r.name, items };
  const data = JSON.parse(JSON.stringify(plan.data));
  const idx = data.days[body.day].meals.findIndex(m => m.id === meal.id);
  data.days[body.day].meals[idx] = after;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query('UPDATE diet_plans SET data=$1, version=version+1, updated_at=now() WHERE id=$2 AND version=$3', [JSON.stringify(data), plan.id, plan.version]);
    if (!upd.rowCount) throw new HttpError(409, 'El plan cambió en otro dispositivo. Recarga y vuelve a intentarlo.');
    await client.query(
      'INSERT INTO diet_change_history (owner_id, plan_id, day, meal_id, summary, before, after) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [s.ownerId, plan.id, body.day, meal.id, `${meal.name} → ${r.name} [${body.client_key}]`, JSON.stringify(before), JSON.stringify(after)]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
  return { ok: true };
}

async function swapUndo(pool, s, body) {
  const id = num(body.history_id, 1, 1e12, 'Historial');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, plan_id, day::text AS day, meal_id, before FROM diet_change_history WHERE id=$1 AND owner_id=$2 AND undone_at IS NULL FOR UPDATE', [id, s.ownerId]);
    const h = rows[0];
    if (!h) throw bad('Cambio no encontrado o ya deshecho');
    const { rows: pr } = await client.query('SELECT id, data FROM diet_plans WHERE id=$1 AND owner_id=$2 FOR UPDATE', [h.plan_id, s.ownerId]);
    const data = pr[0].data;
    const idx = data.days[h.day]?.meals.findIndex(m => m.id === h.meal_id);
    if (idx == null || idx < 0) throw bad('Comida no encontrada');
    data.days[h.day].meals[idx] = h.before;
    await client.query('UPDATE diet_plans SET data=$1, version=version+1, updated_at=now() WHERE id=$2', [JSON.stringify(data), h.plan_id]);
    await client.query('UPDATE diet_change_history SET undone_at=now() WHERE id=$1', [id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
  return { ok: true };
}

async function toggleLock(pool, s, body) {
  const ws = weekParam({ week: body.week });
  const recipes = await loadRecipes(pool, s.ownerId);
  const plan = await getPlan(pool, s.ownerId, ws, recipes);
  if (Number(body.version) !== plan.version) throw new HttpError(409, 'El plan cambió en otro dispositivo. Recarga.');
  const meal = findMeal(plan, body.day, String(body.meal_id));
  const data = JSON.parse(JSON.stringify(plan.data));
  const m = data.days[body.day].meals.find(x => x.id === meal.id);
  m.locked = !m.locked;
  const upd = await pool.query('UPDATE diet_plans SET data=$1, version=version+1, updated_at=now() WHERE id=$2 AND version=$3', [JSON.stringify(data), plan.id, plan.version]);
  if (!upd.rowCount) throw new HttpError(409, 'El plan cambió en otro dispositivo. Recarga.');
  return { ok: true };
}

// ---------- Registro de lo consumido ----------
async function consume(pool, s, body) {
  if (!isYmd(body.day)) throw bad('Fecha no válida');
  if (!keyOk(body.client_key)) throw bad('Clave de operación no válida');
  const slot = String(body.slot || '');
  if (!['desayuno', 'mediamanana', 'comida', 'merienda', 'cena', 'otro'].includes(slot)) throw bad('Toma no válida');
  const foods = engineFoods(await loadFoods(pool, s.ownerId));
  const items = cleanItems(body.items, foods);
  const res = computeItems(items, foods);
  // Instantánea: lo registrado no cambia si luego se edita la ficha del alimento.
  const snapshot = {
    computed: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { value: v.value, complete: v.complete, missing: v.missing }])),
    foods: Object.fromEntries(items.map(i => [i.food, { name: foods[i.food].name, version: foods[i.food].version, nutrients: foods[i.food].nutrients, source: foods[i.food].source }])),
    taken_at: new Date().toISOString()
  };
  const r = await pool.query(
    `INSERT INTO diet_consumption_entries (owner_id, day, slot, meal_name, items, snapshot, client_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (owner_id, client_key) DO NOTHING RETURNING id`,
    [s.ownerId, body.day, slot, String(body.meal_name || '').slice(0, 120), JSON.stringify(items), JSON.stringify(snapshot), body.client_key]);
  return { ok: true, duplicate: !r.rows[0] };
}

// ---------- Alimentos, precios, despensa ----------
async function saveFood(pool, s, body) {
  const foods = await loadFoods(pool, s.ownerId);
  const base = foods[String(body.slug)];
  if (!base) throw bad('Alimento no encontrado');
  const nutrients = {};
  for (const [k, e] of Object.entries(body.nutrients || {})) {
    if (!NUTRIENT_KEYS.has(k)) throw bad(`Nutriente desconocido: ${k}`);
    if (e == null || e.v == null || e.v === '') continue; // desconocido: no se guarda (null no es 0)
    const q = QUALITIES.includes(e.q) ? e.q : 'available';
    const v = num(e.v, 0, 100000, `Valor de ${k}`);
    if (q === 'unknown') continue;
    nutrients[k] = { v, q, src: String(e.src || body.source || '').slice(0, 200) };
  }
  const unit_g = body.unit_g === '' || body.unit_g == null ? null : num(body.unit_g, 0.1, 5000, 'Peso por unidad');
  const density = body.density_g_ml === '' || body.density_g_ml == null ? null : num(body.density_g_ml, 0.1, 5, 'Densidad');
  const dairy = ['none', 'lactose_free', 'with_lactose', 'unknown'].includes(body.dairy) ? body.dairy : base.dairy;
  const allergenStatus = body.allergen_status === 'known' ? 'known' : 'unknown';
  const allergens = Array.isArray(body.allergens) ? body.allergens.map(a => String(a).toLowerCase().slice(0, 40)).slice(0, 20) : base.allergens;
  await pool.query(
    `INSERT INTO diet_foods (owner_id, slug, name, state, basis, density_g_ml, unit_g, allergens, allergen_status, dairy, category, nutrients, source, source_id, source_version, consulted_on, version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1)
     ON CONFLICT ((COALESCE(owner_id, 0)), slug) DO UPDATE SET density_g_ml=EXCLUDED.density_g_ml, unit_g=EXCLUDED.unit_g, allergens=EXCLUDED.allergens,
       allergen_status=EXCLUDED.allergen_status, dairy=EXCLUDED.dairy, nutrients=EXCLUDED.nutrients, source=EXCLUDED.source, source_id=EXCLUDED.source_id,
       source_version=EXCLUDED.source_version, consulted_on=EXCLUDED.consulted_on, version=diet_foods.version+1, updated_at=now()`,
    [s.ownerId, base.slug, base.name, base.state, base.basis, density, unit_g, allergens, allergenStatus, dairy, base.category, JSON.stringify(nutrients),
      String(body.source || '').slice(0, 300) || null, String(body.source_id || '').slice(0, 120) || null, String(body.source_version || '').slice(0, 80) || null,
      isYmd(body.consulted_on) ? body.consulted_on : null]);
  return { ok: true };
}

async function savePrice(pool, s, body) {
  const foods = await loadFoods(pool, s.ownerId);
  if (!foods[String(body.food_slug)]) throw bad('Alimento desconocido');
  await pool.query(
    `INSERT INTO diet_food_prices (owner_id, food_slug, pack_net_g, pack_drained_g, price_eur, store, price_date, origin, offer, conditions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',$8,$9)`,
    [s.ownerId, body.food_slug, num(body.pack_net_g, 1, 100000, 'Contenido neto'),
      body.pack_drained_g ? num(body.pack_drained_g, 1, 100000, 'Peso escurrido') : null,
      num(body.price_eur, 0, 10000, 'Precio'), String(body.store || '').slice(0, 80) || null,
      isYmd(body.price_date) ? body.price_date : madridDate(), body.offer === true, String(body.conditions || '').slice(0, 200) || null]);
  return { ok: true };
}

async function savePantry(pool, s, body) {
  const foods = await loadFoods(pool, s.ownerId);
  if (!foods[String(body.food_slug)]) throw bad('Alimento desconocido');
  await pool.query(
    `INSERT INTO diet_pantry_items (owner_id, food_slug, grams) VALUES ($1,$2,$3)
     ON CONFLICT (owner_id, food_slug) DO UPDATE SET grams=EXCLUDED.grams, updated_at=now()`,
    [s.ownerId, body.food_slug, num(body.grams, 0, 100000, 'Gramos')]);
  return { ok: true };
}

async function saveCheck(pool, s, body) {
  const ws = weekParam({ week: body.week });
  const foods = await loadFoods(pool, s.ownerId);
  if (!foods[String(body.food_slug)]) throw bad('Alimento desconocido');
  await pool.query(
    `INSERT INTO diet_shopping_checks (owner_id, week_start, food_slug, bought) VALUES ($1,$2,$3,$4)
     ON CONFLICT (owner_id, week_start, food_slug) DO UPDATE SET bought=EXCLUDED.bought`,
    [s.ownerId, ws, body.food_slug, body.bought !== false]);
  return { ok: true };
}

// ---------- Perfil ----------
const PROFILE_FIELDS = ['birth_date', 'height_cm', 'weight_kg', 'weight_date', 'goal', 'activity', 'milk_status', 'excluded', 'conditions_note', 'digestive_note',
  'weekly_budget_eur', 'diners', 'stores', 'disliked', 'cook_minutes', 'equipment', 'meal_times', 'tolerances', 'weight_goal_note'];
async function saveProfile(pool, s, body) {
  const input = body.data && typeof body.data === 'object' ? body.data : {};
  const data = {};
  for (const k of PROFILE_FIELDS) if (k in input) data[k] = input[k];
  if (data.milk_status && !['unknown', 'lactose_intolerance', 'milk_protein_allergy', 'none'].includes(data.milk_status)) throw bad('Estado de leche no válido');
  if (data.birth_date && !isYmd(data.birth_date)) throw bad('Fecha de nacimiento no válida');
  if (data.weight_date && !isYmd(data.weight_date)) throw bad('Fecha de peso no válida');
  for (const [k, lo, hi] of [['height_cm', 100, 250], ['weight_kg', 30, 400], ['weekly_budget_eur', 0, 5000], ['diners', 1, 20], ['cook_minutes', 0, 600]]) {
    if (data[k] === '' || data[k] == null) delete data[k];
    else data[k] = num(data[k], lo, hi, k);
  }
  if (data.excluded != null) data.excluded = (Array.isArray(data.excluded) ? data.excluded : String(data.excluded).split(',')).map(x => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 50);
  for (const k of ['conditions_note', 'digestive_note', 'weight_goal_note', 'stores', 'disliked', 'equipment']) if (data[k] != null) data[k] = String(data[k]).slice(0, 500);
  if (data.tolerances) {
    const t = {};
    for (const k of Object.keys(DEFAULT_TOLERANCES)) if (data.tolerances[k] != null && data.tolerances[k] !== '') t[k] = num(data.tolerances[k], 0, 100, k);
    data.tolerances = t;
  }
  const cur = await loadProfile(pool, s.ownerId);
  if (cur.version && Number(body.version) !== cur.version) throw new HttpError(409, 'El perfil cambió en otro dispositivo. Recarga.');
  const merged = { ...cur.data, ...data };
  if (cur.version) {
    const u = await pool.query('UPDATE diet_profiles SET data=$1, version=version+1, updated_at=now() WHERE owner_id=$2 AND version=$3', [JSON.stringify(merged), s.ownerId, cur.version]);
    if (!u.rowCount) throw new HttpError(409, 'El perfil cambió en otro dispositivo. Recarga.');
  } else {
    await pool.query('INSERT INTO diet_profiles (owner_id, data) VALUES ($1,$2) ON CONFLICT (owner_id) DO NOTHING', [s.ownerId, JSON.stringify(merged)]);
  }
  return { ok: true };
}

async function saveGoal(pool, s, body) {
  const nutrient = String(body.nutrient || '');
  if (!NUTRIENT_KEYS.has(nutrient) && nutrient !== 'salt') throw bad('Nutriente no válido');
  const kind = ['objetivo', 'minimo', 'maximo', 'referencia'].includes(body.kind) ? body.kind : null;
  if (!kind) throw bad('Tipo no válido');
  const unit = String(body.unit || '').slice(0, 10);
  await pool.query(
    `INSERT INTO diet_goals (owner_id, nutrient, kind, value, unit, period, source, status) VALUES ($1,$2,$3,$4,$5,'dia',$6,'introducido')`,
    [s.ownerId, nutrient, kind, num(body.value, 0, 100000, 'Valor'), unit, String(body.source || '').slice(0, 200) || null]);
  return { ok: true };
}
async function deleteGoal(pool, s, body) {
  await pool.query('DELETE FROM diet_goals WHERE id=$1 AND owner_id=$2', [num(body.id, 1, 1e12, 'Objetivo'), s.ownerId]);
  return { ok: true };
}

// ---------- Seguimiento ----------
async function saveMeasure(pool, s, body) {
  if (!isYmd(body.day)) throw bad('Fecha no válida');
  if (!keyOk(body.client_key)) throw bad('Clave de operación no válida');
  if (body.kind === 'peso') {
    await pool.query('INSERT INTO diet_measurements (owner_id, day, kind, weight_kg, context, client_key) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (owner_id, client_key) DO NOTHING',
      [s.ownerId, body.day, 'peso', num(body.weight_kg, 20, 500, 'Peso'), String(body.context || '').slice(0, 200) || null, body.client_key]);
  } else if (body.kind === 'tension') {
    await pool.query('INSERT INTO diet_measurements (owner_id, day, kind, systolic, diastolic, context, client_key) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (owner_id, client_key) DO NOTHING',
      [s.ownerId, body.day, 'tension', Math.round(num(body.systolic, 50, 300, 'Sistólica')), Math.round(num(body.diastolic, 30, 200, 'Diastólica')), String(body.context || '').slice(0, 200) || null, body.client_key]);
  } else throw bad('Tipo no válido');
  return { ok: true };
}
async function saveSymptom(pool, s, body) {
  if (!isYmd(body.day)) throw bad('Fecha no válida');
  if (!keyOk(body.client_key)) throw bad('Clave de operación no válida');
  const opt = (v) => (v === '' || v == null ? null : Math.round(num(v, 0, 10, 'Escala')));
  await pool.query('INSERT INTO diet_symptom_entries (owner_id, day, bloating, pain, bowel, notes, client_key) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (owner_id, client_key) DO NOTHING',
    [s.ownerId, body.day, opt(body.bloating), opt(body.pain), String(body.bowel || '').slice(0, 80) || null, String(body.notes || '').slice(0, 300) || null, body.client_key]);
  return { ok: true };
}
async function deleteRow(pool, s, body) {
  const table = { consumption: 'diet_consumption_entries', measurement: 'diet_measurements', symptom: 'diet_symptom_entries' }[body.table];
  if (!table) throw bad('Tabla no válida');
  await pool.query(`DELETE FROM ${table} WHERE id=$1 AND owner_id=$2`, [num(body.id, 1, 1e12, 'Registro'), s.ownerId]);
  return { ok: true };
}

// ---------- Exportar / borrar ----------
const OWNED = ['diet_profiles', 'diet_goals', 'diet_food_prices', 'diet_plans', 'diet_consumption_entries', 'diet_measurements', 'diet_symptom_entries', 'diet_pantry_items', 'diet_shopping_checks', 'diet_change_history'];
async function exportAll(pool, s) {
  const out = { exported_at: new Date().toISOString() };
  for (const t of OWNED) out[t] = (await pool.query(`SELECT * FROM ${t} WHERE owner_id=$1`, [s.ownerId])).rows;
  out.diet_foods = (await pool.query('SELECT * FROM diet_foods WHERE owner_id=$1', [s.ownerId])).rows;
  out.diet_recipes = (await pool.query('SELECT * FROM diet_recipes WHERE owner_id=$1', [s.ownerId])).rows;
  return out;
}
const CONFIRM = 'BORRAR MIS DATOS DE DIETA';
async function deleteAll(pool, s, body) {
  if (body.confirm !== CONFIRM) throw bad(`Escribe exactamente «${CONFIRM}» para confirmar`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of [...OWNED.filter(t => t !== 'diet_change_history' && t !== 'diet_plans'), 'diet_change_history', 'diet_plans', 'diet_foods', 'diet_recipes']) {
      await client.query(`DELETE FROM ${t} WHERE owner_id=$1`, [s.ownerId]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  return { ok: true };
}

async function listSessions(pool, s) {
  const { rows } = await pool.query(
    `SELECT id, ip, user_agent, remember_days, created_at, expires_at FROM diet_sessions WHERE owner_id=$1 AND revoked_at IS NULL AND expires_at > now() ORDER BY id DESC`, [s.ownerId]);
  return { ok: true, sessions: rows.map(r => ({ ...r, current: Number(r.id) === s.id })) };
}

// ---------- Enrutador ----------
const POST_ROUTES = {
  'swap/candidates': swapCandidates, 'swap/apply': swapApply, 'swap/undo': swapUndo, 'meal/lock': toggleLock,
  consume, 'food/save': saveFood, 'price/save': savePrice, 'pantry/save': savePantry, 'shopping/check': saveCheck,
  'profile/save': saveProfile, 'goal/save': saveGoal, 'goal/delete': deleteGoal, 'measure/save': saveMeasure, 'symptom/save': saveSymptom,
  'row/delete': deleteRow, 'data/delete': deleteAll
};

export async function dietaHandler(req, res, route) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (status, body) => res.status(status).send(JSON.stringify(body));
  try {
    const pool = getPool();
    const sub = route.replace(/^dieta\/?/, '');
    if (req.method === 'POST' && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'dieta')) throw new HttpError(403, 'Origen no permitido');
    if (sub === 'login') {
      if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido');
      return send(200, await login(pool, req, res));
    }
    const session = await getSession(pool, req, res);
    if (!session) return send(401, { ok: false, error: 'No autenticado' });
    if (sub === 'logout' && req.method === 'POST') {
      await pool.query('UPDATE diet_sessions SET revoked_at=now() WHERE id=$1', [session.id]);
      setCookie(res, '', 0);
      return send(200, { ok: true });
    }
    if (sub === 'logout-all' && req.method === 'POST') {
      await pool.query('UPDATE diet_sessions SET revoked_at=now() WHERE owner_id=$1 AND revoked_at IS NULL', [session.ownerId]);
      setCookie(res, '', 0);
      return send(200, { ok: true });
    }
    if (req.method === 'GET') {
      if (sub === 'bootstrap') return send(200, await bootstrap(pool, session, req.query));
      if (sub === 'export') {
        res.setHeader('Content-Disposition', 'attachment; filename="dieta-export.json"');
        return send(200, await exportAll(pool, session));
      }
      if (sub === 'sessions') return send(200, await listSessions(pool, session));
      throw new HttpError(404, 'No encontrado');
    }
    if (req.method === 'POST') {
      const fn = POST_ROUTES[sub];
      if (!fn) throw new HttpError(404, 'No encontrado');
      await ensureSeed(pool);
      return send(200, await fn(pool, session, req.body || {}));
    }
    throw new HttpError(405, 'Método no permitido');
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { ok: false, error: e.message });
    console.error('dieta:', e.message); // sin datos personales ni de salud en los logs
    return send(500, { ok: false, error: 'Error interno' });
  }
}
