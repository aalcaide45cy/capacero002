// Generador de menús y sustituciones del módulo /dieta. Funciones puras (se usan en servidor y en el navegador).
// Método: sistema de intercambios. Cada alimento tiene un «papel» en el plato (proteína, fécula, verdura, fruta, lácteo,
// fruto seco, grasa). Una alternativa mantiene los papeles y recalcula los gramos para igualar el nutriente que ese papel
// aporta (proteína → proteína, fécula → hidratos, grasa → grasa…), y después se compara TODO: macros, vitaminas y minerales.
import { computeItems, itemGrams, knownValue } from './nutrition.js';

// ---------- Papel de cada alimento ----------
const ROLE_BY_CATEGORY = { 'lácteos': 'lacteo', cereales: 'fecula', carne: 'proteina', pescado: 'proteina', huevos: 'proteina', legumbres: 'legumbre', verdura: 'verdura', fruta: 'fruta', 'frutos secos': 'frutoseco', grasas: 'grasa' };
const ROLE_OVERRIDE = { patata: 'fecula', boniato: 'fecula', 'maiz-dulce': 'fecula', tofu: 'proteina', edamame: 'proteina', aguacate: 'grasa', hummus: 'untable', 'crema-cacahuete': 'frutoseco' };
export const roleOf = (food) => ROLE_OVERRIDE[food.slug] || ROLE_BY_CATEGORY[food.category] || 'otro';
export const ROLE_LABEL = { proteina: 'Proteína', legumbre: 'Legumbre', fecula: 'Cereal o fécula', verdura: 'Verdura', fruta: 'Fruta', lacteo: 'Lácteo o alternativa', frutoseco: 'Fruto seco', grasa: 'Grasa', untable: 'Untable', otro: 'Otro' };
// Nutriente que se iguala al sustituir un alimento por otro del mismo papel.
const ANCHOR = { proteina: 'protein', legumbre: 'protein', fecula: 'carbs', verdura: null, fruta: 'carbs', lacteo: 'protein', frutoseco: 'kcal', grasa: 'fat', untable: 'kcal', otro: 'kcal' };
// Papeles que pueden intercambiarse entre sí.
const SWAP_GROUP = { proteina: ['proteina', 'legumbre'], legumbre: ['legumbre', 'proteina'], fecula: ['fecula'], verdura: ['verdura'], fruta: ['fruta'], lacteo: ['lacteo'], frutoseco: ['frutoseco', 'grasa'], grasa: ['grasa', 'frutoseco'], untable: ['untable', 'frutoseco', 'grasa'], otro: ['otro'] };

// Nombres cortos para titular los platos.
const SHORT = {
  'leche-desnatada-sin-lactosa': 'leche desnatada', 'leche-semidesnatada-sin-lactosa': 'leche semidesnatada', 'bebida-soja-enriquecida': 'bebida de soja',
  'yogur-natural-sin-lactosa': 'yogur natural', 'yogur-griego-desnatado': 'yogur griego', 'queso-fresco-sin-lactosa': 'queso fresco', 'queso-batido': 'queso batido',
  'avena-copos': 'avena', 'arroz': 'arroz', 'pasta-integral': 'pasta integral', 'pollo-pechuga': 'pechuga de pollo', 'pollo-muslo': 'muslo de pollo', 'pavo-pechuga': 'pavo',
  'lomo-cerdo-magro': 'lomo de cerdo', 'ternera-magra': 'ternera', 'ternera-picada-magra': 'ternera picada', 'pescado-blanco': 'merluza', 'bacalao-fresco': 'bacalao',
  lenguado: 'lenguado', 'sardinas-escurridas': 'sardinas', 'atun-natural': 'atún', gambas: 'gambas', mejillones: 'mejillones', calamar: 'calamar', 'huevo-m': 'huevo',
  'clara-huevo': 'claras', tofu: 'tofu', 'lentejas-cocidas': 'lentejas', 'garbanzos-cocidos': 'garbanzos', 'alubias-cocidas': 'alubias blancas', 'alubias-rojas-cocidas': 'alubias rojas',
  'alubias-negras-cocidas': 'alubias negras', 'guisantes-cocidos': 'guisantes', 'hojas-verdes': 'lechuga', 'tomate-triturado': 'tomate triturado', esparragos: 'espárragos',
  'maiz-dulce': 'maíz', cacahuetes: 'cacahuetes', 'pipas-calabaza': 'pipas de calabaza', 'pipas-girasol': 'pipas de girasol', 'crema-cacahuete': 'crema de cacahuete', 'aceite-oliva': 'aceite de oliva'
};
export const shortName = (food) => SHORT[food.slug] || food.name.toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listEs = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);

/** Título de un plato a partir de sus alimentos: «Merluza con patata, calabacín y zanahoria». */
export function nameFromItems(items, foods, style) {
  const fs = items.map(i => foods[i.food]).filter(Boolean);
  const order = ['proteina', 'legumbre', 'lacteo', 'untable', 'fecula', 'fruta', 'verdura', 'frutoseco', 'grasa'];
  const sorted = [...fs].sort((a, b) => order.indexOf(roleOf(a)) - order.indexOf(roleOf(b)));
  const visible = sorted.filter(f => f.slug !== 'aceite-oliva');
  if (!visible.length) return 'Plato';
  const [main, ...rest] = visible;
  let head = shortName(main);
  if (main.slug === 'huevo-m' && style) head = style === 'revuelto' ? 'revuelto de huevo' : style === 'cocido' ? 'huevo cocido' : 'tortilla';
  else if (style && roleOf(main) !== 'lacteo') head += ` ${style}`;
  return cap(rest.length ? `${head} con ${listEs(rest.map(shortName))}` : head);
}

// ---------- Cantidades prácticas ----------
const stepFor = (g) => (g >= 60 ? 10 : 5);
const practical = (g, min, max) => { const c = Math.min(max, Math.max(min, g)); const st = stepFor(c); return Math.max(min, Math.round(c / st) * st); };
// Límites razonables de ración por papel (gramos en el estado del alimento). Fuera de ellos no se propone una cantidad absurda.
const BOUNDS = { proteina: [60, 250], legumbre: [100, 300], fecula: [20, 100], verdura: [50, 400], fruta: [80, 300], lacteo: [100, 300], frutoseco: [10, 40], grasa: [0, 25], untable: [20, 100], otro: [5, 300] };
const boundsFor = (food) => {
  if (food.slug === 'patata' || food.slug === 'boniato') return [100, 350];
  if (food.slug === 'maiz-dulce') return [50, 250];
  if (food.category === 'cereales' && food.state.startsWith('pan')) return [30, 120];
  if (food.slug === 'aguacate') return [30, 100];
  if (food.slug === 'aceite-oliva') return [0, 25];
  return BOUNDS[roleOf(food)];
};
const per100 = (food, key) => { const v = knownValue(food, key); return v == null ? 0 : v; };
const isUnit = (food) => food.slug === 'huevo-m' && food.unit_g;
const isMl = (food) => Boolean(food.density_g_ml);

/** Línea de plato con una cantidad práctica: huevos por unidades, bebidas en ml, el resto en gramos. */
export function makeItem(food, grams) {
  const [min, max] = boundsFor(food);
  if (isUnit(food)) return { food: food.slug, units: Math.min(3, Math.max(1, Math.round(grams / food.unit_g))) };
  if (isMl(food)) return { food: food.slug, ml: Math.min(300, Math.max(100, Math.round(grams / food.density_g_ml / 25) * 25)) };
  return { food: food.slug, g: practical(grams, min, max) };
}
const gramsOf = (item, foods) => itemGrams(item, foods[item.food]) || 0;
const contrib = (items, foods, key) => items.reduce((a, it) => a + (per100(foods[it.food], key) * gramsOf(it, foods)) / 100, 0);

/**
 * Ajusta los gramos de un plato para acercarlo a un objetivo {protein, carbs, fat}:
 * la proteína y la fécula se resuelven juntas (cada una aporta algo del otro nutriente) y la grasa se ajusta al final.
 * Verduras, frutas y lácteos conservan su ración. Tras redondear a cantidades prácticas, el resultado se vuelve a calcular fuera.
 */
export function fitToTarget(parts, foods, target) {
  // parts: [{food, g, solve?: 'protein'|'carbs'|'fat'}]
  const g = parts.map(p => p.g);
  const idx = (k) => parts.findIndex(p => p.solve === k);
  const ip = idx('protein'), ic = idx('carbs'), ifat = idx('fat');
  const total = (key, skip) => parts.reduce((a, p, i) => (skip.includes(i) ? a : a + (per100(foods[p.food], key) * g[i]) / 100), 0);
  for (let it = 0; it < 4; it += 1) {
    if (ip >= 0) { const d = per100(foods[parts[ip].food], 'protein'); if (d > 0) g[ip] = Math.max(0, ((target.protein - total('protein', [ip])) / d) * 100); }
    if (ic >= 0) { const d = per100(foods[parts[ic].food], 'carbs'); if (d > 0) g[ic] = Math.max(0, ((target.carbs - total('carbs', [ic])) / d) * 100); }
    // se aplican los límites en cada vuelta para que el otro componente compense
    for (const i of [ip, ic]) if (i >= 0) { const [mn, mx] = boundsFor(foods[parts[i].food]); g[i] = Math.min(mx, Math.max(mn, g[i])); }
  }
  let items = parts.map((p, i) => (i === ifat ? null : makeItem(foods[p.food], g[i])));
  if (ifat >= 0) {
    const others = items.filter(Boolean);
    const d = per100(foods[parts[ifat].food], 'fat');
    const need = d > 0 ? ((target.fat - contrib(others, foods, 'fat')) / d) * 100 : 0;
    const f = foods[parts[ifat].food];
    const grams = f.slug === 'aceite-oliva' ? Math.min(25, Math.max(0, Math.round(need / 5) * 5)) : need;
    items[ifat] = f.slug === 'aceite-oliva' ? (grams > 0 ? { food: f.slug, g: grams } : null) : makeItem(f, need);
  }
  return items.filter(Boolean);
}

// ---------- Plantillas por franja ----------
const VEG_COMBOS = [
  ['calabacin', 'zanahoria'], ['judias-verdes', 'zanahoria'], ['brocoli', 'zanahoria'], ['pimiento-rojo', 'cebolla'], ['calabacin', 'berenjena'],
  ['espinacas', 'champinones'], ['coliflor', 'zanahoria'], ['hojas-verdes', 'tomate'], ['tomate', 'pepino'], ['esparragos', 'champinones'],
  ['acelgas', 'zanahoria'], ['calabaza', 'puerro'], ['alcachofa', 'guisantes-cocidos'], ['repollo', 'zanahoria'], ['pimiento-verde', 'tomate-triturado'],
  ['rucula', 'tomate'], ['brocoli', 'coliflor'], ['judias-verdes', 'tomate'], ['berenjena', 'tomate-triturado'], ['remolacha', 'hojas-verdes']
];
const RAW_VEG = new Set(['hojas-verdes', 'tomate', 'pepino', 'rucula', 'remolacha']);
const STYLES = {
  carne: [['a la plancha', 15, 'Cocina la carne a la plancha con parte del aceite, 3-4 min por lado.'], ['al horno', 20, 'Hornea la carne a 200 °C unos 20 min con parte del aceite.'], ['en salteado', 15, 'Corta la carne en tiras y saltéala a fuego vivo con parte del aceite.'], ['en guiso', 25, 'Dora la carne y guísala a fuego suave con la verdura y un poco de agua.']],
  pescado: [['al horno', 15, 'Hornea el pescado a 190 °C unos 12-15 min con parte del aceite.'], ['a la plancha', 10, 'Haz el pescado a la plancha 2-3 min por lado.'], ['al vapor', 12, 'Cocina el pescado al vapor 8-10 min.'], ['en papillote', 15, 'Envuelve el pescado con la verdura en papel de horno y hornea 15 min a 200 °C.']],
  conserva: [['', 3, 'Escurre bien la conserva.']],
  marisco: [['en salteado', 10, 'Saltea 3-4 min a fuego vivo con parte del aceite y ajo.'], ['al vapor', 8, 'Cocina al vapor hasta que esté hecho.']],
  huevos: [['tortilla', 10, 'Bate los huevos y cuaja la tortilla con parte del aceite.'], ['revuelto', 8, 'Haz un revuelto a fuego suave con parte del aceite.'], ['cocido', 12, 'Cuece los huevos 10 min y pélalos.']],
  legumbres: [['en guiso', 15, 'Calienta la legumbre ya cocida y escurrida con la verdura y un poco de agua, 10 min.'], ['en salteado', 10, 'Saltea la legumbre escurrida con la verdura y parte del aceite.'], ['en ensalada', 5, 'Enjuaga y escurre la legumbre y mézclala en frío con el resto.']],
  tofu: [['en salteado', 10, 'Corta el tofu en dados y dóralo con parte del aceite.'], ['a la plancha', 10, 'Haz el tofu en láminas a la plancha.']]
};
const styleGroup = (f) => (f.slug === 'tofu' || f.slug === 'edamame' ? 'tofu' : f.category === 'huevos' ? 'huevos' : f.category === 'legumbres' ? 'legumbres'
  : ['sardinas-escurridas', 'atun-natural'].includes(f.slug) ? 'conserva' : ['gambas', 'mejillones', 'calamar'].includes(f.slug) ? 'marisco' : f.category === 'pescado' ? 'pescado' : 'carne');
const CARB_PREP = { arroz: 'Cuece el arroz 15-18 min.', 'arroz-integral': 'Cuece el arroz integral 30-35 min (o usa uno ya cocido).', 'pasta-integral': 'Cuece la pasta según el envase.', cuscus: 'Hidrata el cuscús 5 min con el mismo volumen de agua hirviendo.', quinoa: 'Lava la quinoa y cuécela 15 min.', bulgur: 'Cuece el bulgur 10-12 min.', patata: 'Cuece la patata (o microondas 6-8 min).', boniato: 'Asa o cuece el boniato (microondas 6-8 min).', 'maiz-dulce': 'Escurre el maíz.', 'pan-integral': 'Acompaña con el pan.', 'pan-centeno': 'Acompaña con el pan.', 'pan-pita-integral': 'Acompaña con el pan de pita.' };
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

const bySlugs = (foods, slugs) => slugs.filter(s => foods[s]);
const ofRole = (foods, role) => Object.values(foods).filter(f => roleOf(f) === role).map(f => f.slug);

/** Objetivo de macros de un plato (lo que hay que igualar). Si faltan datos se usa un objetivo orientativo de la franja. */
const SLOT_DEFAULT = { desayuno: { protein: 15, carbs: 50, fat: 6 }, mediamanana: { protein: 8, carbs: 26, fat: 1 }, comida: { protein: 35, carbs: 55, fat: 14 }, merienda: { protein: 3, carbs: 15, fat: 10 }, cena: { protein: 28, carbs: 40, fat: 12 } };
export function targetOf(meal, foods) {
  const r = computeItems(meal.items, foods);
  const d = SLOT_DEFAULT[meal.slot] || SLOT_DEFAULT.comida;
  return { protein: r.protein.complete ? r.protein.value : d.protein, carbs: r.carbs.complete ? r.carbs.value : d.carbs, fat: r.fat.complete ? r.fat.value : d.fat };
}

function mainMeals(foods, target) {
  const out = [];
  const proteins = [...ofRole(foods, 'proteina'), ...ofRole(foods, 'legumbre')].filter(s => s !== 'clara-huevo');
  const carbs = bySlugs(foods, ['arroz', 'arroz-integral', 'pasta-integral', 'cuscus', 'quinoa', 'bulgur', 'patata', 'boniato', 'pan-integral', 'pan-centeno', 'maiz-dulce']);
  for (const p of proteins) {
    const pf = foods[p]; const sg = styleGroup(pf);
    for (const c of carbs) {
      for (const [v1, v2] of VEG_COMBOS) {
        if (!foods[v1] || !foods[v2]) continue;
        const h = hash(`${p}|${c}|${v1}|${v2}`);
        const [style, mins, prepP] = STYLES[sg][h % STYLES[sg].length];
        const raw = RAW_VEG.has(v1) && RAW_VEG.has(v2);
        const items = fitToTarget([{ food: p, g: 150, solve: 'protein' }, { food: c, g: 60, solve: 'carbs' }, { food: v1, g: 150 }, { food: v2, g: 100 }, { food: 'aceite-oliva', g: 10, solve: 'fat' }], foods, target);
        const tags = [];
        const cold = raw && (sg === 'conserva' || style === 'en ensalada' || style === 'cocido');
        const noCook = cold && (c.startsWith('pan') || c === 'maiz-dulce') && style !== 'cocido';
        if (noCook) tags.push('sin-cocinar');
        const minutes = noCook ? 5 : mins + (raw ? 0 : 5);
        if (minutes <= 10) tags.push('rápido');
        if (sg !== 'pescado' && sg !== 'marisco' && style !== 'tortilla' && style !== 'revuelto') tags.push('táper');
        if (style === 'al horno' || style === 'en papillote') tags.push('horno');
        tags.push(sg === 'legumbres' || sg === 'tofu' ? 'vegetal' : sg === 'huevos' ? 'huevo' : sg === 'carne' ? 'carne' : 'pescado');
        const vegPrep = raw ? 'Lava y trocea la verdura en crudo.' : 'Cuece al vapor o saltea la verdura con el resto del aceite.';
        out.push({ slug: `m-${p}-${c}-${v1}-${v2}`, name: nameFromItems(items, foods, style), ingredients: items, active_minutes: minutes, tags,
          prep: `${prepP} ${CARB_PREP[c] || ''} ${vegPrep} Sin vinagre; limón opcional si te sienta bien.`.replace(/\s+/g, ' ') });
      }
    }
  }
  return out;
}

function breakfasts(foods, target) {
  const out = [];
  const bases = bySlugs(foods, ['leche-desnatada-sin-lactosa', 'leche-semidesnatada-sin-lactosa', 'bebida-soja-enriquecida', 'yogur-natural-sin-lactosa', 'yogur-griego-desnatado', 'queso-batido', 'requeson', 'huevo-m', 'tofu']);
  const baseG = { 'yogur-natural-sin-lactosa': 250, 'yogur-griego-desnatado': 200, 'queso-batido': 200, requeson: 100, 'huevo-m': 88, tofu: 100 };
  const cereals = bySlugs(foods, ['avena-copos', 'pan-integral', 'pan-centeno', 'pan-pita-integral']);
  const fruits = [...ofRole(foods, 'fruta'), 'tomate'].filter(s => foods[s]);
  const fats = [null, 'aceite-oliva', 'nueces', 'almendras', 'avellanas', 'crema-cacahuete', 'aguacate', 'pipas-calabaza'].filter(s => s === null || foods[s]);
  for (const b of bases) for (const c of cereals) for (const fr of fruits) for (const ft of fats) {
    const savoury = fr === 'tomate';
    if (savoury && c === 'avena-copos') continue;
    if ((b === 'huevo-m' || b === 'tofu') && c === 'avena-copos') continue;
    if (ft === 'aceite-oliva' && c === 'avena-copos') continue;
    const parts = [{ food: b, g: baseG[b] || 258 }, { food: c, g: 50, solve: 'carbs' }, { food: fr, g: savoury ? 80 : 100 }];
    if (ft) parts.push({ food: ft, g: 10, solve: 'fat' });
    const items = fitToTarget(parts, foods, target);
    const egg = b === 'huevo-m';
    const tags = ['rápido'];
    if (!egg && b !== 'tofu') tags.push('sin-cocinar');
    if (foods[b].dairy === 'none') tags.push('sin-lácteos');
    out.push({ slug: `d-${b}-${c}-${fr}-${ft || 'x'}`, name: nameFromItems(items, foods, egg ? ['revuelto', 'cocido', 'tortilla'][hash(c + fr) % 3] : undefined), ingredients: items, active_minutes: egg ? 8 : 5, tags,
      prep: c === 'avena-copos' ? 'Calienta la avena con la leche o el yogur 2-3 min (o déjala en remojo la noche anterior) y añade la fruta troceada.' : `Tuesta el pan. ${egg ? 'Prepara el huevo con una gota de aceite.' : ''} ${savoury ? 'Ralla el tomate encima.' : 'Fruta entera aparte.'}`.replace(/\s+/g, ' ') });
  }
  return out;
}

function snacks(foods, target, slot) {
  const out = [];
  const fruits = ofRole(foods, 'fruta');
  const dairy = bySlugs(foods, ['yogur-natural-sin-lactosa', 'yogur-griego-desnatado', 'queso-batido', 'requeson', 'leche-desnatada-sin-lactosa', 'bebida-soja-enriquecida']);
  const dG = { 'yogur-natural-sin-lactosa': 125, 'yogur-griego-desnatado': 125, 'queso-batido': 125, requeson: 80, 'leche-desnatada-sin-lactosa': 207, 'bebida-soja-enriquecida': 207 };
  const nuts = ofRole(foods, 'frutoseco').filter(s => s !== 'crema-cacahuete');
  const breads = bySlugs(foods, ['pan-integral', 'pan-centeno', 'pan-pita-integral']);
  const tops = bySlugs(foods, ['atun-natural', 'hummus', 'huevo-m', 'queso-batido', 'aguacate', 'crema-cacahuete', 'pavo-pechuga', 'tofu']);
  const topG = { 'atun-natural': 60, hummus: 40, 'huevo-m': 44, 'queso-batido': 80, aguacate: 50, 'crema-cacahuete': 15, 'pavo-pechuga': 60, tofu: 80 };
  const vegs = bySlugs(foods, ['tomate', 'hojas-verdes', 'pepino', 'zanahoria', 'rucula', 'pimiento-rojo']);
  const push = (slug, parts, tags, prep, minutes = 2) => { const items = fitToTarget(parts, foods, target); out.push({ slug: `${slot[0]}s-${slug}`, name: nameFromItems(items, foods), ingredients: items, active_minutes: minutes, tags, prep }); };
  for (const fr of fruits) {
    push(fr, [{ food: fr, g: 150, solve: 'carbs' }], ['rápido', 'táper', 'sin-cocinar', 'sin-lácteos'], 'Fruta entera.', 1);
    for (const d of dairy) push(`${fr}-${d}`, [{ food: fr, g: 150, solve: 'carbs' }, { food: d, g: dG[d] }], ['rápido', 'táper', 'sin-cocinar', ...(foods[d].dairy === 'none' ? ['sin-lácteos'] : [])], 'Fruta entera troceada con el lácteo, sin azúcar añadido.');
    for (const n of nuts) push(`${fr}-${n}`, [{ food: fr, g: 150, solve: 'carbs' }, { food: n, g: 15, solve: 'fat' }], ['rápido', 'táper', 'sin-cocinar', 'sin-lácteos'], 'Fruta entera y frutos secos naturales o tostados, sin sal.', 1);
    for (const d of dairy.slice(0, 3)) for (const n of nuts.slice(0, 4)) push(`${fr}-${d}-${n}`, [{ food: fr, g: 120, solve: 'carbs' }, { food: d, g: dG[d] }, { food: n, g: 10, solve: 'fat' }], ['rápido', 'sin-cocinar'], 'Mezcla el lácteo con la fruta troceada y los frutos secos.');
  }
  for (const b of breads) for (const t of tops) for (const v of vegs) {
    const cooked = t === 'huevo-m' || t === 'pavo-pechuga' || t === 'tofu';
    push(`${b}-${t}-${v}`, [{ food: b, g: 40, solve: 'carbs' }, { food: t, g: topG[t] }, { food: v, g: 60 }], [cooked ? 'táper' : 'sin-cocinar', 'rápido', ...(foods[t].dairy === 'none' ? ['sin-lácteos'] : [])],
      t === 'huevo-m' ? 'Huevo cocido en rodajas sobre el pan con la verdura.' : t === 'pavo-pechuga' ? 'Pavo a la plancha en lonchas finas sobre el pan con la verdura (no fiambre).' : 'Monta el pan con el resto de ingredientes.', cooked ? 8 : 3);
  }
  return out;
}

/** Todas las alternativas de una franja, con los gramos ajustados a los macros de la comida actual. Sin límite. */
export function generateMenus(meal, foods) {
  const target = targetOf(meal, foods);
  const list = meal.slot === 'desayuno' ? breakfasts(foods, target) : meal.slot === 'comida' || meal.slot === 'cena' ? mainMeals(foods, target) : snacks(foods, target, meal.slot);
  return list.map(r => ({ ...r, slot: meal.slot }));
}

/**
 * Sustituir UN alimento del plato por otro del mismo papel. Devuelve, por cada candidato, el plato resultante con la
 * cantidad ya ajustada al nutriente que aportaba el alimento original.
 */
export function substitutesFor(meal, index, foods) {
  const item = meal.items[index];
  const orig = foods[item.food];
  if (!orig) return [];
  const role = roleOf(orig);
  const anchor = ANCHOR[role];
  const origG = gramsOf(item, foods);
  const used = new Set(meal.items.map(i => i.food));
  const out = [];
  for (const f of Object.values(foods)) {
    if (f.slug === orig.slug || used.has(f.slug) || !SWAP_GROUP[role].includes(roleOf(f))) continue;
    let grams = origG;
    if (anchor) {
      const want = (per100(orig, anchor) * origG) / 100;
      const d = per100(f, anchor);
      if (d <= 0) continue;
      grams = (want / d) * 100;
    }
    const next = makeItem(f, grams);
    const items = meal.items.map((it, i) => (i === index ? next : it));
    out.push({ recipe: `sub-${meal.id}-${f.slug}`, food: f.slug, slot: meal.slot, name: nameFromItems(items, foods), ingredients: items, item: next, role: roleOf(f), tags: [], active_minutes: null, prep: meal.prep || null });
  }
  return out;
}
