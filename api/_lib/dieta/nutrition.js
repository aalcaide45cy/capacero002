// Motor nutricional determinista del módulo /dieta. Sin dependencias, sin acceso a red ni a base de datos.
// Regla de oro: un dato desconocido (null) NUNCA es 0. El estado «incompleto» se propaga de alimento a comida, día y semana.

export const NUTRIENTS = [
  { key: 'kcal', label: 'Energía', unit: 'kcal', core: true },
  { key: 'protein', label: 'Proteína', unit: 'g', core: true },
  { key: 'carbs', label: 'Hidratos de carbono', unit: 'g', core: true },
  { key: 'fat', label: 'Grasa total', unit: 'g', core: true },
  { key: 'satfat', label: 'Grasa saturada', unit: 'g', core: true },
  { key: 'fiber', label: 'Fibra', unit: 'g', core: true },
  { key: 'sugars', label: 'Azúcares totales', unit: 'g', core: false },
  { key: 'sodium', label: 'Sodio', unit: 'mg', core: true },
  { key: 'calcium', label: 'Calcio', unit: 'mg', core: false },
  { key: 'iron', label: 'Hierro', unit: 'mg', core: false },
  { key: 'iodine', label: 'Yodo', unit: 'µg', core: false },
  { key: 'vitD', label: 'Vitamina D', unit: 'µg', core: false },
  { key: 'vitB12', label: 'Vitamina B12', unit: 'µg', core: false },
  { key: 'folate', label: 'Folato', unit: 'µg', core: false },
  { key: 'vitC', label: 'Vitamina C', unit: 'mg', core: false },
  { key: 'potassium', label: 'Potasio', unit: 'mg', core: false },
  { key: 'magnesium', label: 'Magnesio', unit: 'mg', core: false },
  { key: 'epadha', label: 'EPA+DHA', unit: 'g', core: false }
];
export const QUALITIES = ['available', 'estimated', 'zero', 'trace', 'unknown'];

/** Sal equivalente (g) = sodio (mg) × 2,5 / 1000. */
export const saltFromSodiumMg = (mg) => (mg == null ? null : (mg * 2.5) / 1000);
export const sodiumMgFromSalt = (g) => (g == null ? null : (g * 1000) / 2.5);
export const ugToMg = (ug) => ug / 1000;
export const mgToUg = (mg) => mg * 1000;

/** Valor conocido de un nutriente de un alimento (por 100 g) o null. */
export function knownValue(food, key) {
  const e = food?.nutrients?.[key];
  if (!e || e.q === 'unknown' || e.v == null) return null;
  const v = Number(e.v);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/** Gramos comestibles de una línea. Las unidades solo se convierten si el alimento tiene un peso documentado. */
export function itemGrams(item, food) {
  // Alimentos con datos por 100 ml: la cantidad base es el volumen (sin densidad si ya viene en ml).
  if (food?.basis === '100ml') {
    if (item.ml != null) return Number(item.ml);
    if (item.g != null && food.density_g_ml) return Number(item.g) / Number(food.density_g_ml);
    return null;
  }
  if (item.g != null && Number.isFinite(Number(item.g))) return Number(item.g);
  if (item.units != null && food?.unit_g) return Number(item.units) * Number(food.unit_g);
  // Líquidos: los ml solo se convierten a gramos con una densidad documentada.
  if (item.ml != null && food?.density_g_ml) return Number(item.ml) * Number(food.density_g_ml);
  return null;
}

/**
 * Suma una lista de líneas {food, g|units}. Devuelve por nutriente:
 *  value = subtotal conocido (sin redondear), complete = true solo si todos los ingredientes aportan dato, missing = nombres sin dato.
 */
export function computeItems(items, foods) {
  const out = {};
  for (const n of NUTRIENTS) out[n.key] = { value: 0, complete: true, missing: [] };
  for (const it of items) {
    const food = foods[it.food];
    const grams = itemGrams(it, food);
    const name = food?.name || it.food;
    for (const n of NUTRIENTS) {
      const per100 = food && grams != null ? knownValue(food, n.key) : null;
      if (per100 == null) {
        out[n.key].complete = false;
        out[n.key].missing.push(grams == null ? `${name} (sin peso comestible)` : name);
      } else {
        out[n.key].value += (per100 * grams) / 100;
      }
    }
  }
  out.salt = { value: saltFromSodiumMg(out.sodium.value), complete: out.sodium.complete, missing: out.sodium.missing };
  return out;
}

/** Suma varios resultados de computeItems (comidas → día → semana) propagando lo incompleto. */
export function sumResults(list) {
  const out = {};
  for (const k of [...NUTRIENTS.map(n => n.key), 'salt']) out[k] = { value: 0, complete: true, missing: [] };
  for (const r of list) {
    for (const k of Object.keys(out)) {
      out[k].value += r[k].value;
      if (!r[k].complete) out[k].complete = false;
      for (const m of r[k].missing) if (!out[k].missing.includes(m)) out[k].missing.push(m);
    }
  }
  return out;
}

export const round = (v, d = 1) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Texto para mostrar: «Calcio: 120 mg» o «Calcio conocido: 120 mg; faltan datos de …». */
export function describe(label, unit, r, d = 1) {
  if (r.complete) return `${label}: ${round(r.value, d)} ${unit}`;
  if (r.value === 0 && r.missing.length) return `${label}: sin datos (${r.missing.slice(0, 3).join(', ')})`;
  return `${label} conocido: ${round(r.value, d)} ${unit}; faltan datos de ${r.missing.slice(0, 3).join(', ')}`;
}

// ---------- Restricciones firmes ----------
/**
 * Comprueba una lista de líneas contra el perfil.
 * Devuelve {violations:[], pending:[]}. violations = no compatible. pending = no se puede confirmar (datos o aclaración pendientes).
 */
export function checkRestrictions(items, foods, profile = {}) {
  const violations = [];
  const pending = [];
  const excluded = new Set(['kiwi', ...(profile.excluded || []).map(s => String(s).toLowerCase())]);
  const milk = profile.milk_status || 'unknown'; // unknown | lactose_intolerance | milk_protein_allergy | none
  for (const it of items) {
    const f = foods[it.food];
    if (!f) { pending.push(`${it.food}: alimento no encontrado`); continue; }
    const tags = [f.slug, f.name, ...(f.allergens || [])].map(s => String(s).toLowerCase());
    for (const ex of excluded) {
      if (tags.some(t => t === ex || t.includes(ex))) violations.push(`${f.name}: contiene «${ex}», excluido`);
    }
    if (f.dairy && f.dairy !== 'none') {
      if (milk === 'milk_protein_allergy') violations.push(`${f.name}: lácteo y consta alergia a proteínas de leche`);
      else if (milk === 'unknown') pending.push(`${f.name}: lácteo pendiente de aclarar si es lactosa o alergia a proteínas de leche`);
      else if (milk === 'lactose_intolerance' && f.dairy === 'with_lactose') violations.push(`${f.name}: contiene lactosa`);
      else if (milk === 'lactose_intolerance' && f.dairy === 'unknown') pending.push(`${f.name}: no consta si es sin lactosa`);
    }
    if (f.allergen_status !== 'known') pending.push(`${f.name}: alérgenos sin comprobar en etiqueta`);
  }
  return { violations, pending };
}

// ---------- Comparación de alternativas ----------
export const DEFAULT_TOLERANCES = {
  kcalPct: 5,
  proteinAbsG: 5,
  carbsPct: 10, carbsAbsG: 5,
  fatPct: 10, fatAbsG: 3
};

function within(a, b, pct, abs) {
  const diff = Math.abs(a - b);
  const allowed = Math.max(abs ?? 0, (pct / 100) * Math.abs(b));
  return diff <= allowed + 1e-9;
}

/**
 * Compara una alternativa con la comida original. Estados:
 *  dentro | con_diferencias | datos_insuficientes | no_compatible
 */
export function classifyAlternative(origRes, altRes, restr, tol = DEFAULT_TOLERANCES) {
  if (restr.violations.length) return { status: 'no_compatible', notes: restr.violations, dims: {} };
  const dims = {};
  const notes = [];
  const rules = {
    kcal: (a, b) => within(a, b, tol.kcalPct, 0),
    protein: (a, b) => Math.abs(a - b) <= tol.proteinAbsG + 1e-9,
    carbs: (a, b) => within(a, b, tol.carbsPct, tol.carbsAbsG),
    fat: (a, b) => within(a, b, tol.fatPct, tol.fatAbsG)
  };
  let insufficient = false;
  let different = false;
  for (const [k, rule] of Object.entries(rules)) {
    const o = origRes[k], a = altRes[k];
    if (!o.complete || !a.complete) {
      dims[k] = 'sin_datos'; insufficient = true;
      notes.push(`${k}: faltan datos (${[...o.missing, ...a.missing].slice(0, 3).join(', ')})`);
    } else {
      const ok = rule(a.value, o.value);
      dims[k] = ok ? 'ok' : 'difiere';
      if (!ok) different = true;
    }
  }
  if (restr.pending.length) { insufficient = true; notes.push(...restr.pending); }
  const status = different ? 'con_diferencias' : insufficient ? 'datos_insuficientes' : 'dentro';
  // Si ya difiere en algo medible pero faltan otros datos, se indica que además hay datos incompletos.
  if (different && insufficient) notes.push('Además hay dimensiones sin datos suficientes.');
  return { status, notes, dims };
}

// ---------- Cantidades prácticas ----------
export function roundGrams(g, step = 5) {
  if (g == null) return null;
  return Math.max(step, Math.round(g / step) * step);
}
export function roundUnits(u) {
  return Math.max(1, Math.round(u));
}

/** Escala una lista de líneas por un factor, redondeando a cantidades prácticas (huevos por unidades). */
export function scaleItems(items, factor) {
  return items.map(it => it.units != null
    ? { ...it, units: roundUnits(it.units * factor) }
    : { ...it, g: roundGrams(it.g * factor, it.g >= 50 ? 10 : 5) });
}

// ---------- Fechas locales (Europe/Madrid) ----------
/** Fecha local 'YYYY-MM-DD' de un instante, en Europe/Madrid. */
export function madridDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
/** Suma días a una fecha 'YYYY-MM-DD' sin pasar por zonas horarias (aritmética en UTC puro). */
export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
/** Lunes de la semana de una fecha 'YYYY-MM-DD'. */
export function weekStart(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addDays(ymd, -((dow + 6) % 7));
}
export const isYmd = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rechaza 30/02
};

// ---------- Compra ----------
/** Agrega gramos por alimento de una lista de líneas. Las líneas sin peso se listan aparte. */
export function aggregateShopping(items, foods) {
  const map = {};
  const noWeight = [];
  for (const it of items) {
    const f = foods[it.food];
    const g = itemGrams(it, f);
    if (g == null) { noWeight.push(f?.name || it.food); continue; }
    const key = `${it.food}`;
    map[key] = (map[key] || 0) + g;
  }
  return { map, noWeight };
}

/** Precio por gramo útil de un envase (usa el peso escurrido si existe). */
export function packInfo(price) {
  const g = Number(price.pack_drained_g || price.pack_net_g);
  return { pricePerG: Number(price.price_eur) / g, packG: g, packPrice: Number(price.price_eur) };
}

// ---------- Coste ----------
/**
 * Coste de lo CONSUMIDO (gramos usados × precio por gramo útil del envase). Precio desconocido → incompleto, nunca 0 €.
 * prices: { food_slug: {price_eur, pack_net_g, pack_drained_g, price_date} }
 */
export function costItems(items, foods, prices) {
  let value = 0;
  const missing = [];
  for (const it of items) {
    const f = foods[it.food];
    const g = itemGrams(it, f);
    const p = prices[it.food];
    if (!p || g == null) { missing.push(f?.name || it.food); continue; }
    value += g * packInfo(p).pricePerG;
  }
  return { value, complete: missing.length === 0, missing };
}
