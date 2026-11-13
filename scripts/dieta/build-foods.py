#!/usr/bin/env python3
"""Genera api/_lib/dieta/data/foods.js a partir de USDA National Nutrient Database for Standard Reference, Release 26 (SR26).
Datos de dominio público (USDA). Copia usada: https://github.com/hadley/usdanutrients (CC0), tablas food/nutrient/weight en CSV.
Uso: build-foods.py <dir con food.csv, nutrient.csv, weight.csv> <salida foods.js>
Cada valor conserva el NDB No. del alimento. Lo que SR26 no trae (p. ej. yodo) queda desconocido: nunca se rellena con 0."""
import csv, json, sys

SRC, OUT = sys.argv[1], sys.argv[2]
# clave interna -> (nutr_id SR26, unidad)
NUT = {'kcal': 208, 'protein': 203, 'fat': 204, 'satfat': 606, 'fiber': 291, 'sugars': 269, 'sodium': 307, 'potassium': 306,
       'calcium': 301, 'iron': 303, 'magnesium': 304, 'phosphorus': 305, 'zinc': 309, 'selenium': 317,
       'vitA': 320, 'vitC': 401, 'vitD': 328, 'vitE': 323, 'vitK': 430, 'vitB1': 404, 'vitB2': 405, 'vitB3': 406, 'vitB6': 415,
       'folate': 417, 'vitB12': 418}
CARB, EPA, DHA = 205, 629, 621

# slug, nombre, estado, categoría, descripción EXACTA en SR26, extras
F = [
 # lácteos y alternativas
 ('leche-desnatada-sin-lactosa','Leche desnatada sin lactosa','líquido','lácteos','Milk, nonfat, fluid, without added vitamin A and vitamin D (fat free or skim)',{'dairy':'lactose_free','similar':'leche desnatada normal (la versión sin lactosa solo cambia el azúcar)','ml':True,'chk':True}),
 ('leche-semidesnatada-sin-lactosa','Leche semidesnatada sin lactosa','líquido','lácteos','Milk, reduced fat, fluid, 2% milkfat, without added vitamin A and vitamin D',{'dairy':'lactose_free','similar':'leche semidesnatada normal','ml':True,'chk':True}),
 ('bebida-soja-enriquecida','Bebida de soja sin azúcar con calcio','líquido','lácteos','Soymilk (all flavors), unsweetened, with added calcium, vitamins A and D',{'al':['soja'],'ml':True,'chk':True}),
 ('yogur-natural-sin-lactosa','Yogur natural desnatado sin lactosa','yogur','lácteos','Yogurt, plain, skim milk, 13 grams protein per 8 ounce',{'dairy':'lactose_free','similar':'yogur natural desnatado normal','chk':True}),
 ('yogur-griego-desnatado','Yogur griego natural desnatado','yogur','lácteos','Yogurt, Greek, plain, nonfat',{'dairy':'with_lactose','chk':True}),
 ('queso-fresco-sin-lactosa','Queso fresco sin lactosa','queso','lácteos','Cheese, fresh, queso fresco',{'dairy':'lactose_free','similar':'queso fresco normal','chk':True}),
 ('requeson','Requesón','queso','lácteos','Cheese, ricotta, part skim milk',{'dairy':'with_lactose','chk':True}),
 ('queso-batido','Queso fresco batido 0 % (tipo cottage desnatado)','queso','lácteos','Cheese, cottage, nonfat, uncreamed, dry, large or small curd',{'dairy':'with_lactose','chk':True}),
 ('mozzarella','Mozzarella semidesnatada','queso','lácteos','Cheese, mozzarella, part skim milk',{'dairy':'with_lactose','chk':True}),
 # cereales y féculas
 ('avena-copos','Copos de avena','seco','cereales','Cereals, oats, regular and quick, not fortified, dry',{'al':['gluten'],'chk':True}),
 ('pan-integral','Pan integral','pan','cereales','Bread, whole-wheat, commercially prepared',{'al':['gluten'],'chk':True}),
 ('pan-centeno','Pan de centeno','pan','cereales','Bread, rye',{'al':['gluten'],'chk':True}),
 ('pan-pita-integral','Pan de pita integral','pan','cereales','Bread, pita, whole-wheat',{'al':['gluten'],'chk':True}),
 ('arroz','Arroz blanco','seco','cereales','Rice, white, long-grain, regular, raw, unenriched',{}),
 ('arroz-integral','Arroz integral','seco','cereales','Rice, brown, long-grain, raw',{}),
 ('pasta-integral','Pasta integral','seca','cereales','Macaroni, whole-wheat, dry',{'al':['gluten'],'chk':True}),
 ('cuscus','Cuscús','seco','cereales','Couscous, dry',{'al':['gluten'],'chk':True}),
 ('quinoa','Quinoa','seca','cereales','Quinoa, uncooked',{}),
 ('bulgur','Bulgur','seco','cereales','Bulgur, dry',{'al':['gluten'],'chk':True}),
 ('patata','Patata','crudo, con piel','verdura','Potato, flesh and skin, raw',{}),
 ('boniato','Boniato','crudo','verdura','Sweet potato, raw, unprepared',{}),
 ('maiz-dulce','Maíz dulce en conserva (escurrido)','escurrido','verdura','Corn, sweet, yellow, canned, whole kernel, drained solids',{'chk':True}),
 # proteínas
 ('pollo-pechuga','Pechuga de pollo sin piel','crudo, sin hueso ni piel','carne','Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw',{}),
 ('pollo-muslo','Muslo de pollo sin piel','crudo, sin hueso ni piel','carne','Chicken, broilers or fryers, dark meat, thigh, meat only, raw',{}),
 ('pavo-pechuga','Pechuga de pavo','crudo, sin hueso ni piel','carne','Turkey, retail parts, breast, meat only, raw',{}),
 ('lomo-cerdo-magro','Lomo de cerdo magro','crudo, sin hueso','carne','Pork, fresh, loin, top loin (chops), boneless, separable lean only, raw',{}),
 ('solomillo-cerdo','Solomillo de cerdo','crudo','carne','Pork, fresh, loin, tenderloin, separable lean only, raw',{}),
 ('ternera-magra','Ternera magra (filete)','crudo','carne','Beef, round, top round steak, boneless, separable lean only, trimmed to 0" fat, all grades, raw',{}),
 ('ternera-picada-magra','Carne picada de ternera 5 % grasa','crudo','carne','Beef, ground, 95% lean meat / 5% fat, raw',{}),
 ('conejo','Conejo','crudo, sin hueso','carne','Game meat, rabbit, domesticated, composite of cuts, raw',{}),
 ('pescado-blanco','Merluza o pescadilla','crudo, sin espinas','pescado','Fish, whiting, mixed species, raw',{'al':['pescado']}),
 ('bacalao-fresco','Bacalao fresco','crudo, sin espinas','pescado','Fish, cod, Atlantic, raw',{'al':['pescado']}),
 ('lubina','Lubina','crudo, sin espinas','pescado','Fish, sea bass, mixed species, raw',{'al':['pescado']}),
 ('lenguado','Lenguado o gallo','crudo, sin espinas','pescado','Fish, flatfish (flounder and sole species), raw',{'al':['pescado']}),
 ('rape','Rape','crudo, sin espinas','pescado','Fish, monkfish, raw',{'al':['pescado']}),
 ('salmon','Salmón','crudo, sin espinas','pescado','Fish, salmon, Atlantic, farmed, raw',{'al':['pescado']}),
 ('caballa','Caballa','crudo, sin espinas','pescado','Fish, mackerel, Atlantic, raw',{'al':['pescado']}),
 ('trucha','Trucha','crudo, sin espinas','pescado','Fish, trout, rainbow, farmed, raw',{'al':['pescado']}),
 ('sardinas-escurridas','Sardinas en aceite (escurridas)','escurrido','pescado','Fish, sardine, Atlantic, canned in oil, drained solids with bone',{'al':['pescado'],'chk':True}),
 ('atun-natural','Atún al natural (escurrido)','escurrido','pescado','Fish, tuna, light, canned in water, drained solids',{'al':['pescado'],'chk':True}),
 ('gambas','Gambas o langostinos pelados','crudo, pelado','pescado','Crustaceans, shrimp, mixed species, raw',{'al':['crustáceos']}),
 ('mejillones','Mejillones (carne)','crudo, sin concha','pescado','Mollusks, mussel, blue, raw',{'al':['moluscos']}),
 ('calamar','Calamar o sepia','crudo, limpio','pescado','Mollusks, squid, mixed species, raw',{'al':['moluscos']}),
 ('huevo-m','Huevo talla M','parte comestible','huevos','Egg, whole, raw, fresh',{'al':['huevo'],'unit':'medium'}),
 ('clara-huevo','Clara de huevo','cruda','huevos','Egg, white, raw, fresh',{'al':['huevo']}),
 ('tofu','Tofu firme','escurrido','legumbres','Tofu, raw, firm, prepared with calcium sulfate',{'al':['soja'],'chk':True}),
 # legumbres
 ('lentejas-cocidas','Lentejas cocidas','cocido y escurrido','legumbres','Lentils, mature seeds, cooked, boiled, without salt',{'chk':True}),
 ('garbanzos-cocidos','Garbanzos cocidos','cocido y escurrido','legumbres','Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt',{'chk':True}),
 ('alubias-cocidas','Alubias blancas cocidas','cocido y escurrido','legumbres','Beans, white, mature seeds, cooked, boiled, without salt',{'chk':True}),
 ('alubias-rojas-cocidas','Alubias rojas cocidas','cocido y escurrido','legumbres','Beans, kidney, all types, mature seeds, cooked, boiled, without salt',{'chk':True}),
 ('alubias-negras-cocidas','Alubias negras cocidas','cocido y escurrido','legumbres','Beans, black, mature seeds, cooked, boiled, without salt',{'chk':True}),
 ('guisantes-cocidos','Guisantes cocidos','cocido','verdura','Peas, green, frozen, cooked, boiled, drained, without salt',{}),
 ('edamame','Edamame (sin vaina)','congelado','legumbres','Edamame, frozen, unprepared',{'al':['soja']}),
 ('hummus','Hummus','preparado','legumbres','Hummus, commercial',{'al':['sésamo'],'chk':True}),
 # verduras
 ('calabacin','Calabacín','crudo','verdura','Squash, summer, zucchini, includes skin, raw',{}),
 ('zanahoria','Zanahoria','crudo','verdura','Carrots, raw',{}),
 ('judias-verdes','Judías verdes','crudo','verdura','Beans, snap, green, raw',{}),
 ('calabaza','Calabaza','crudo','verdura','Pumpkin, raw',{}),
 ('hojas-verdes','Lechuga romana','crudo','verdura','Lettuce, cos or romaine, raw',{}),
 ('espinacas','Espinacas','crudo','verdura','Spinach, raw',{}),
 ('brocoli','Brócoli','crudo','verdura','Broccoli, raw',{}),
 ('coliflor','Coliflor','crudo','verdura','Cauliflower, raw',{}),
 ('pimiento-rojo','Pimiento rojo','crudo','verdura','Peppers, sweet, red, raw',{}),
 ('pimiento-verde','Pimiento verde','crudo','verdura','Peppers, sweet, green, raw',{}),
 ('cebolla','Cebolla','crudo','verdura','Onions, raw',{}),
 ('tomate','Tomate','crudo','verdura','Tomatoes, red, ripe, raw, year round average',{}),
 ('tomate-triturado','Tomate triturado sin sal añadida','conserva','verdura','Tomato products, canned, puree, without salt added',{'chk':True}),
 ('berenjena','Berenjena','crudo','verdura','Eggplant, raw',{}),
 ('champinones','Champiñones','crudo','verdura','Mushrooms, white, raw',{}),
 ('pepino','Pepino','crudo','verdura','Cucumber, with peel, raw',{}),
 ('puerro','Puerro','crudo','verdura','Leeks, (bulb and lower leaf-portion), raw',{}),
 ('esparragos','Espárragos verdes','crudo','verdura','Asparagus, raw',{}),
 ('alcachofa','Alcachofa','crudo','verdura','Artichokes, (globe or french), raw',{}),
 ('repollo','Repollo','crudo','verdura','Cabbage, raw',{}),
 ('acelgas','Acelgas','crudo','verdura','Chard, swiss, raw',{}),
 ('remolacha','Remolacha','crudo','verdura','Beets, raw',{}),
 ('rucula','Rúcula','crudo','verdura','Arugula, raw',{}),
 # fruta (el kiwi no se incluye: alergia)
 ('platano','Plátano','parte comestible','fruta','Bananas, raw',{}),
 ('manzana','Manzana','con piel','fruta','Apples, raw, with skin',{}),
 ('naranja','Naranja','parte comestible','fruta','Oranges, raw, all commercial varieties',{}),
 ('mandarina','Mandarina','parte comestible','fruta','Tangerines, (mandarin oranges), raw',{}),
 ('pera','Pera','parte comestible','fruta','Pears, raw',{}),
 ('fresas','Fresas','parte comestible','fruta','Strawberries, raw',{}),
 ('uvas','Uvas','parte comestible','fruta','Grapes, red or green (European type, such as Thompson seedless), raw',{}),
 ('melocoton','Melocotón','parte comestible','fruta','Peaches, raw',{}),
 ('melon','Melón','parte comestible','fruta','Melons, cantaloupe, raw',{}),
 ('sandia','Sandía','parte comestible','fruta','Watermelon, raw',{}),
 ('pina','Piña','parte comestible','fruta','Pineapple, raw, all varieties',{}),
 ('arandanos','Arándanos','parte comestible','fruta','Blueberries, raw',{}),
 ('ciruelas','Ciruelas','parte comestible','fruta','Plums, raw',{}),
 ('albaricoques','Albaricoques','parte comestible','fruta','Apricots, raw',{}),
 ('cerezas','Cerezas','parte comestible','fruta','Cherries, sweet, raw',{}),
 ('caqui','Caqui','parte comestible','fruta','Persimmons, japanese, raw',{}),
 ('aguacate','Aguacate','parte comestible','fruta','Avocados, raw, all commercial varieties',{}),
 # frutos secos y grasas
 ('nueces','Nueces','sin cáscara','frutos secos','Nuts, walnuts, english',{'al':['frutos de cáscara']}),
 ('almendras','Almendras','sin cáscara','frutos secos','Nuts, almonds',{'al':['frutos de cáscara']}),
 ('avellanas','Avellanas','sin cáscara','frutos secos','Nuts, hazelnuts or filberts',{'al':['frutos de cáscara']}),
 ('pistachos','Pistachos','sin cáscara','frutos secos','Nuts, pistachio nuts, raw',{'al':['frutos de cáscara']}),
 ('anacardos','Anacardos','sin cáscara','frutos secos','Nuts, cashew nuts, raw',{'al':['frutos de cáscara']}),
 ('cacahuetes','Cacahuetes sin sal','sin cáscara','frutos secos','Peanuts, all types, raw',{'al':['cacahuetes']}),
 ('pipas-calabaza','Pipas de calabaza','sin cáscara','frutos secos','Seeds, pumpkin and squash seed kernels, dried',{}),
 ('pipas-girasol','Pipas de girasol sin sal','sin cáscara','frutos secos','Seeds, sunflower seed kernels, dried',{}),
 ('crema-cacahuete','Crema de cacahuete sin sal','untable','frutos secos','Peanut butter, smooth style, without salt',{'al':['cacahuetes'],'chk':True}),
 ('aceite-oliva','Aceite de oliva','aceite','grasas','Oil, olive, salad or cooking',{}),
]

foods = {r['food']: r['food_id'] for r in csv.DictReader(open(f'{SRC}/food.csv'))}
ids = {}
for slug, name, state, cat, desc, ex in F:
    if desc not in foods: sys.exit(f'No está en SR26: {desc}')
    ids[foods[desc]] = slug
vals = {s: {} for s in ids.values()}
for r in csv.DictReader(open(f'{SRC}/nutrient.csv')):
    s = ids.get(r['food_id'])
    if s and r['value'] != '': vals[s][int(r['nutr_id'])] = float(r['value'])
weights = {}
for r in csv.DictReader(open(f'{SRC}/weight.csv')):
    s = ids.get(r['food_id'])
    if s: weights.setdefault(s, []).append((r['desc'], float(r['amount']), float(r['weight'])))

out = []
for slug, name, state, cat, desc, ex in F:
    v = vals[slug]; ndb = foods[desc]
    q = 'estimated' if ex.get('similar') else 'available'
    src = f'USDA SR26 NDB {ndb}'
    n = {k: v[i] for k, i in NUT.items() if i in v}
    # Hidratos disponibles (convención europea): «por diferencia» de USDA menos la fibra. Sin fibra conocida no se calcula.
    if CARB in v and 291 in v: n['carbs'] = round(max(0.0, v[CARB] - v[291]), 2)
    if EPA in v and DHA in v: n['epadha'] = round(v[EPA] + v[DHA], 3)
    f = {'slug': slug, 'name': name, 'state': state, 'category': cat, 'basis': '100g', 'allergens': ex.get('al', []),
         'allergen_status': 'unknown' if ex.get('chk') else 'known', 'dairy': ex.get('dairy', 'none'), 'q': q, 'n': n,
         'source': 'USDA National Nutrient Database for Standard Reference, Release 26' + (f" · estimado por alimento similar: {ex['similar']}" if ex.get('similar') else ''),
         'source_id': f'NDB {ndb}', 'source_version': 'SR26 (2013)', 'usda_name': desc}
    if ex.get('unit'):
        w = [x for x in weights[slug] if x[0].startswith(ex['unit'])]
        f['unit_g'] = round(w[0][2] / w[0][1], 1)
    if ex.get('ml'):
        w = [x for x in weights[slug] if x[0].startswith('cup')]
        f['density_g_ml'] = round(w[0][2] / w[0][1] / 236.588, 3)  # 1 taza de EE. UU. = 236,588 ml
    out.append(f)
open(OUT, 'w').write('// GENERADO por scripts/dieta/build-foods.py a partir de USDA SR26. No editar a mano.\nexport default ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'alimentos')
