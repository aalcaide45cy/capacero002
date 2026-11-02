-- Teleprompter (/tp): cámara remota en el PC. Guarda solo el «saludo» inicial entre el móvil y el PC
-- (oferta y respuesta de WebRTC, unos pocos KB). Las filas se borran a los 30 minutos; la imagen nunca pasa por aquí.
CREATE TABLE IF NOT EXISTS tp_remote_rooms (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9]{10}$'),
  offer text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tp_remote_rooms_created_idx ON tp_remote_rooms (created_at);
