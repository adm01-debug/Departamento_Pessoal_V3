
-- RLS policies para bucket comprovantes-despesas
-- Path convention: {empresa_id}/{despesa_id}/{filename}

DROP POLICY IF EXISTS "comprovantes_select" ON storage.objects;
CREATE POLICY "comprovantes_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes-despesas'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "comprovantes_insert" ON storage.objects;
CREATE POLICY "comprovantes_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes-despesas'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "comprovantes_update" ON storage.objects;
CREATE POLICY "comprovantes_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'comprovantes-despesas'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);

DROP POLICY IF EXISTS "comprovantes_delete" ON storage.objects;
CREATE POLICY "comprovantes_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comprovantes-despesas'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_empresas(auth.uid()))
);
