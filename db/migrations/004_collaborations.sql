-- Mensajes del formulario de Colaboraciones (antes iban a una hoja de Google).
CREATE TABLE IF NOT EXISTS collaborations (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  kind text NOT NULL DEFAULT '',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS collaborations_status_created ON collaborations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS collaborations_ip_created ON collaborations (ip_hash, created_at);
