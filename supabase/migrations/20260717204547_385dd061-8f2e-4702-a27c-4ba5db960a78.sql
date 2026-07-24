
-- Documentos versionados do Regimento Interno
CREATE TABLE IF NOT EXISTS public.sst_regimento_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','PUBLICADO','ARQUIVADO')),
  hash_sha256 TEXT,
  publicado_em TIMESTAMPTZ,
  publicado_por UUID,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regimento_doc_empresa ON public.sst_regimento_documentos(empresa_id, status);
CREATE UNIQUE INDEX uniq_regimento_publicado ON public.sst_regimento_documentos(empresa_id) WHERE status = 'PUBLICADO';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_regimento_documentos TO authenticated;
GRANT ALL ON public.sst_regimento_documentos TO service_role;
ALTER TABLE public.sst_regimento_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura por empresa do usuario" ON public.sst_regimento_documentos;
CREATE POLICY "Leitura por empresa do usuario" ON public.sst_regimento_documentos
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "RH/Admin gerenciam documentos" ON public.sst_regimento_documentos;
CREATE POLICY "RH/Admin gerenciam documentos" ON public.sst_regimento_documentos
  FOR ALL TO authenticated
  USING (
    empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  )
  WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );

DROP TRIGGER IF EXISTS trg_regimento_doc_updated ON public.sst_regimento_documentos;
CREATE TRIGGER trg_regimento_doc_updated
  BEFORE UPDATE ON public.sst_regimento_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assinaturas eletrônicas
CREATE TABLE IF NOT EXISTS public.sst_regimento_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.sst_regimento_documentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  hash_documento TEXT NOT NULL,
  hash_assinatura TEXT NOT NULL,
  ip_origem TEXT,
  user_agent TEXT,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (documento_id, colaborador_id)
);
CREATE INDEX IF NOT EXISTS idx_regimento_ass_empresa ON public.sst_regimento_assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_regimento_ass_colab ON public.sst_regimento_assinaturas(colaborador_id);

GRANT SELECT, INSERT ON public.sst_regimento_assinaturas TO authenticated;
GRANT ALL ON public.sst_regimento_assinaturas TO service_role;
ALTER TABLE public.sst_regimento_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura por empresa" ON public.sst_regimento_assinaturas;
CREATE POLICY "Leitura por empresa" ON public.sst_regimento_assinaturas
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Insercao por RH/Admin ou proprio" ON public.sst_regimento_assinaturas;
CREATE POLICY "Insercao por RH/Admin ou proprio" ON public.sst_regimento_assinaturas
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())
  );

-- Bloquear alteração/remoção (imutabilidade)
CREATE OR REPLACE FUNCTION public.sst_regimento_ass_imutavel()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Assinaturas de regimento são imutáveis';
END;
$$;
DROP TRIGGER IF EXISTS trg_regimento_ass_no_update ON public.sst_regimento_assinaturas;
CREATE TRIGGER trg_regimento_ass_no_update BEFORE UPDATE ON public.sst_regimento_assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.sst_regimento_ass_imutavel();
DROP TRIGGER IF EXISTS trg_regimento_ass_no_delete ON public.sst_regimento_assinaturas;
CREATE TRIGGER trg_regimento_ass_no_delete BEFORE DELETE ON public.sst_regimento_assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.sst_regimento_ass_imutavel();

-- RPC: publicar (calcula hash canônico e arquiva versão anterior)
CREATE OR REPLACE FUNCTION public.sst_regimento_publicar(p_documento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_hash TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Arquiva versão publicada anterior
  UPDATE public.sst_regimento_documentos
     SET status = 'ARQUIVADO'
   WHERE empresa_id = v_doc.empresa_id AND status = 'PUBLICADO' AND id <> p_documento_id;

  -- Hash canônico do conteúdo
  v_hash := encode(digest(coalesce(v_doc.titulo,'') || '|' || coalesce(v_doc.conteudo_html,'') || '|v' || v_doc.versao, 'sha256'), 'hex');

  UPDATE public.sst_regimento_documentos
     SET status = 'PUBLICADO',
         hash_sha256 = v_hash,
         publicado_em = now(),
         publicado_por = auth.uid()
   WHERE id = p_documento_id;

  RETURN jsonb_build_object('ok', true, 'hash', v_hash);
END;
$$;
REVOKE ALL ON FUNCTION public.sst_regimento_publicar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sst_regimento_publicar(UUID) TO authenticated;

-- RPC: assinar
CREATE OR REPLACE FUNCTION public.sst_regimento_assinar(
  p_documento_id UUID,
  p_colaborador_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_hash_ass TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND OR v_doc.status <> 'PUBLICADO' THEN
    RAISE EXCEPTION 'Documento não publicado';
  END IF;

  v_hash_ass := encode(digest(
    v_doc.hash_sha256 || '|' || p_colaborador_id::text || '|' || now()::text,
    'sha256'
  ), 'hex');

  INSERT INTO public.sst_regimento_assinaturas
    (documento_id, colaborador_id, empresa_id, hash_documento, hash_assinatura, ip_origem, user_agent)
  VALUES
    (p_documento_id, p_colaborador_id, v_doc.empresa_id, v_doc.hash_sha256, v_hash_ass, p_ip, p_user_agent)
  ON CONFLICT (documento_id, colaborador_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'hash_assinatura', v_hash_ass);
END;
$$;
REVOKE ALL ON FUNCTION public.sst_regimento_assinar(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sst_regimento_assinar(UUID, UUID, TEXT, TEXT) TO authenticated;

-- RPC: dashboard de adesão
CREATE OR REPLACE FUNCTION public.sst_regimento_dashboard(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_total_colab INTEGER;
  v_assinados INTEGER;
BEGIN
  IF p_empresa_id NOT IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem acesso à empresa';
  END IF;

  SELECT * INTO v_doc FROM public.sst_regimento_documentos
   WHERE empresa_id = p_empresa_id AND status = 'PUBLICADO' LIMIT 1;

  SELECT count(*) INTO v_total_colab FROM public.colaboradores
   WHERE empresa_id = p_empresa_id AND coalesce(status,'ATIVO') = 'ATIVO';

  IF v_doc.id IS NULL THEN
    RETURN jsonb_build_object('documento', null, 'total_colaboradores', v_total_colab, 'assinados', 0, 'pendentes', v_total_colab, 'adesao_pct', 0);
  END IF;

  SELECT count(*) INTO v_assinados FROM public.sst_regimento_assinaturas
   WHERE documento_id = v_doc.id;

  RETURN jsonb_build_object(
    'documento', jsonb_build_object('id', v_doc.id, 'titulo', v_doc.titulo, 'versao', v_doc.versao, 'publicado_em', v_doc.publicado_em, 'hash', v_doc.hash_sha256),
    'total_colaboradores', v_total_colab,
    'assinados', v_assinados,
    'pendentes', GREATEST(v_total_colab - v_assinados, 0),
    'adesao_pct', CASE WHEN v_total_colab > 0 THEN round((v_assinados::numeric / v_total_colab) * 100, 2) ELSE 0 END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sst_regimento_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sst_regimento_dashboard(UUID) TO authenticated;
