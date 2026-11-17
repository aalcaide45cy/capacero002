-- Llamadas rápidas (/qpush). Solo crea tablas nuevas con prefijo call_ (no toca ninguna tabla existente).
-- Se guardan únicamente las suscripciones push, los últimos números recibidos (se recortan a 20) y contadores de límite.
CREATE TABLE IF NOT EXISTS call_subscriptions (
  id bigserial PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_key_hash text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_subscriptions_key_idx ON call_subscriptions (device_key_hash);

CREATE TABLE IF NOT EXISTS call_history (
  id bigserial PRIMARY KEY,
  number text NOT NULL,
  raw text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Códigos de emparejamiento de un solo uso (se guarda su hash; caducan a los 10 minutos).
CREATE TABLE IF NOT EXISTS call_pair_codes (
  code_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Límite de peticiones por IP (se purga a diario).
CREATE TABLE IF NOT EXISTS call_hits (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  ip text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_hits_idx ON call_hits (kind, ip, ts);
