-- 008: campos bilingüe para titulares publicados
-- Ya ejecutado manualmente en Supabase Dashboard

ALTER TABLE titulares_envios
  ADD COLUMN IF NOT EXISTS titulo_en  TEXT,
  ADD COLUMN IF NOT EXISTS resumen_en TEXT,
  ADD COLUMN IF NOT EXISTS cuerpo_en  TEXT;

COMMENT ON COLUMN titulares_envios.titulo_en  IS 'Título en inglés (opcional, fallback a titulo si vacío)';
COMMENT ON COLUMN titulares_envios.resumen_en IS 'Resumen en inglés (opcional, fallback a resumen si vacío)';
COMMENT ON COLUMN titulares_envios.cuerpo_en  IS 'Cuerpo en inglés (opcional, fallback a cuerpo si vacío)';
