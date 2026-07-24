
DROP POLICY IF EXISTS "contab_anexos_select" ON storage.objects;
CREATE POLICY "contab_anexos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contabilidade-anexos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "contab_anexos_insert" ON storage.objects;
CREATE POLICY "contab_anexos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contabilidade-anexos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "contab_anexos_update" ON storage.objects;
CREATE POLICY "contab_anexos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contabilidade-anexos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "contab_anexos_delete" ON storage.objects;
CREATE POLICY "contab_anexos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contabilidade-anexos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid));
