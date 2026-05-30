-- 006: sección de destino e imagen para titulares publicados
ALTER TABLE titulares_envios
  ADD COLUMN IF NOT EXISTS destino    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS imagen_url TEXT DEFAULT NULL;

COMMENT ON COLUMN titulares_envios.destino IS
  'Sección de destino en Titulares: portada | relevante | secundario | profundidad | oportunidades';
COMMENT ON COLUMN titulares_envios.imagen_url IS
  'URL opcional de imagen de cabecera para Portada y Relevante';
