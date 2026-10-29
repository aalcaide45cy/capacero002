-- Fase 3: modelos de MakerWorld, suscriptores de email, histórico de analítica y archivo de hojas antiguas.
CREATE TABLE IF NOT EXISTS models (
  id bigserial PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0,
  name text NOT NULL,
  link text NOT NULL DEFAULT 'https://makerworld.com/en/@capa_cero',
  description text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '✨ NUEVO',
  button_text text NOT NULL DEFAULT 'IR A DISEÑO',
  price text NOT NULL DEFAULT '0',
  show_price boolean NOT NULL DEFAULT false,
  carousel_interval int NOT NULL DEFAULT 3500,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  birth_date date,
  country text,
  source text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','bounced','invalid')),
  consent_marketing boolean NOT NULL DEFAULT false,
  consent_note text,
  consent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_uniq ON subscribers (lower(email));

CREATE TABLE IF NOT EXISTS analytics_daily (
  day date NOT NULL,
  country text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  os text NOT NULL DEFAULT '',
  browser text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  sessions int NOT NULL DEFAULT 0,
  active_seconds bigint NOT NULL DEFAULT 0,
  subscribed int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country, device, os, browser, origin)
);

-- Filas de hojas de cálculo antiguas conservadas tal cual (afiliados, cursos, historial de avisos...).
CREATE TABLE IF NOT EXISTS legacy_sheet_rows (
  id bigserial PRIMARY KEY,
  sheet text NOT NULL,
  tab text NOT NULL,
  row_num int NOT NULL,
  data jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
