-- Esquema inicial Capa Cero 3D (Neon Postgres). Se ejecuta con: node scripts/db/migrate.js
-- Roles: app_web (DML) y migrator (DDL). Los permisos por defecto de migrator ya conceden DML a app_web.
CREATE TABLE IF NOT EXISTS videos (
  youtube_id text PRIMARY KEY CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  published_at timestamptz,
  duration text,
  views bigint NOT NULL DEFAULT 0,
  likes bigint NOT NULL DEFAULT 0,
  comments bigint NOT NULL DEFAULT 0,
  is_short boolean NOT NULL DEFAULT false,
  is_scheduled boolean NOT NULL DEFAULT false,
  scheduled_date timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  playlist_id text,
  playlist_title text,
  key_tip text,
  downloads jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'youtube',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS videos_published_idx ON videos (published_at DESC) WHERE NOT hidden;
-- Resto de tablas (video_stats_history, push_subscriptions, notifications, visits, vaults, settings,
-- sync_runs, admin_users, admin_sessions, login_attempts, audit_log) ya existen en Neon desde el esquema v1
-- y se versionarán en migraciones siguientes.
