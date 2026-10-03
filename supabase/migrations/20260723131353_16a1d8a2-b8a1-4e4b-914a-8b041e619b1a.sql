
-- RLS storage.objects para bucket 'medidas-disciplinares'
-- Convenção: path = {empresa_id}/{medida_id}/{arquivo}

DROP POLICY IF EXISTS "medidas_disciplinares_storage_select" ON storage;
CREATE POLICY "medidas_disciplinares_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medidas-disciplinares'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "medidas_disciplinares_storage_insert" ON storage;
CREATE POLICY "medidas_disciplinares_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medidas-disciplinares'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "medidas_disciplinares_storage_update" ON storage;
CREATE POLICY "medidas_disciplinares_storage_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'medidas-disciplinares'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "medidas_disciplinares_storage_delete" ON storage;
CREATE POLICY "medidas_disciplinares_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medidas-disciplinares'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);
