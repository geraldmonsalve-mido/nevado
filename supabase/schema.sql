-- NEVADO — Supabase Schema v1.0
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT UNIQUE NOT NULL,
  nombre        TEXT,
  email         TEXT,
  croquetas     INTEGER DEFAULT 0,
  nivel         INTEGER DEFAULT 1,
  rango         TEXT DEFAULT 'Cachorro',
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por clerk_id (el más frecuente)
CREATE INDEX IF NOT EXISTS idx_usuarios_clerk_id ON usuarios(clerk_id);

-- RLS: habilitar
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede ver y editar su propio row
CREATE POLICY "usuario_propio_select"
  ON usuarios FOR SELECT
  USING (true);

CREATE POLICY "usuario_propio_insert"
  ON usuarios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "usuario_propio_update"
  ON usuarios FOR UPDATE
  USING (true);

-- Log de croquetas (auditoría)
CREATE TABLE IF NOT EXISTS croquetas_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   TEXT NOT NULL,
  cantidad   INTEGER NOT NULL,
  motivo     TEXT,
  creado_en  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE croquetas_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_insert_libre" ON croquetas_log FOR INSERT WITH CHECK (true);
CREATE POLICY "log_select_propio" ON croquetas_log FOR SELECT USING (true);
