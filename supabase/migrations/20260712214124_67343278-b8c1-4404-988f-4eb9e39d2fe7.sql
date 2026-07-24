
-- === documentos-admissao ===
DROP POLICY IF EXISTS "Anyone can upload admissao documents"              ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload admissao documents" ON storage.objects;
CREATE POLICY "Auth users upload admissao documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-admissao');

DROP POLICY IF EXISTS "Authenticated users can delete admissao documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete admissao documents" ON storage.objects;
CREATE POLICY "Auth users delete admissao documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-admissao');

-- === assinaturas (mantém fluxo por token) ===
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload signatures" ON storage.objects;
CREATE POLICY "Auth users upload signatures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Auth users view signatures" ON storage.objects;
CREATE POLICY "Auth users view signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas');

-- === ponto-biometria ===
DROP POLICY IF EXISTS "Colaboradores podem fazer upload de suas fotos de ponto" ON storage.objects;
DROP POLICY IF EXISTS "Colab upload fotos ponto" ON storage.objects;
CREATE POLICY "Colab upload fotos ponto"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ponto-biometria');

DROP POLICY IF EXISTS "Colaboradores podem ver suas próprias fotos de ponto" ON storage.objects;
DROP POLICY IF EXISTS "Colab ver próprias fotos ponto" ON storage.objects;
CREATE POLICY "Colab ver próprias fotos ponto"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ponto-biometria' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Gestores podem ver fotos de ponto da empresa" ON storage.objects;
DROP POLICY IF EXISTS "Gestores ver fotos ponto empresa" ON storage.objects;
CREATE POLICY "Gestores ver fotos ponto empresa"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ponto-biometria'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::public.app_role,'gestor'::public.app_role])
    )
  );

-- === afastamentos ===
DROP POLICY IF EXISTS "Upload de arquivos de afastamento" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload afastamentos" ON storage.objects;
CREATE POLICY "Auth users upload afastamentos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'afastamentos');

-- === documentos-colaboradores ===
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete documentos-colaboradores" ON storage.objects;
CREATE POLICY "Auth users delete documentos-colaboradores"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-colaboradores');

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload documentos-colaboradores" ON storage.objects;
CREATE POLICY "Auth users upload documentos-colaboradores"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-colaboradores');

DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users view documentos-colaboradores" ON storage.objects;
CREATE POLICY "Auth users view documentos-colaboradores"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-colaboradores');
