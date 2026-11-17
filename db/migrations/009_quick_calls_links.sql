-- Llamadas rápidas: vinculación por QR. Cada instalación de la extensión es un "link" con su propia clave (se guarda el hash);
-- el iPhone se vincula escaneando un código de un solo uso. Solo se añaden tablas/columnas call_*, nada existente se modifica.
CREATE TABLE IF NOT EXISTS call_links (
  id bigserial PRIMARY KEY,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS call_link_codes (
  code_hash text PRIMARY KEY,
  link_id bigint NOT NULL REFERENCES call_links(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

ALTER TABLE call_subscriptions ADD COLUMN IF NOT EXISTS link_id bigint REFERENCES call_links(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS call_subscriptions_link_idx ON call_subscriptions (link_id);

-- El historial admite teléfonos, enlaces y texto.
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'phone';
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS link_id bigint REFERENCES call_links(id) ON DELETE CASCADE;
ALTER TABLE call_history ALTER COLUMN number DROP NOT NULL;
