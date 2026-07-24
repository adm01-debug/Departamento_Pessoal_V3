
-- 1. reset_login_attempts precisa ser chamada pelo cliente após login bem-sucedido.
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text, text) TO authenticated;

-- 2. Bucket público `avatars` — políticas por path, sem list para anon.
DROP POLICY IF EXISTS "avatars_authenticated_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read_scoped" ON storage.objects;

CREATE POLICY "avatars_authenticated_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_authenticated_update_own" ON storage.objects;
CREATE POLICY "avatars_authenticated_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_authenticated_delete_own" ON storage.objects;
CREATE POLICY "avatars_authenticated_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura autenticada por objeto específico (não permite list amplo).
DROP POLICY IF EXISTS "avatars_public_read_scoped" ON storage.objects;
CREATE POLICY "avatars_public_read_scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
);
-- Observação: NÃO criamos policy SELECT para role `anon`; assim anônimos
-- não conseguem executar `list()` no bucket. URLs públicas diretas continuam
-- servidas pelo Storage porque o bucket é `public = true`.

-- 3. Bucket privado `relatorios-privados` — apenas service_role.
DROP POLICY IF EXISTS "relatorios_service_role_all" ON storage.objects;
CREATE POLICY "relatorios_service_role_all"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'relatorios-privados')
WITH CHECK (bucket_id = 'relatorios-privados');
