// Motor nutricional determinista del módulo /dieta. Sin dependencias, sin acceso a red ni a base de datos.
// Regla de oro: un dato desconocido (null) NUNCA es 0. El estado «incompleto» se propaga de alimento a comida, día y semana.

export const NUTRIENTS = [
  { key: 'kcal', label: 'Energía', unit: 'kcal', core: true, group: 'macro' },
  { key: 'protein', label: 'Proteína', unit: 'g', core: true, group: 'macro' },
  { key: 'carbs', label: 'Hidratos de carbono', unit: 'g', core: true, group: 'macro' },
  { key: 'fat', label: 'Grasa total', unit: 'g', core: true, group: 'macro' },
  { key: 'satfat', label: 'Grasa saturada', unit: 'g', core: true, group: 'macro' },
  { key: 'fiber', label: 'Fibra', unit: 'g', core: true, group: 'macro', ref: 25 },
  { key: 'sugars', label: 'Azúcares totales', unit: 'g', core: false, group: 'macro' },
  { key: 'sodium', label: 'Sodio', unit: 'mg', core: true, group: 'macro' },
  { key: 'epadha', label: 'Omega 3 (EPA+DHA)', unit: 'g', core: false, group: 'macro', d: 2, ref: 0.25 },
  { key: 'calcium', label: 'Calcio', unit: 'mg', group: 'mineral', ref: 800 },
  { key: 'iron', label: 'Hierro', unit: 'mg', group: 'mineral', ref: 14 },
  { key: 'magnesium', label: 'Magnesio', unit: 'mg', group: 'mineral', ref: 375 },
  { key: 'phosphorus', label: 'Fósforo', unit: 'mg', group: 'mineral', ref: 700 },
  { key: 'potassium', label: 'Potasio', unit: 'mg', group: 'mineral', ref: 2000 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', ref: 10 },
  { key: 'selenium', label: 'Selenio', unit: 'µg', group: 'mineral', ref: 55 },
  { key: 'iodine', label: 'Yodo', unit: 'µg', group: 'mineral', ref: 150 },
  { key: 'vitA', label: 'Vitamina A (RAE)', unit: 'µg', group: 'vitamina', ref: 800 },
  { key: 'vitC', label: 'Vitamina C', unit: 'mg', group: 'vitamina', ref: 80 },
  { key: 'vitD', label: 'Vitamina D', unit: 'µg', group: 'vitamina', ref: 5 },
  { key: 'vitE', label: 'Vitamina E', unit: 'mg', group: 'vitamina', ref: 12 },
  { key: 'vitK', label: 'Vitamina K', unit: 'µg', group: 'vitamina', ref: 75 },
  { key: 'vitB1', label: 'Tiamina (B1)', unit: 'mg', group: 'vitamina', ref: 1.1, d: 2 },
  { key: 'vitB2', label: 'Riboflavina (B2)', unit: 'mg', group: 'vitamina', ref: 1.4, d: 2 },
  { key: 'vitB3', label: 'Niacina (B3)', unit: 'mg', group: 'vitamina', ref: 16 },
  { key: 'vitB6', label: 'Vitamina B6', unit: 'mg', group: 'vitamina', ref: 1.4, d: 2 },
  { key: 'folate', label: 'Folato', unit: 'µg', group: 'vitamina', ref: 200 },
  { key: 'vitB12', label: 'Vitamina B12', unit: 'µg', group: 'vitamina', ref: 2.5, d: 2 }
];
// `ref` = valores de referencia de nutrientes del Reglamento (UE) 1169/2011, anexo XIII (fibra: 25 g/día, EFSA 2010;
// EPA+DHA: 250 mg/día, EFSA 2010). Se usan SOLO como escala para
// decidir si una diferencia entre dos platos es relevante; no son las necesidades personales de nadie.
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
  // Avisos de «consumo ocasional» por el contexto de tensión, hígado graso y triglicéridos (no son prohibiciones):
  // sal alta ≥ 1,5 g/100 g (≥ 600 mg de sodio) y saturadas altas ≥ 5 g/100 g, umbrales «alto» del etiquetado frontal británico (FSA).
  const warnings = [];
  for (const it of items) {
    const f = foods[it.food];
    if (!f) continue;
    const na = knownValue(f, 'sodium'); const sat = knownValue(f, 'satfat');
    if (na != null && na >= 600) warnings.push(`${f.name}: alto en sal`);
    if (sat != null && sat >= 5 && !['grasas', 'frutos secos'].includes(f.category)) warnings.push(`${f.name}: alto en grasa saturada`);
  }
  return { violations, pending, warnings };
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
  if (restr.pending.length) notes.push(...restr.pending);
  if (restr.pending.some(p => /lácteo pendiente/.test(p))) insufficient = true;
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

// ---------- Micronutrientes: diferencias relevantes entre dos platos ----------
/**
 * Compara vitaminas, minerales, fibra y omega 3 de la alternativa frente al original.
 * Una bajada es «relevante» si supera el 15 % del valor de referencia de etiquetado Y además el 30 % de lo que aportaba el original.
 * Devuelve {drops, gains, unknown}: unknown = nutrientes que no se pueden comparar por falta de datos.
 */
export function microDiff(origRes, altRes) {
  const drops = []; const gains = []; const unknown = [];
  const refs = NUTRIENTS.filter(n => n.ref);
  for (const n of refs) {
    const o = origRes[n.key], a = altRes[n.key];
    if (!o.complete || !a.complete) { unknown.push(n.label); continue; }
    const diff = a.value - o.value;
    const pctRef = Math.abs(diff) / n.ref;
    if (pctRef < 0.15) continue;
    const entry = { key: n.key, label: n.label, unit: n.unit, from: o.value, to: a.value, pctRef: Math.round(pctRef * 100) };
    if (diff < 0 && -diff > 0.3 * o.value) drops.push(entry);
    else if (diff > 0) gains.push(entry);
  }
  return { drops, gains, unknown };
}

/** Distancia nutricional (0 = idéntico) para ordenar alternativas: macros + bajadas relevantes de micronutrientes. */
export function similarityScore(origRes, altRes, micro) {
  const rel = (k, floor) => (origRes[k].complete && altRes[k].complete ? Math.abs(altRes[k].value - origRes[k].value) / Math.max(origRes[k].value, floor) : 0.5);
  return rel('kcal', 100) * 2 + rel('protein', 10) * 1.5 + rel('carbs', 15) + rel('fat', 8) + micro.drops.length * 0.25 + micro.unknown.length * 0.02;
}

/**
 * Valora todas las recetas de la misma franja como alternativa a una comida. Función pura: la usan el servidor (validación) y el cliente (lista).
 * Estado final: 'equivalente' (macros dentro de márgenes y sin bajadas relevantes de vitaminas/minerales), 'dentro' (macros dentro, alguna bajada),
 * 'con_diferencias', 'datos_insuficientes', 'no_compatible'.
 */
export function rankAlternatives(meal, recipes, foods, profile = {}, tol = DEFAULT_TOLERANCES) {
  const o = computeItems(meal.items, foods);
  const out = [];
  for (const r of recipes) {
    if (r.slot !== meal.slot || r.slug === meal.recipe) continue;
    const restr = checkRestrictions(r.ingredients, foods, profile);
    const a = computeItems(r.ingredients, foods);
    const cls = classifyAlternative(o, a, restr, tol);
    const micro = microDiff(o, a);
    let status = cls.status;
    if (status === 'dentro' && micro.drops.length === 0 && restr.warnings.length === 0) status = 'equivalente';
    out.push({ recipe: r.slug, name: r.name, minutes: r.active_minutes, tags: r.tags, ingredients: r.ingredients, status, dims: cls.dims,
      notes: cls.notes, pending: restr.pending, violations: restr.violations, warnings: restr.warnings, micro,
      score: similarityScore(o, a, micro) + restr.warnings.length * 0.3, prep: r.prep,
      kcal: a.kcal, protein: a.protein, carbs: a.carbs, fat: a.fat, food: r.food, item: r.item });
  }
  const rank = { equivalente: 0, dentro: 1, con_diferencias: 2, datos_insuficientes: 3, no_compatible: 4 };
  out.sort((x, y) => rank[x.status] - rank[y.status] || x.score - y.score);
  // Variedad: dentro de cada estado se alterna el alimento principal para que no salgan veinte platos seguidos de lo mismo.
  const result = [];
  for (const st of Object.keys(rank)) {
    const buckets = new Map();
    for (const c of out) if (c.status === st) { const k = c.food || c.ingredients[0].food; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(c); }
    const lists = [...buckets.values()];
    for (let i = 0, more = true; more; i += 1) { more = false; for (const l of lists) if (l[i]) { result.push(l[i]); more = true; } }
  }
  return result;
}
