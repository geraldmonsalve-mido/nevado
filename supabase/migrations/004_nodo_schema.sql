-- NEVADO — NODO Schema v1.0
-- Ejecutar en Supabase → SQL Editor

-- ── Forum ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foro_hilos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_clerk_id  TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  titulo          TEXT,
  contenido       TEXT NOT NULL,
  tipo            TEXT DEFAULT 'insight' CHECK (tipo IN ('insight','pregunta','recurso','experiencia','oportunidad')),
  tags            TEXT[] DEFAULT '{}',
  espacio         TEXT,
  vistas          INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  respuestas_count INTEGER DEFAULT 0,
  fijado          BOOLEAN DEFAULT false,
  cerrado         BOOLEAN DEFAULT false,
  eliminado       BOOLEAN DEFAULT false,
  creado_en       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foro_hilos_autor  ON foro_hilos(autor_clerk_id);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_fecha  ON foro_hilos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_foro_hilos_espacio ON foro_hilos(espacio);

CREATE TABLE IF NOT EXISTS foro_respuestas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hilo_id         UUID NOT NULL REFERENCES foro_hilos(id) ON DELETE CASCADE,
  autor_clerk_id  TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  contenido       TEXT NOT NULL,
  parent_id       UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  likes           INTEGER DEFAULT 0,
  eliminado       BOOLEAN DEFAULT false,
  creado_en       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foro_resp_hilo ON foro_respuestas(hilo_id);

CREATE TABLE IF NOT EXISTS foro_reacciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('like','guardar')),
  hilo_id       UUID REFERENCES foro_hilos(id) ON DELETE CASCADE,
  respuesta_id  UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  creado_en     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reaccion_hilo
  ON foro_reacciones(clerk_id, tipo, hilo_id)
  WHERE hilo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reaccion_resp
  ON foro_reacciones(clerk_id, tipo, respuesta_id)
  WHERE respuesta_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS foro_reportes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportante_clerk_id   TEXT NOT NULL,
  hilo_id               UUID REFERENCES foro_hilos(id) ON DELETE CASCADE,
  respuesta_id          UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
  motivo                TEXT NOT NULL,
  descripcion           TEXT,
  estado                TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','revisado','resuelto','descartado')),
  creado_en             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Chat ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_canales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  slug        TEXT UNIQUE NOT NULL,
  tipo        TEXT DEFAULT 'espacio' CHECK (tipo IN ('espacio','anuncio')),
  activo      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_mensajes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id        UUID NOT NULL REFERENCES chat_canales(id) ON DELETE CASCADE,
  autor_clerk_id  TEXT NOT NULL REFERENCES usuarios(clerk_id) ON DELETE CASCADE,
  contenido       TEXT NOT NULL,
  tipo            TEXT DEFAULT 'texto' CHECK (tipo IN ('texto','enlace','shout')),
  eliminado       BOOLEAN DEFAULT false,
  creado_en       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_canal ON chat_mensajes(canal_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS chat_reportes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje_id            UUID REFERENCES chat_mensajes(id) ON DELETE CASCADE,
  reportante_clerk_id   TEXT NOT NULL,
  motivo                TEXT NOT NULL,
  estado                TEXT DEFAULT 'pendiente',
  creado_en             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Moderation ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderacion_sanciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_clerk_id    TEXT NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('advertencia','mute_1h','mute_24h','mute_7d','ban_temp','ban_perm','shadow_ban')),
  motivo              TEXT NOT NULL,
  moderador_clerk_id  TEXT NOT NULL,
  activa              BOOLEAN DEFAULT true,
  expira_en           TIMESTAMP WITH TIME ZONE,
  creado_en           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanciones_usuario ON moderacion_sanciones(usuario_clerk_id, activa);

CREATE TABLE IF NOT EXISTS moderacion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion              TEXT NOT NULL,
  objeto_tipo         TEXT,
  objeto_id           UUID,
  moderador_clerk_id  TEXT NOT NULL,
  detalles            JSONB,
  creado_en           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nodo_reputacion_eventos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id        TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  puntos          INTEGER NOT NULL,
  referencia_id   UUID,
  creado_en       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── RLS Policies ───────────────────────────────────────────────────────────

ALTER TABLE foro_hilos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_respuestas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reacciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reportes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_canales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reportes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderacion_sanciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderacion_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodo_reputacion_eventos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_hilos' AND policyname='foro_hilos_select') THEN
    CREATE POLICY foro_hilos_select       ON foro_hilos FOR SELECT USING (eliminado = false);
    CREATE POLICY foro_hilos_insert       ON foro_hilos FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_hilos_update       ON foro_hilos FOR UPDATE USING (true);
    CREATE POLICY foro_respuestas_select  ON foro_respuestas FOR SELECT USING (eliminado = false);
    CREATE POLICY foro_respuestas_insert  ON foro_respuestas FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_respuestas_update  ON foro_respuestas FOR UPDATE USING (true);
    CREATE POLICY foro_reacciones_all     ON foro_reacciones FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY foro_reportes_insert    ON foro_reportes FOR INSERT WITH CHECK (true);
    CREATE POLICY foro_reportes_select    ON foro_reportes FOR SELECT USING (true);
    CREATE POLICY chat_canales_select     ON chat_canales FOR SELECT USING (activo = true);
    CREATE POLICY chat_mensajes_select    ON chat_mensajes FOR SELECT USING (eliminado = false);
    CREATE POLICY chat_mensajes_insert    ON chat_mensajes FOR INSERT WITH CHECK (true);
    CREATE POLICY chat_mensajes_update    ON chat_mensajes FOR UPDATE USING (true);
    CREATE POLICY chat_reportes_insert    ON chat_reportes FOR INSERT WITH CHECK (true);
    CREATE POLICY chat_reportes_select    ON chat_reportes FOR SELECT USING (true);
    CREATE POLICY sanciones_select        ON moderacion_sanciones FOR SELECT USING (true);
    CREATE POLICY sanciones_insert        ON moderacion_sanciones FOR INSERT WITH CHECK (true);
    CREATE POLICY sanciones_update        ON moderacion_sanciones FOR UPDATE USING (true);
    CREATE POLICY mod_log_insert          ON moderacion_log FOR INSERT WITH CHECK (true);
    CREATE POLICY mod_log_select          ON moderacion_log FOR SELECT USING (true);
    CREATE POLICY rep_eventos_all         ON nodo_reputacion_eventos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Realtime ───────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE foro_hilos;
ALTER PUBLICATION supabase_realtime ADD TABLE foro_respuestas;

-- ── Default Channels ───────────────────────────────────────────────────────

INSERT INTO chat_canales (nombre, descripcion, slug, tipo) VALUES
  ('General',                'Canal general del ecosistema NEVADO',          'general',            'espacio'),
  ('Programadores VE',       'Espacio para desarrolladores venezolanos',      'programadores-ve',   'espacio'),
  ('Freelancers LATAM',      'Proyectos y conexiones freelance',              'freelancers-latam',  'espacio'),
  ('Venezolanos en Madrid',  'Comunidad venezolana en España',                'venezolanos-madrid', 'espacio'),
  ('IA y Automatización',    'Inteligencia artificial y tecnología',          'ia-automatizacion',  'espacio'),
  ('Anuncios NEVADO',        'Comunicados oficiales del ecosistema',          'anuncios',           'anuncio')
ON CONFLICT (slug) DO NOTHING;
