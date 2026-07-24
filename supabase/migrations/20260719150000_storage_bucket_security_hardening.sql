-- Storage Bucket Security Hardening
-- Critical: afastamentos bucket was PUBLIC with no auth policies
-- This migration makes sensitive buckets private and enforces authentication.

-- =============================================================================
-- CRITICAL: afastamentos — was public:true with unauthenticated access
-- Medical/leave documents must be private and require authentication
-- =============================================================================
UPDATE storage.buckets SET public = false WHERE id = 'afastamentos';

DROP POLICY IF EXISTS "Acesso publico aos arquivos de afastamento" ON storage.objects;
DROP POLICY IF EXISTS "Upload de arquivos de afastamento" ON storage.objects;

DROP POLICY IF EXISTS "afastamentos_select_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'afastamentos');

DROP POLICY IF EXISTS "afastamentos_insert_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'afastamentos');

DROP POLICY IF EXISTS "afastamentos_update_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'afastamentos');

DROP POLICY IF EXISTS "afastamentos_delete_rh_admin" ON storage.objects;
CREATE POLICY "afastamentos_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'afastamentos'
    AND auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role IN ('admin', 'rh')
    )
  );

-- =============================================================================
-- documentos-admissao: "Anyone can upload/view" is too permissive
-- INSERT without auth is needed for onboarding token flow (ContratacaoPage)
-- SELECT should require authentication (HR reviewing uploaded docs)
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can upload admissao documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view admissao documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete admissao documents" ON storage.objects;

-- Allow public INSERT (needed for token-based onboarding portal)
DROP POLICY IF EXISTS "admissao_docs_insert_public" ON storage.objects;
CREATE POLICY "admissao_docs_insert_public"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'documentos-admissao');

-- Viewing requires authentication (HR team reviewing submitted docs)
DROP POLICY IF EXISTS "admissao_docs_select_authenticated" ON storage.objects;
CREATE POLICY "admissao_docs_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-admissao');

-- Delete restricted to admin/RH
DROP POLICY IF EXISTS "admissao_docs_delete_rh_admin" ON storage.objects;
CREATE POLICY "admissao_docs_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-admissao'
    AND auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role IN ('admin', 'rh')
    )
  );

-- =============================================================================
-- documentos: "FOR ALL TO authenticated" is overly broad
-- Replace with explicit per-operation policies
-- =============================================================================
DROP POLICY IF EXISTS "Auth users upload documentos" ON storage.objects;

DROP POLICY IF EXISTS "documentos_select_authenticated" ON storage.objects;
CREATE POLICY "documentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "documentos_insert_authenticated" ON storage.objects;
CREATE POLICY "documentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "documentos_update_authenticated" ON storage.objects;
CREATE POLICY "documentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "documentos_delete_rh_admin" ON storage.objects;
CREATE POLICY "documentos_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role IN ('admin', 'rh')
    )
  );

-- =============================================================================
-- documentos-colaboradores: same issue, replace with explicit policies
-- =============================================================================
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

DROP POLICY IF EXISTS "docs_colab_select_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-colaboradores');

DROP POLICY IF EXISTS "docs_colab_insert_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-colaboradores');

DROP POLICY IF EXISTS "docs_colab_delete_rh_admin" ON storage.objects;
CREATE POLICY "docs_colab_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-colaboradores'
    AND auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role IN ('admin', 'rh')
    )
  );

-- =============================================================================
-- comprovantes-despesas: ensure bucket exists and has proper policies
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('comprovantes-despesas', 'comprovantes-despesas', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "comprovantes_despesas_select" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes_despesas_insert" ON storage.objects;

CREATE POLICY "comprovantes_despesas_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes-despesas');

DROP POLICY IF EXISTS "comprovantes_despesas_insert" ON storage.objects;
CREATE POLICY "comprovantes_despesas_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes-despesas');

DROP POLICY IF EXISTS "comprovantes_despesas_delete" ON storage.objects;
CREATE POLICY "comprovantes_despesas_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes-despesas'
    AND auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role IN ('admin', 'rh', 'gestor')
    )
  );
