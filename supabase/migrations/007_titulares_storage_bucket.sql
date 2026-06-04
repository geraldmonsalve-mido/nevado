-- 007: bucket de Storage para imágenes de titulares
-- Ejecutar en Supabase Dashboard → SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('titulares-imagenes', 'titulares-imagenes', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer (bucket público)
CREATE POLICY "Public read titulares-imagenes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'titulares-imagenes');

-- Política: solo usuarios autenticados pueden subir
CREATE POLICY "Auth upload titulares-imagenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'titulares-imagenes'
    AND auth.role() = 'authenticated'
  );

-- Política: el propietario puede borrar su propia imagen
CREATE POLICY "Owner delete titulares-imagenes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'titulares-imagenes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
