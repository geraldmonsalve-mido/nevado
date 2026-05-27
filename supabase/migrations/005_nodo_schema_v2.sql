-- NEVADO — NODO Schema v2.0
-- Corrige nombres: autor_clerk_id→autor_id, eliminado→estado,
-- likes→total_reacciones, respuestas_count→total_respuestas
-- Agrega: foro_categorias, campos denormalizados, RPCs

-- ── Drop v1 foro tables ────────────────────────────────────────────────────

DROP TABLE IF EXISTS foro_reportes    CASCADE;
DROP TABLE IF EXISTS foro_reacciones  CASCADE;
DROP TABLE IF EXISTS foro_respuestas  CASCADE;
DROP TABLE IF EXISTS foro_hilos       CASCADE;
DROP TABLE IF EXISTS foro_categorias  CASCADE;

-- ── Categorías ─────────────────────────────────────────────────────────────

CREATE TABLE foro_categorias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  icono         TEXT DEFAULT '◉',
  color_acento  TEXT DEFAULT '#E74C3C',
  descripcion   TEXT,
  activo        BOOLEAN DEFAULT true,
  orden         INTEGER DEFAULT 99,
  creado_en     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Hilos ──────────────────────────────────────────────────────────────────

CREATE TABLE foro_hilos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id          TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  autor_nombre      TEXT NOT NULL DEFAULT 'Usuario',
  autor_avatar      TEXT,
  autor_rango       TEXT DEFAULT 'Cachorro',
  titulo            TEXT,
  contenido         TEXT NOT NULL,
  tipo              TEXT DEFAULT 'insight'
                    CHECK (tipo IN ('insight','pregunta','recurso','experiencia','oportunidad')),
  tags              TEXT[] DEFAULT '{}',
  categoria_id      UUID REFERENCES foro_categorias(id) ON DELETE SET NULL,
  modulo_origen     TEXT,
  referencia_url    TEXT,
  vistas            INTEGER DEFAULT 0,
  total_reacciones  INTEGER DEFAULT 0,
  total_respuestas  INTEGER DEFAULT 0,
  ultimo_movimiento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  destacado         BOOLEAN DEFAULT false,
  fijado            BOOLEAN DEFAULT false,
  cerrado           BOOLEAN DEFAULT false,
  estado            TEXT DEFAULT 'activo'
                    CHECK (estado IN ('activo','eliminado','moderado','oculto')),
  creado_en         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foro_hilos_autor     ON foro_hilos(autor_id);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_fecha     ON foro_hilos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_cat       ON foro_hilos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_estado    ON foro_hilos(estado);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_destacado ON foro_hilos(destacado, creado_en DESC);

-- ── Respuestas ─────────────────────────────────────────────────────────────

CREATE TABLE foro_respuestas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hilo_id           UUID NOT NULL REFERENCES foro_hilos(id) ON DELETE CASCADE,
  autor_id          TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  autor_nombre      TEXT NOT NULL DEFAULT 'Usuario',
  autor_avatar      TEXT,
  autor_rango       TEXT DEFAULT 'Cachorro',
  contenido         TEXT NOT NULL,
  parent_id         UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  total_reacciones  INTEGER DEFAULT 0,
  estado            TEXT DEFAULT 'activo'
                    CHECK (estado IN ('activo','eliminado','moderado')),
  creado_en         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foro_resp_hilo ON foro_respuestas(hilo_id, creado_en ASC);

-- ── Reacciones ─────────────────────────────────────────────────────────────

CREATE TABLE foro_reacciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('like','guardar')),
  hilo_id       UUID REFERENCES foro_hilos(id) ON DELETE CASCADE,
  respuesta_id  UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  creado_en     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reaccion_hilo
  ON foro_reacciones(usuario_id, tipo, hilo_id)
  WHERE hilo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reaccion_resp
  ON foro_reacciones(usuario_id, tipo, respuesta_id)
  WHERE respuesta_id IS NOT NULL;

-- ── Reportes ───────────────────────────────────────────────────────────────

CREATE TABLE foro_reportes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportante_id   TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  hilo_id         UUID REFERENCES foro_hilos(id) ON DELETE CASCADE,
  respuesta_id    UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  motivo          TEXT NOT NULL,
  descripcion     TEXT,
  estado          TEXT DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','revisado','resuelto','descartado')),
  creado_en       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Rename moderacion_sanciones columns (idempotente) ────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderacion_sanciones' AND column_name = 'usuario_clerk_id'
  ) THEN
    ALTER TABLE moderacion_sanciones RENAME COLUMN usuario_clerk_id TO usuario_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderacion_sanciones' AND column_name = 'moderador_clerk_id'
  ) THEN
    ALTER TABLE moderacion_sanciones RENAME COLUMN moderador_clerk_id TO moderador_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderacion_log' AND column_name = 'moderador_clerk_id'
  ) THEN
    ALTER TABLE moderacion_log RENAME COLUMN moderador_clerk_id TO moderador_id;
  END IF;
END $$;

-- ── RPC Functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_hilo_replies(hilo_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE foro_hilos
  SET total_respuestas = total_respuestas + 1, ultimo_movimiento = NOW()
  WHERE id = hilo_id;
$$;

CREATE OR REPLACE FUNCTION decrement_hilo_replies(hilo_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE foro_hilos
  SET total_respuestas = GREATEST(0, total_respuestas - 1)
  WHERE id = hilo_id;
$$;

CREATE OR REPLACE FUNCTION increment_hilo_reacciones(hilo_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE foro_hilos SET total_reacciones = total_reacciones + 1 WHERE id = hilo_id;
$$;

CREATE OR REPLACE FUNCTION decrement_hilo_reacciones(hilo_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE foro_hilos
  SET total_reacciones = GREATEST(0, total_reacciones - 1) WHERE id = hilo_id;
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE foro_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_hilos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reportes   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'foro_hilos' AND policyname = 'foro_hilos_select_v2'
  ) THEN
    CREATE POLICY foro_categorias_select   ON foro_categorias FOR SELECT USING (activo = true);
    CREATE POLICY foro_hilos_select_v2     ON foro_hilos FOR SELECT USING (estado = 'activo');
    CREATE POLICY foro_hilos_insert_v2     ON foro_hilos FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_hilos_update_v2     ON foro_hilos FOR UPDATE USING (true);
    CREATE POLICY foro_resp_select_v2      ON foro_respuestas FOR SELECT USING (estado = 'activo');
    CREATE POLICY foro_resp_insert_v2      ON foro_respuestas FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_resp_update_v2      ON foro_respuestas FOR UPDATE USING (true);
    CREATE POLICY foro_reacciones_all_v2   ON foro_reacciones FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY foro_reportes_insert_v2  ON foro_reportes FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_reportes_select_v2  ON foro_reportes FOR SELECT USING (true);
  END IF;
END $$;

-- ── Realtime ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE foro_hilos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE foro_respuestas;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Default Categories ─────────────────────────────────────────────────────

INSERT INTO foro_categorias (nombre, slug, icono, color_acento, descripcion, orden) VALUES
  ('General',          'general',          '◉', '#E74C3C', 'Comunidad NEVADO — todo lo que no encaja en otra categoría', 1),
  ('Titulares',        'titulares',        '◎', '#2980B9', 'Noticias y análisis de Venezuela y la diáspora',             2),
  ('Capital Humano',   'capital-humano',   '⬡', '#27AE60', 'Empleo, talento, CVs, entrevistas y carrera',               3),
  ('ÁVILA',            'avila',            '▲', '#B8944A', 'Outdoor, viajes, aventura y naturaleza',                     4),
  ('Corazón Tricolor', 'corazon-tricolor', '♥', '#E74C3C', 'Causas, solidaridad e iniciativas sociales',                5),
  ('Servicios',        'servicios',        '⊞', '#9B59B6', 'Freelancers, servicios y colaboración',                      6)
ON CONFLICT (slug) DO NOTHING;
