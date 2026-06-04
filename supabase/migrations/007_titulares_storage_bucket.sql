-- 007: bucket de Storage para imágenes de titulares
-- EJECUTAR MANUALMENTE en Supabase Dashboard → SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('titulares-imagenes', 'titulares-imagenes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read titulares images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'titulares-imagenes');

CREATE POLICY "Auth upload titulares images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'titulares-imagenes');
