-- Módulo privado /dieta. Solo crea tablas nuevas con prefijo diet_ (no toca el resto de la web).
-- Las fechas de comida/peso son DATE locales (Europe/Madrid); los instantes de creación van en UTC (timestamptz).
CREATE TABLE IF NOT EXISTS diet_sessions (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  ip text,
  user_agent text,
  remember_days int NOT NULL DEFAULT 30,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS diet_sessions_owner_idx ON diet_sessions (owner_id);

CREATE TABLE IF NOT EXISTS diet_profiles (
  owner_id bigint PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Objetivos y límites (nutriente, rango, fuente y carácter provisional/introducido/revisado).
CREATE TABLE IF NOT EXISTS diet_goals (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  nutrient text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('objetivo','minimo','maximo','referencia')),
  value numeric,
  unit text NOT NULL,
  period text NOT NULL DEFAULT 'dia',
  source text,
  status text NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional','introducido','revisado')),
  valid_from date,
  valid_to date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diet_goals_owner_idx ON diet_goals (owner_id);

-- Catálogo de alimentos (owner_id NULL = catálogo compartido). nutrients: {clave:{v:número|null, q:calidad, src:texto}} por 100 g/ml.
CREATE TABLE IF NOT EXISTS diet_foods (
  id bigserial PRIMARY KEY,
  owner_id bigint REFERENCES admin_users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'crudo',
  basis text NOT NULL DEFAULT '100g' CHECK (basis IN ('100g','100ml')),
  density_g_ml numeric,
  unit_g numeric,
  brand text,
  barcode text,
  allergens text[] NOT NULL DEFAULT '{}',
  allergen_status text NOT NULL DEFAULT 'unknown' CHECK (allergen_status IN ('known','unknown')),
  dairy text NOT NULL DEFAULT 'none' CHECK (dairy IN ('none','lactose_free','with_lactose','unknown')),
  category text,
  nutrients jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  source_id text,
  source_version text,
  consulted_on date,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diet_foods_slug_idx ON diet_foods (COALESCE(owner_id, 0), slug);

CREATE TABLE IF NOT EXISTS diet_food_prices (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  food_slug text NOT NULL,
  pack_net_g numeric NOT NULL CHECK (pack_net_g > 0),
  pack_drained_g numeric,
  price_eur numeric NOT NULL CHECK (price_eur >= 0),
  store text,
  price_date date NOT NULL DEFAULT current_date,
  origin text NOT NULL DEFAULT 'manual',
  offer boolean NOT NULL DEFAULT false,
  conditions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diet_food_prices_idx ON diet_food_prices (owner_id, food_slug, price_date DESC);

-- Recetas del catálogo (owner_id NULL = borrador inicial). ingredients: [{food, g?, units?}]
CREATE TABLE IF NOT EXISTS diet_recipes (
  id bigserial PRIMARY KEY,
  owner_id bigint REFERENCES admin_users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  slot text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  servings numeric NOT NULL DEFAULT 1,
  prep text,
  active_minutes int,
  tags text[] NOT NULL DEFAULT '{}',
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diet_recipes_slug_idx ON diet_recipes (COALESCE(owner_id, 0), slug);

-- Semanas. data: {days:{'YYYY-MM-DD':{meals:[{id,slot,recipe,name,items:[{food,g,units}],locked}]}}}
CREATE TABLE IF NOT EXISTS diet_plans (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  data jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, week_start)
);

CREATE TABLE IF NOT EXISTS diet_consumption_entries (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  day date NOT NULL,
  slot text NOT NULL,
  meal_name text,
  items jsonb NOT NULL,      -- cantidades reales
  snapshot jsonb NOT NULL,   -- nutrientes calculados en ese momento y procedencia
  client_key text NOT NULL,  -- evita duplicados por doble envío
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, client_key)
);
CREATE INDEX IF NOT EXISTS diet_consumption_day_idx ON diet_consumption_entries (owner_id, day);

CREATE TABLE IF NOT EXISTS diet_measurements (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('peso','tension')),
  weight_kg numeric,
  systolic int,
  diastolic int,
  context text,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, client_key)
);
CREATE INDEX IF NOT EXISTS diet_measurements_idx ON diet_measurements (owner_id, kind, day);

CREATE TABLE IF NOT EXISTS diet_symptom_entries (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  day date NOT NULL,
  bloating smallint CHECK (bloating BETWEEN 0 AND 10),
  pain smallint CHECK (pain BETWEEN 0 AND 10),
  bowel text,
  notes text,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, client_key)
);

CREATE TABLE IF NOT EXISTS diet_pantry_items (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  food_slug text NOT NULL,
  grams numeric NOT NULL CHECK (grams >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, food_slug)
);

CREATE TABLE IF NOT EXISTS diet_shopping_checks (
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  food_slug text NOT NULL,
  bought boolean NOT NULL DEFAULT true,
  PRIMARY KEY (owner_id, week_start, food_slug)
);

CREATE TABLE IF NOT EXISTS diet_change_history (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  plan_id bigint REFERENCES diet_plans(id) ON DELETE CASCADE,
  day date,
  meal_id text,
  summary text,
  before jsonb,
  after jsonb,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diet_change_history_idx ON diet_change_history (owner_id, created_at DESC);
