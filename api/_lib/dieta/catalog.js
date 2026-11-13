// Catálogo de alimentos con datos de USDA National Nutrient Database for Standard Reference, Release 26 (dominio público).
// Se genera con scripts/dieta/build-foods.py; cada alimento conserva su NDB No. Lo que la fuente no trae (p. ej. yodo)
// queda desconocido y nunca se rellena con 0.
import raw from './data/foods.js';

export const CATALOG_FOODS = Object.fromEntries(raw.map(f => {
  const { n, q, ...rest } = f;
  const src = `USDA SR26 ${f.source_id}`;
  return [f.slug, { unit_g: null, density_g_ml: null, ...rest, version: 0, nutrients: Object.fromEntries(Object.entries(n).map(([k, v]) => [k, { v, q, src }])) }];
}));
