-- =============================================================================
-- T008 — Tenant path-scoping for storage bucket SELECT (and INSERT) policies
--
-- Problem: migration 20260719150000 replaced public-access policies with
-- authenticated-only ones, but SELECT policies still allowed any authenticated
-- user to list/read objects from ANY tenant's folder in:
--   afastamentos, documentos, documentos-colaboradores, comprovantes-despesas
--
-- A user from empresa A could call storage.from('afastamentos').list() and
-- receive empresa B's medical/leave documents — a cross-tenant data leak.
--
-- Fix: add `user_belongs_to_empresa(auth.uid(), foldername[1]::uuid)` to each
-- SELECT (and matching INSERT WITH CHECK) policy. Files are stored under
-- the pattern {empresa_id}/{...rest}, so foldername(name)[1] == empresa_id.
--
-- documentos-admissao is intentionally left unchanged: that bucket stores
-- onboarding docs uploaded via token-based flow before the user has an
-- empresa binding; HR accesses docs by auth session, not by empresa path.
-- =============================================================================

-- ─── afastamentos ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "afastamentos_select_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- INSERT path must also match the caller's empresa (prevents writing into another tenant's folder)
DROP POLICY IF EXISTS "afastamentos_insert_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- UPDATE path must also match
DROP POLICY IF EXISTS "afastamentos_update_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ─── documentos ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documentos_select_authenticated" ON storage.objects;
CREATE POLICY "documentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "documentos_insert_authenticated" ON storage.objects;
CREATE POLICY "documentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "documentos_update_authenticated" ON storage.objects;
CREATE POLICY "documentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ─── documentos-colaboradores ────────────────────────────────────────────────
DROP POLICY IF EXISTS "docs_colab_select_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-colaboradores'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "docs_colab_insert_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-colaboradores'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ─── comprovantes-despesas ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "comprovantes_despesas_select" ON storage.objects;
CREATE POLICY "comprovantes_despesas_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes-despesas'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "comprovantes_despesas_insert" ON storage.objects;
CREATE POLICY "comprovantes_despesas_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes-despesas'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
