-- Sustitutos en Neon de lo que quedaba en Google Sheets: emparejamiento por QR de la bóveda de notas,
-- detalle de las sesiones para /estadisticas e ideas de vídeo marcadas como hechas.

-- Intercambio temporal (5 minutos) entre el PC que muestra el QR y el móvil que lo escanea.
CREATE TABLE IF NOT EXISTS vault_pairs (
  pair_id text PRIMARY KEY,
  src text,
  dst text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Una fila por sesión de visita con el detalle que antes se enviaba a la pestaña «Estadisticas».
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  country text NOT NULL DEFAULT '',
  country_code text NOT NULL DEFAULT '',
  flag text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  os text NOT NULL DEFAULT '',
  browser text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  active_seconds int NOT NULL DEFAULT 0,
  subscribed boolean NOT NULL DEFAULT false,
  subscribed_from text NOT NULL DEFAULT '',
  dwell jsonb NOT NULL DEFAULT '{}'::jsonb,
  clicked jsonb NOT NULL DEFAULT '[]'::jsonb,
  downloads jsonb NOT NULL DEFAULT '[]'::jsonb,
  searches jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctor jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'web',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_sessions_ts_idx ON analytics_sessions (ts DESC);

-- Búsquedas de visitantes que ya se han convertido en vídeo (panel de ideas de /estadisticas).
CREATE TABLE IF NOT EXISTS ideas_done (
  term text PRIMARY KEY,
  done_at timestamptz NOT NULL DEFAULT now()
);
