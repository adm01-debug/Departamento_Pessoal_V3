-- =============================================================================
-- IMAGENS DO HUB DE TREINAMENTOS — infraestrutura de armazenamento e metadados
--
-- ESCOPO DESTA MIGRATION
--   • bucket PRIVADO `training-images`, com caminho `{empresa_id}/...`;
--   • políticas de Storage com escopo de tenant (mesmo padrão da migration
--     T008: `user_belongs_to_empresa(auth.uid(), foldername[1]::uuid)`);
--   • tabela `public.training_images` — referência de UMA capa por conteúdo,
--     com estado, tentativas e resultado (controle de custo/duplicidade);
--   • colunas de referência: NENHUMA coluna nova em `catalogo_cursos` /
--     `trilhas_aprendizado`. A referência da imagem vive só nesta tabela, para
--     existir uma única fonte de verdade e não duplicar URLs assinadas.
--
-- NÃO APLICADA EM PRODUÇÃO POR ESTA TAREFA. A geração continua desligada; a
-- aplicação só passa a LER estas capas com `VITE_TRAINING_IMAGES=true`.
--
-- Quem gera/escreve é o BACKEND (adaptador futuro, service role). O cliente
-- autenticado recebe apenas SELECT — nenhuma escrita de imagem pelo navegador.
-- =============================================================================

-- ─── 1. Bucket privado ──────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-images',
  'training-images',
  false,
  5242880, -- 5 MB por capa
  ARRAY['image/webp', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
  SET public             = false,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. Políticas de Storage ────────────────────────────────────────────────
-- SELECT: qualquer membro do tenant lê as capas da PRÓPRIA empresa.
-- INSERT/UPDATE/DELETE: apenas ADMIN do tenant. O adaptador da Fase 3 escreve
-- com service role (que ignora RLS); nenhum usuário comum pode sobrescrever ou
-- apagar capas. O caminho continua validado pelo 1º segmento (empresa_id).
DROP POLICY IF EXISTS "training_images_select_authenticated" ON storage.objects;
CREATE POLICY "training_images_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-images'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "training_images_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "training_images_insert_admin" ON storage.objects;
CREATE POLICY "training_images_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-images'
    AND public.is_admin(auth.uid())
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "training_images_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "training_images_update_admin" ON storage.objects;
CREATE POLICY "training_images_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'training-images'
    AND public.is_admin(auth.uid())
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "training_images_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "training_images_delete_admin" ON storage.objects;
CREATE POLICY "training_images_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-images'
    AND public.is_admin(auth.uid())
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );


-- ─── 3. Tabela de referência das capas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_images (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  content_type      text NOT NULL
                    CHECK (content_type IN ('course', 'learning_path', 'training_session', 'certificate')),
  content_id        uuid NOT NULL,
  -- Curso de origem quando a imagem é herdada (turma/certificado).
  source_content_id uuid,
  -- Caminho persistente no bucket (começa com o empresa_id).
  storage_path      text NOT NULL,
  -- Impressão digital do conteúdo que originou a capa (nome/descrição/etc.).
  -- Serve para: (a) não regerar quando nada mudou; (b) permitir nova capa
  -- quando o cadastro é editado.
  content_hash      text,
  status            text NOT NULL DEFAULT 'disabled'
                    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'disabled')),
  provider          text NOT NULL DEFAULT 'disabled',
  model             text,
  attempts          integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  last_error        text,
  prompt_version    text,
  requested_at      timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_images_conteudo_unico UNIQUE (empresa_id, content_type, content_id),
  CONSTRAINT training_images_caminho_unico  UNIQUE (empresa_id, storage_path),
  CONSTRAINT training_images_hash_valido
    CHECK (content_hash IS NULL OR char_length(content_hash) BETWEEN 8 AND 128),
  -- Defesa no banco: caminho tem de começar pelo tenant dono da linha.
  CONSTRAINT training_images_caminho_tenant
    CHECK (storage_path LIKE empresa_id::text || '/%')
);

COMMENT ON TABLE public.training_images IS
  'Capa de um conteúdo de treinamento. Uma linha por conteúdo; storage_path aponta para o bucket privado training-images.';
COMMENT ON COLUMN public.training_images.status IS
  'disabled = integração de geração desligada; pending/processing/succeeded/failed só existem com provedor configurado.';
COMMENT ON COLUMN public.training_images.source_content_id IS
  'Curso de origem quando a capa é herdada por turma/certificado (evita geração duplicada).';

CREATE INDEX IF NOT EXISTS idx_training_images_empresa
  ON public.training_images (empresa_id);
CREATE INDEX IF NOT EXISTS idx_training_images_status
  ON public.training_images (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_training_images_origem
  ON public.training_images (source_content_id)
  WHERE source_content_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_training_images_updated_at ON public.training_images;
CREATE TRIGGER update_training_images_updated_at
  BEFORE UPDATE ON public.training_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 4. RLS: leitura por tenant; escrita apenas pelo backend ────────────────
ALTER TABLE public.training_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_images_select_tenant" ON public.training_images;
CREATE POLICY "training_images_select_tenant"
  ON public.training_images
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- A política antiga permitia que QUALQUER admin (papel global) alterasse linhas
-- de qualquer empresa se um GRANT futuro aparecesse. A escrita é do BACKEND.
DROP POLICY IF EXISTS "training_images_admin_all" ON public.training_images;

-- INSERT/UPDATE/DELETE de imagem pertencem ao backend (service role, que
-- ignora RLS). O navegador só lê.
REVOKE INSERT, UPDATE, DELETE ON public.training_images FROM anon, authenticated;
GRANT SELECT ON public.training_images TO authenticated;


-- ─── 5. Reivindicação ATÔMICA do trabalho (controle de custo) ────────────────
-- Sem esta função, duas execuções simultâneas da Edge Function poderiam gerar
-- (e cobrar) duas imagens para o mesmo conteúdo. O `INSERT ... ON CONFLICT DO
-- UPDATE ... WHERE` roda em UMA instrução: o Postgres serializa as duas
-- transações e só uma delas recebe `reclamado = true`.
--
-- REGRAS
--   • valida que o CONTEÚDO pertence à empresa (UUID do cliente é não confiável);
--     o schema real NÃO tem `empresa_id` em turmas/certificados:
--       - course           → catalogo_cursos.empresa_id
--       - learning_path    → trilhas_aprendizado.empresa_id
--       - training_session → treinamento_instancias.curso_id → catalogo_cursos
--       - certificate      → treinamento_certificados.colaborador_id → colaboradores
--                            (+ curso, quando informado)
--   • NÃO reivindica quando: já existe capa para o mesmo `content_hash`,
--     há trabalho pendente/em processamento recente, ou o limite de tentativas
--     foi atingido;
--   • `p_stale_after` recupera trabalhos travados por crash (default 10 min);
--   • editar o cadastro muda `content_hash` e libera nova geração.
--
-- EXECUÇÃO: somente BACKEND (service role). O navegador não tem EXECUTE.
CREATE OR REPLACE FUNCTION public.claim_training_image(
  p_empresa_id uuid,
  p_content_type text,
  p_content_id uuid,
  p_content_hash text,
  p_prompt_version text DEFAULT NULL,
  p_max_attempts integer DEFAULT 3,
  p_stale_after interval DEFAULT interval '10 minutes'
)
RETURNS TABLE (reclamado boolean, id uuid, status text, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok      boolean := false;
  v_pasta   text;
  v_linha   public.training_images;
  v_max     integer := least(greatest(coalesce(p_max_attempts, 3), 1), 5);
BEGIN
  IF p_empresa_id IS NULL OR p_content_id IS NULL THEN
    RAISE EXCEPTION 'identificadores_obrigatorios';
  END IF;
  IF p_content_type NOT IN ('course', 'learning_path', 'training_session', 'certificate') THEN
    RAISE EXCEPTION 'tipo_de_conteudo_invalido';
  END IF;
  IF p_content_hash IS NULL OR char_length(p_content_hash) < 8 THEN
    RAISE EXCEPTION 'content_hash_invalido';
  END IF;

  IF p_content_type = 'course' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.catalogo_cursos c
      WHERE c.id = p_content_id AND c.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'courses';
  ELSIF p_content_type = 'learning_path' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trilhas_aprendizado t
      WHERE t.id = p_content_id AND t.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'learning-paths';
  ELSIF p_content_type = 'training_session' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.treinamento_instancias i
      JOIN public.catalogo_cursos c ON c.id = i.curso_id
      WHERE i.id = p_content_id AND c.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'training-sessions';
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.treinamento_certificados tc
      JOIN public.colaboradores col ON col.id = tc.colaborador_id
      LEFT JOIN public.catalogo_cursos c ON c.id = tc.curso_id
      WHERE tc.id = p_content_id
        AND col.empresa_id = p_empresa_id
        AND (tc.curso_id IS NULL OR c.empresa_id = p_empresa_id)
    ) INTO v_ok;
    v_pasta := 'certificates';
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'conteudo_nao_pertence_a_empresa';
  END IF;

  INSERT INTO public.training_images AS t (
    empresa_id, content_type, content_id, storage_path, content_hash,
    status, provider, attempts, prompt_version, requested_at
  )
  VALUES (
    p_empresa_id, p_content_type, p_content_id,
    p_empresa_id::text || '/' || v_pasta || '/' || p_content_id::text || '/cover.webp',
    p_content_hash, 'pending', 'pendente-configuracao', 1, p_prompt_version, now()
  )
  ON CONFLICT (empresa_id, content_type, content_id) DO UPDATE
    SET status         = 'pending',
        attempts       = t.attempts + 1,
        content_hash   = excluded.content_hash,
        prompt_version = excluded.prompt_version,
        requested_at   = now(),
        last_error     = NULL,
        completed_at   = NULL
    WHERE t.attempts < v_max
      AND (
        t.status = 'disabled'
        OR t.status = 'failed'
        OR (t.status IN ('pending', 'processing') AND t.requested_at < now() - p_stale_after)
        OR (t.status = 'succeeded' AND t.content_hash IS DISTINCT FROM excluded.content_hash)
      )
  RETURNING * INTO v_linha;

  IF v_linha.id IS NULL THEN
    SELECT ti.* INTO v_linha
    FROM public.training_images ti
    WHERE ti.empresa_id = p_empresa_id
      AND ti.content_type = p_content_type
      AND ti.content_id = p_content_id;

    RETURN QUERY SELECT false, v_linha.id, v_linha.status, v_linha.attempts;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_linha.id, v_linha.status, v_linha.attempts;
END;
$$;

COMMENT ON FUNCTION public.claim_training_image(uuid, text, uuid, text, text, integer, interval) IS
  'Reivindica (atomicamente) a geração da capa de um conteúdo, validando que ele pertence à empresa. Uso exclusivo do backend.';

-- Escrita/reivindicação: somente service role.
REVOKE ALL ON FUNCTION public.claim_training_image(uuid, text, uuid, text, text, integer, interval) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_training_image(uuid, text, uuid, text, text, integer, interval) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_training_image(uuid, text, uuid, text, text, integer, interval) TO service_role;
GRANT ALL ON public.training_images TO service_role;
