import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeItems, sumResults, saltFromSodiumMg, checkRestrictions, classifyAlternative, addDays, weekStart, madridDate,
  isYmd, costItems, aggregateShopping, packInfo, scaleItems, rankAlternatives, microDiff
} from '../api/_lib/dieta/nutrition.js';
import { SEED_RECIPES, WEEK_TEMPLATE, buildWeek } from '../api/_lib/dieta/menu.js';
import { CATALOG_FOODS } from '../api/_lib/dieta/catalog.js';
import { generateMenus, substitutesFor } from '../api/_lib/dieta/menus.js';

const nut = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { v, q: 'available', src: 't' }]));
const food = (slug, nutrients, extra = {}) => ({ slug, name: slug, basis: '100g', allergens: [], allergen_status: 'known', dairy: 'none', nutrients: nut(nutrients), ...extra });

test('cálculo por 100 g con ejemplo conocido', () => {
  const foods = { arroz: food('arroz', { kcal: 350, protein: 7 }) };
  const r = computeItems([{ food: 'arroz', g: 60 }], foods);
  assert.equal(r.kcal.value, 210);
  assert.equal(r.protein.value, 4.2);
  assert.equal(r.kcal.complete, true);
});

test('sodio a sal y unidades', () => {
  assert.equal(saltFromSodiumMg(2000), 5);
  const r = computeItems([{ food: 'x', g: 100 }], { x: food('x', { sodium: 400 }) });
  assert.equal(r.salt.value, 1);
});

test('ingrediente desconocido produce total incompleto y no 0', () => {
  const foods = { a: food('a', { kcal: 100, calcium: 50 }), b: food('b', { kcal: 200 }) };
  const r = computeItems([{ food: 'a', g: 100 }, { food: 'b', g: 100 }], foods);
  assert.equal(r.kcal.complete, true);
  assert.equal(r.calcium.complete, false);
  assert.equal(r.calcium.value, 50); // subtotal conocido
  assert.deepEqual(r.calcium.missing, ['b']);
});

test('alimento sin datos nunca suma cero silencioso y se propaga a día/semana', () => {
  const foods = { a: food('a', { kcal: 100 }), v: { ...food('v', {}), nutrients: {} } };
  const meal1 = computeItems([{ food: 'a', g: 100 }], foods);
  const meal2 = computeItems([{ food: 'v', g: 100 }], foods);
  const day = sumResults([meal1, meal2]);
  assert.equal(day.kcal.complete, false);
  assert.equal(day.kcal.value, 100);
});

test('huevos por unidad sin peso comestible documentado quedan sin peso', () => {
  const f = { huevo: food('huevo', { kcal: 140 }, { unit_g: null }) };
  assert.equal(computeItems([{ food: 'huevo', units: 2 }], f).kcal.complete, false);
  f.huevo.unit_g = 50;
  assert.equal(computeItems([{ food: 'huevo', units: 2 }], f).kcal.value, 140);
});

test('líquidos en ml usan la base por 100 ml sin densidad', () => {
  const f = { leche: food('leche', { kcal: 35 }, { basis: '100ml' }) };
  assert.equal(computeItems([{ food: 'leche', ml: 250 }], f).kcal.value, 87.5);
  assert.equal(computeItems([{ food: 'leche', g: 250 }], f).kcal.complete, false);
});

test('kiwi excluido y lácteo sin lactosa excluido si hay alergia a proteínas de leche', () => {
  const foods = { kiwi: food('kiwi', {}), ysl: food('ysl', {}, { dairy: 'lactose_free' }), pan: food('pan', {}) };
  assert.equal(checkRestrictions([{ food: 'kiwi', g: 10 }], foods, {}).violations.length, 1);
  assert.equal(checkRestrictions([{ food: 'ysl', g: 100 }], foods, { milk_status: 'milk_protein_allergy' }).violations.length, 1);
  assert.equal(checkRestrictions([{ food: 'ysl', g: 100 }], foods, { milk_status: 'lactose_intolerance' }).violations.length, 0);
  assert.equal(checkRestrictions([{ food: 'ysl', g: 100 }], foods, {}).pending.length > 0, true); // por aclarar
  assert.equal(checkRestrictions([{ food: 'pan', g: 10 }], foods, { excluded: ['pan'] }).violations.length, 1);
});

test('mismas calorías pero distinta proteína no es equivalente', () => {
  const foods = { a: food('a', { kcal: 200, protein: 30, carbs: 0, fat: 8 }), b: food('b', { kcal: 200, protein: 5, carbs: 0, fat: 8 }) };
  const o = computeItems([{ food: 'a', g: 100 }], foods), a = computeItems([{ food: 'b', g: 100 }], foods);
  const c = classifyAlternative(o, a, { violations: [], pending: [] });
  assert.equal(c.status, 'con_diferencias');
  assert.equal(c.dims.protein, 'difiere');
});

test('datos ausentes dan datos insuficientes, no equivalente completo', () => {
  const foods = { a: food('a', {}), b: food('b', {}) };
  const o = computeItems([{ food: 'a', g: 100 }], foods), a = computeItems([{ food: 'b', g: 100 }], foods);
  assert.equal(classifyAlternative(o, a, { violations: [], pending: [] }).status, 'datos_insuficientes');
});

test('dentro de márgenes solo con datos completos y límites cumplidos', () => {
  const foods = { a: food('a', { kcal: 200, protein: 10, carbs: 20, fat: 5 }), b: food('b', { kcal: 202, protein: 12, carbs: 21, fat: 5 }) };
  const o = computeItems([{ food: 'a', g: 100 }], foods), a = computeItems([{ food: 'b', g: 100 }], foods);
  assert.equal(classifyAlternative(o, a, { violations: [], pending: [] }).status, 'dentro');
  assert.equal(classifyAlternative(o, a, { violations: ['x'], pending: [] }).status, 'no_compatible');
});

test('coste: sin precio no es 0 €; consumo distinto de compra', () => {
  const foods = { arroz: food('arroz', {}) };
  const sin = costItems([{ food: 'arroz', g: 100 }], foods, {});
  assert.equal(sin.complete, false);
  const prices = { arroz: { price_eur: 1.2, pack_net_g: 1000, pack_drained_g: null } };
  assert.ok(Math.abs(costItems([{ food: 'arroz', g: 100 }], foods, prices).value - 0.12) < 1e-9);
  assert.equal(packInfo(prices.arroz).packPrice, 1.2); // la compra es el envase entero
});

test('compra agrega gramos por alimento', () => {
  const foods = { a: food('a', {}) };
  assert.equal(aggregateShopping([{ food: 'a', g: 100 }, { food: 'a', g: 50 }], foods).map.a, 150);
});

test('escalado redondea a cantidades prácticas y huevos por unidades', () => {
  const s = scaleItems([{ food: 'a', g: 150 }, { food: 'h', units: 2 }], 1.1);
  assert.equal(s[0].g, 170); assert.equal(s[1].units, 2);
});

test('fechas: lunes de la semana, domingo no pasa a lunes y cambio de hora', () => {
  assert.equal(weekStart('2026-11-15'), '2026-11-09'); // domingo
  assert.equal(weekStart('2026-11-09'), '2026-11-09');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29'); // cambio de hora en Madrid
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(madridDate(new Date('2026-06-30T22:30:00Z')), '2026-07-01'); // 00:30 en Madrid
  assert.equal(madridDate(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});

test('fechas inválidas se rechazan', () => {
  assert.equal(isYmd('2026-02-30'), false);
  assert.equal(isYmd('2026-02-28'), true);
  assert.equal(isYmd('2026-13-01'), false);
});

// ---------- Catálogo USDA, generador de menús y sustituciones ----------
const meal = (slot, items) => ({ id: `2026-11-09-${slot}`, slot, recipe: 'x', name: 'x', items });
const COMIDA = meal('comida', [{ food: 'pollo-pechuga', g: 150 }, { food: 'arroz', g: 60 }, { food: 'calabacin', g: 150 }, { food: 'zanahoria', g: 100 }, { food: 'aceite-oliva', g: 10 }]);

test('catálogo: datos USDA con procedencia, sin kiwi y sin inventar yodo', () => {
  const all = Object.values(CATALOG_FOODS);
  assert.ok(all.length >= 100);
  for (const f of all) {
    assert.match(f.source_id, /^NDB \d+$/, f.slug);
    for (const k of ['kcal', 'protein', 'carbs', 'fat']) assert.ok(f.nutrients[k], `${f.slug} sin ${k}`);
    assert.equal(f.nutrients.iodine, undefined); // SR26 no trae yodo: desconocido, no 0
    assert.ok(!/kiwi/i.test(f.name + f.slug));
  }
  assert.equal(CATALOG_FOODS['pollo-pechuga'].nutrients.protein.v, 22.5);
  assert.equal(CATALOG_FOODS['leche-desnatada-sin-lactosa'].nutrients.kcal.q, 'estimated'); // alimento similar, marcado
  assert.equal(CATALOG_FOODS['huevo-m'].unit_g, 44);
});

test('el menú de partida usa solo alimentos del catálogo y se calcula completo', () => {
  for (const r of SEED_RECIPES) {
    for (const i of r.ingredients) assert.ok(CATALOG_FOODS[i.food], `${r.slug}: ${i.food}`);
    const res = computeItems(r.ingredients, CATALOG_FOODS);
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'sodium']) assert.equal(res[k].complete, true, `${r.slug} ${k}`);
    assert.equal(res.iodine.complete, false);
  }
  const rec = Object.fromEntries(SEED_RECIPES.map(r => [r.slug, r]));
  for (const row of WEEK_TEMPLATE) for (const s of row) assert.ok(rec[s], s);
  assert.equal(Object.keys(buildWeek('2026-11-09', rec, addDays).days).length, 7);
});

test('generador: sin límite, cantidades prácticas y fáciles de preparar en todas las franjas', () => {
  const slots = {
    desayuno: [{ food: 'leche-desnatada-sin-lactosa', ml: 250 }, { food: 'avena-copos', g: 45 }, { food: 'platano', g: 100 }],
    mediamanana: [{ food: 'manzana', g: 150 }, { food: 'yogur-natural-sin-lactosa', g: 125 }],
    comida: COMIDA.items,
    merienda: [{ food: 'naranja', g: 150 }, { food: 'nueces', g: 15 }],
    cena: [{ food: 'huevo-m', units: 2 }, { food: 'patata', g: 180 }, { food: 'calabacin', g: 250 }, { food: 'aceite-oliva', g: 5 }]
  };
  for (const [slot, items] of Object.entries(slots)) {
    const m = meal(slot, items);
    const menus = generateMenus(m, CATALOG_FOODS);
    assert.ok(menus.length > 300, `${slot}: ${menus.length}`);
    assert.equal(new Set(menus.map(x => x.slug)).size, menus.length, 'slugs únicos');
    for (const x of menus) {
      assert.ok(x.active_minutes <= 30, `${x.name}: ${x.active_minutes} min`);
      assert.ok(x.prep && !/vinagre(?! ?;)/i.test(x.prep.replace('Sin vinagre', '')), x.name);
      for (const i of x.ingredients) {
        assert.ok(CATALOG_FOODS[i.food]);
        if (i.units != null) assert.ok(Number.isInteger(i.units) && i.units >= 1 && i.units <= 3);
        else if (i.ml != null) assert.equal(i.ml % 25, 0);
        else assert.equal(i.g % 5, 0, `${x.name}: ${i.g} g`);
      }
    }
    const ranked = rankAlternatives(m, menus, CATALOG_FOODS, { milk_status: 'lactose_intolerance' });
    const eq = ranked.filter(c => c.status === 'equivalente');
    assert.ok(eq.length >= 10, `${slot}: ${eq.length} equivalentes`);
    const o = computeItems(items, CATALOG_FOODS);
    for (const c of eq) {
      assert.ok(Math.abs(c.kcal.value - o.kcal.value) <= 0.05 * o.kcal.value + 1e-6, c.name);
      assert.ok(Math.abs(c.protein.value - o.protein.value) <= 5 + 1e-6, c.name);
      assert.equal(c.micro.drops.length, 0);
    }
    assert.notEqual(ranked[0].ingredients[0].food, ranked[1].ingredients[0].food, 'variedad en los primeros resultados');
  }
});

test('alergia a proteínas de leche: ningún plato con lácteo queda como compatible', () => {
  const m = meal('desayuno', [{ food: 'bebida-soja-enriquecida', ml: 250 }, { food: 'avena-copos', g: 45 }, { food: 'platano', g: 100 }]);
  const ranked = rankAlternatives(m, generateMenus(m, CATALOG_FOODS), CATALOG_FOODS, { milk_status: 'milk_protein_allergy' });
  for (const c of ranked) if (c.ingredients.some(i => CATALOG_FOODS[i.food].dairy !== 'none')) assert.equal(c.status, 'no_compatible', c.name);
  assert.ok(ranked.some(c => c.status !== 'no_compatible'));
});

test('sustituir un alimento: mismo papel, gramos ajustados y bajadas de micronutrientes detectadas', () => {
  const subs = substitutesFor(COMIDA, 0, CATALOG_FOODS); // pollo
  assert.ok(subs.length >= 25);
  assert.ok(subs.every(c => ['proteina', 'legumbre'].includes(c.role)));
  assert.ok(!subs.some(c => c.food === 'arroz' || c.food === 'manzana'));
  const pavo = subs.find(c => c.food === 'pavo-pechuga');
  const o = computeItems(COMIDA.items, CATALOG_FOODS), a = computeItems(pavo.ingredients, CATALOG_FOODS);
  assert.ok(Math.abs(a.protein.value - o.protein.value) < 2);
  assert.equal(pavo.ingredients.length, COMIDA.items.length);
  // Naranja → manzana en la merienda: misma energía, pero la vitamina C cae y se avisa.
  const mer = meal('merienda', [{ food: 'naranja', g: 150 }, { food: 'nueces', g: 15 }]);
  const manz = rankAlternatives(mer, substitutesFor(mer, 0, CATALOG_FOODS), CATALOG_FOODS).find(c => c.food === 'manzana');
  assert.ok(manz.micro.drops.some(d => d.key === 'vitC'));
  assert.notEqual(manz.status, 'equivalente');
  // Verdura por verdura conserva los gramos
  const veg = substitutesFor(COMIDA, 2, CATALOG_FOODS).find(c => c.food === 'brocoli');
  assert.equal(veg.item.g, 150);
  // Huevos siempre por unidades
  const huevo = subs.find(c => c.food === 'huevo-m');
  assert.ok(Number.isInteger(huevo.item.units));
});

test('avisos de consumo ocasional: sal y saturadas altas, sin penalizar aceite ni frutos secos', () => {
  const r = checkRestrictions([{ food: 'queso-fresco-sin-lactosa', g: 50 }, { food: 'aceite-oliva', g: 10 }, { food: 'nueces', g: 15 }], CATALOG_FOODS, { milk_status: 'none' });
  assert.equal(r.warnings.length, 2);
  assert.ok(r.warnings.every(w => /Queso fresco/.test(w)));
});

test('microDiff: lo desconocido no cuenta como bajada ni como cubierto', () => {
  const o = computeItems(COMIDA.items, CATALOG_FOODS);
  const d = microDiff(o, o);
  assert.equal(d.drops.length, 0);
  assert.ok(d.unknown.includes('Yodo'));
});
