-- Panel /admin: estados nuevos para las notificaciones (reserva de envío y cancelación).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
  CHECK (status = ANY (ARRAY['draft','scheduled','sending','sent','failed','cancelled']));
