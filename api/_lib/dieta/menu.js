// Borrador orientativo inicial (propuesta nueva, NO es el plan del PDF antiguo ni un plan personalizado).
// Los alimentos se siembran SIN valores nutricionales: sin una fuente verificable (BEDCA/USDA/etiqueta) no se inventan.
// Se cargan a mano en /dieta → Alimentos (cada valor con su procedencia).

const f = (slug, name, o = {}) => ({
  slug, name, state: 'crudo', basis: '100g', allergens: [], allergen_status: 'known', dairy: 'none', category: 'otros', ...o
});

export const SEED_FOODS = [
  f('leche-desnatada-sin-lactosa', 'Leche desnatada sin lactosa', { basis: '100ml', state: 'líquido', dairy: 'lactose_free', allergen_status: 'unknown', category: 'lácteos' }),
  f('bebida-soja-enriquecida', 'Bebida de soja sin azúcar enriquecida', { basis: '100ml', state: 'líquido', allergens: ['soja'], allergen_status: 'unknown', category: 'lácteos' }),
  f('avena-copos', 'Copos de avena', { state: 'seco', allergens: ['gluten'], allergen_status: 'unknown', category: 'cereales' }),
  f('platano', 'Plátano', { state: 'parte comestible', category: 'fruta' }),
  f('manzana', 'Manzana', { state: 'parte comestible', category: 'fruta' }),
  f('naranja', 'Naranja', { state: 'parte comestible', category: 'fruta' }),
  f('pan-integral', 'Pan integral', { state: 'pan', allergens: ['gluten'], allergen_status: 'unknown', category: 'cereales' }),
  f('tomate', 'Tomate', { state: 'parte comestible', category: 'verdura' }),
  f('tomate-triturado', 'Tomate triturado sin sal añadida', { state: 'conserva', allergen_status: 'unknown', category: 'verdura' }),
  f('aceite-oliva', 'Aceite de oliva virgen extra', { state: 'aceite', category: 'grasas' }),
  f('yogur-natural-sin-lactosa', 'Yogur natural sin azúcar y sin lactosa', { state: 'yogur', dairy: 'lactose_free', allergen_status: 'unknown', category: 'lácteos' }),
  f('queso-fresco-sin-lactosa', 'Queso fresco sin lactosa', { state: 'queso', dairy: 'lactose_free', allergen_status: 'unknown', category: 'lácteos' }),
  f('nueces', 'Nueces sin sal', { state: 'sin cáscara', allergens: ['frutos de cáscara'], category: 'frutos secos' }),
  f('pollo-pechuga', 'Pollo (pechuga sin piel)', { state: 'crudo, sin hueso ni piel', category: 'carne' }),
  f('lomo-cerdo-magro', 'Lomo magro de cerdo', { state: 'crudo, sin hueso', category: 'carne' }),
  f('pescado-blanco', 'Pescado blanco (merluza o similar)', { state: 'crudo, sin espinas', allergens: ['pescado'], category: 'pescado' }),
  f('sardinas-escurridas', 'Sardinas en conserva (peso escurrido)', { state: 'escurrido', allergens: ['pescado'], allergen_status: 'unknown', category: 'pescado' }),
  f('huevo-m', 'Huevo talla M', { state: 'parte comestible (unidad)', allergens: ['huevo'], category: 'huevos' }),
  f('arroz', 'Arroz', { state: 'seco', category: 'cereales' }),
  f('pasta-integral', 'Pasta integral', { state: 'seca', allergens: ['gluten'], allergen_status: 'unknown', category: 'cereales' }),
  f('patata', 'Patata', { state: 'crudo, parte comestible', category: 'verdura' }),
  f('lentejas-cocidas', 'Lentejas cocidas y escurridas', { state: 'cocido y escurrido', allergen_status: 'unknown', category: 'legumbres' }),
  f('garbanzos-cocidos', 'Garbanzos cocidos y escurridos', { state: 'cocido y escurrido', allergen_status: 'unknown', category: 'legumbres' }),
  f('alubias-cocidas', 'Alubias cocidas y escurridas', { state: 'cocido y escurrido', allergen_status: 'unknown', category: 'legumbres' }),
  f('guisantes-cocidos', 'Guisantes cocidos', { state: 'cocido', category: 'verdura' }),
  f('hummus', 'Hummus', { state: 'preparado', allergens: ['sésamo'], allergen_status: 'unknown', category: 'legumbres' }),
  f('calabacin', 'Calabacín', { state: 'crudo, parte comestible', category: 'verdura' }),
  f('zanahoria', 'Zanahoria', { state: 'crudo, parte comestible', category: 'verdura' }),
  f('judias-verdes', 'Judías verdes', { state: 'crudo, parte comestible', category: 'verdura' }),
  f('calabaza', 'Calabaza', { state: 'crudo, parte comestible', category: 'verdura' }),
  f('hojas-verdes', 'Hojas verdes (lechuga, canónigos…)', { state: 'crudo', category: 'verdura' })
];

const I = (food, g) => ({ food, g });
const U = (food, units) => ({ food, units });
const ML = (food, ml) => ({ food, ml });
const R = (slug, name, slot, ingredients, prep, active_minutes, tags = []) => ({ slug, name, slot, ingredients, prep, active_minutes, tags, servings: 1 });

export const SEED_RECIPES = [
  R('desayuno-a', 'Avena con leche y plátano', 'desayuno', [ML('leche-desnatada-sin-lactosa', 250), I('avena-copos', 45), I('platano', 100)], 'Calienta la leche con la avena 3-4 min (o microondas 2 min) y añade el plátano en rodajas. Canela opcional.', 5, ['rápido', 'microondas', 'sin-cocinar']),
  R('desayuno-b', 'Tostada de pan integral con tomate y leche', 'desayuno', [ML('leche-desnatada-sin-lactosa', 250), I('pan-integral', 70), I('tomate', 80), I('aceite-oliva', 5)], 'Tuesta el pan, ralla el tomate encima y añade el aceite medido. Leche aparte.', 5, ['rápido', 'sin-cocinar']),
  R('desayuno-soja-a', 'Avena con bebida de soja y plátano', 'desayuno', [ML('bebida-soja-enriquecida', 250), I('avena-copos', 45), I('platano', 100)], 'Igual que el desayuno A con bebida de soja sin azúcar enriquecida (comprueba en la etiqueta calcio, B12, D y yodo).', 5, ['rápido', 'microondas', 'sin-lácteos']),
  R('mediamanana', 'Fruta y yogur natural', 'mediamanana', [I('manzana', 150), I('yogur-natural-sin-lactosa', 125)], 'Fruta entera troceada con el yogur natural sin azúcar. Puedes tomarlo entre las 11:00 y las 13:00 (no se duplica).', 2, ['rápido', 'táper', 'sin-cocinar']),
  R('mediamanana-sin-lacteos', 'Fruta', 'mediamanana', [I('manzana', 150)], 'Fruta entera.', 1, ['rápido', 'táper', 'sin-cocinar', 'sin-lácteos']),
  R('merienda', 'Fruta y frutos secos', 'merienda', [I('naranja', 150), I('nueces', 15)], 'Fruta entera y frutos secos sin sal.', 1, ['rápido', 'táper', 'sin-cocinar']),
  // Comidas
  R('comida-pollo-arroz', 'Pollo con arroz y verduras', 'comida', [I('pollo-pechuga', 150), I('arroz', 60), I('calabacin', 150), I('zanahoria', 100), I('aceite-oliva', 10)], 'Dora el pollo en dados con 5 g de aceite, saltea la verdura troceada y añade el arroz cocido aparte. Aceite restante en crudo.', 20, ['táper']),
  R('comida-lentejas', 'Lentejas con arroz y verduras', 'comida', [I('lentejas-cocidas', 180), I('arroz', 40), I('zanahoria', 100), I('judias-verdes', 150), I('aceite-oliva', 10)], 'Calienta las lentejas ya cocidas con la verdura cocida y el arroz cocido; aceite al final.', 15, ['táper', 'legumbre']),
  R('comida-garbanzos', 'Garbanzos con arroz y verduras', 'comida', [I('garbanzos-cocidos', 180), I('arroz', 40), I('calabacin', 150), I('zanahoria', 100), I('aceite-oliva', 10)], 'Rehoga la verdura con el aceite, añade garbanzos escurridos y arroz cocido.', 15, ['táper', 'legumbre']),
  R('comida-pollo-pasta', 'Pollo con pasta integral y tomate', 'comida', [I('pollo-pechuga', 150), I('pasta-integral', 70), I('tomate-triturado', 150), I('zanahoria', 100), I('aceite-oliva', 10)], 'Cuece la pasta, dora el pollo con la zanahoria rallada y el aceite, añade el tomate y mezcla.', 20, ['táper']),
  R('comida-alubias', 'Alubias con arroz y verduras', 'comida', [I('alubias-cocidas', 180), I('arroz', 40), I('judias-verdes', 150), I('zanahoria', 100), I('aceite-oliva', 10)], 'Calienta alubias escurridas con verdura cocida y arroz cocido.', 15, ['táper', 'legumbre']),
  R('comida-lomo-patata', 'Lomo de cerdo con patata y verduras', 'comida', [I('lomo-cerdo-magro', 150), I('patata', 250), I('judias-verdes', 150), I('calabacin', 100), I('aceite-oliva', 10)], 'Lomo a la plancha o al horno con patata en gajos y verdura; aceite medido.', 25, ['horno']),
  // Cenas
  R('cena-tortilla-patata', 'Tortilla de 2 huevos con patata y calabacín', 'cena', [U('huevo-m', 2), I('patata', 180), I('calabacin', 250), I('aceite-oliva', 5)], 'Cuece (o microondas) la patata y el calabacín, bate los huevos y cuaja en sartén con el aceite.', 20, []),
  R('cena-pescado-patata', 'Pescado blanco con patata y verduras', 'cena', [I('pescado-blanco', 180), I('patata', 200), I('calabacin', 150), I('zanahoria', 100), I('aceite-oliva', 10)], 'Pescado al horno o al vapor; patata y verdura cocidas; aceite en crudo.', 15, ['horno']),
  R('cena-sardinas-pan', 'Sardinas con pan integral y ensalada', 'cena', [I('sardinas-escurridas', 100), I('pan-integral', 60), I('tomate', 150), I('hojas-verdes', 100), I('aceite-oliva', 5)], 'Escurre las sardinas y prepara ensalada de tomate y hojas con el aceite. Revisa sal y aceite de la conserva real.', 5, ['rápido', 'sin-cocinar']),
  R('cena-crema-hummus', 'Crema de calabaza con hummus y pan', 'cena', [I('calabaza', 250), I('patata', 150), I('hummus', 100), I('pan-integral', 50), I('aceite-oliva', 5)], 'Cuece calabaza y patata y tritura con el aceite. Hummus sobre el pan. La grasa del hummus va en su propia ficha.', 20, ['táper']),
  R('cena-sardinas-patata', 'Sardinas con patata y verduras', 'cena', [I('sardinas-escurridas', 100), I('patata', 200), I('judias-verdes', 150), I('zanahoria', 100), I('aceite-oliva', 5)], 'Patata y verdura cocidas, sardinas escurridas por encima.', 15, []),
  R('cena-tortilla-judias', 'Tortilla de 2 huevos con judías verdes y patata', 'cena', [U('huevo-m', 2), I('judias-verdes', 250), I('patata', 180), I('aceite-oliva', 5)], 'Cuece judías y patata y cuaja la tortilla con el aceite.', 20, []),
  R('cena-arroz-guisantes', 'Arroz con guisantes, verduras y queso fresco', 'cena', [I('arroz', 50), I('guisantes-cocidos', 100), I('zanahoria', 100), I('calabacin', 150), I('queso-fresco-sin-lactosa', 100), I('aceite-oliva', 5)], 'Saltea la verdura, mezcla con arroz cocido y guisantes; queso fresco al final.', 20, [])
];

// Plantilla de siete días: [desayuno, comida, cena]
export const WEEK_TEMPLATE = [
  ['desayuno-a', 'comida-pollo-arroz', 'cena-tortilla-patata'],
  ['desayuno-b', 'comida-lentejas', 'cena-pescado-patata'],
  ['desayuno-a', 'comida-garbanzos', 'cena-sardinas-pan'],
  ['desayuno-b', 'comida-pollo-pasta', 'cena-crema-hummus'],
  ['desayuno-a', 'comida-alubias', 'cena-sardinas-patata'],
  ['desayuno-b', 'comida-lentejas', 'cena-tortilla-judias'],
  ['desayuno-a', 'comida-lomo-patata', 'cena-arroz-guisantes']
];
export const SLOT_ORDER = ['desayuno', 'mediamanana', 'comida', 'merienda', 'cena'];
export const SLOT_LABEL = { desayuno: 'Desayuno', mediamanana: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
export const SLOT_TIME = { desayuno: '08:30', mediamanana: '11:00–13:00', comida: '14:30', merienda: '17:30', cena: '21:00' };

/** Construye los datos de una semana a partir de la plantilla. */
export function buildWeek(weekStartYmd, recipes, addDays) {
  const days = {};
  WEEK_TEMPLATE.forEach(([d, c, ce], i) => {
    const date = addDays(weekStartYmd, i);
    const slugs = { desayuno: d, mediamanana: 'mediamanana', comida: c, merienda: 'merienda', cena: ce };
    days[date] = {
      meals: SLOT_ORDER.map(slot => {
        const r = recipes[slugs[slot]];
        return { id: `${date}-${slot}`, slot, recipe: r.slug, name: r.name, items: r.ingredients, locked: false };
      })
    };
  });
  return { days };
}
