import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeItems, sumResults, saltFromSodiumMg, checkRestrictions, classifyAlternative, addDays, weekStart, madridDate,
  isYmd, costItems, aggregateShopping, packInfo, scaleItems, DEFAULT_TOLERANCES
} from '../api/_lib/dieta/nutrition.js';
import { SEED_FOODS, SEED_RECIPES, WEEK_TEMPLATE, buildWeek } from '../api/_lib/dieta/menu.js';

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

test('semilla: todos los ingredientes existen y no se inventan nutrientes', () => {
  const slugs = new Set(SEED_FOODS.map(f => f.slug));
  for (const r of SEED_RECIPES) for (const i of r.ingredients) assert.ok(slugs.has(i.food), `${r.slug}: ${i.food}`);
  for (const f of SEED_FOODS) assert.equal(f.nutrients, undefined);
  const rec = Object.fromEntries(SEED_RECIPES.map(r => [r.slug, r]));
  for (const row of WEEK_TEMPLATE) for (const s of row) assert.ok(rec[s], s);
  const w = buildWeek('2026-11-09', rec, addDays);
  assert.equal(Object.keys(w.days).length, 7);
  assert.equal(w.days['2026-11-09'].meals.length, 5);
  assert.equal(JSON.stringify(SEED_FOODS).includes('kiwi'), false);
});

test('el borrador de recetas nunca incluye kiwi', () => {
  const foods = Object.fromEntries(SEED_FOODS.map(f => [f.slug, { ...f, nutrients: {} }]));
  for (const r of SEED_RECIPES) assert.equal(checkRestrictions(r.ingredients, foods, { milk_status: 'lactose_intolerance' }).violations.length, 0, r.slug);
});
