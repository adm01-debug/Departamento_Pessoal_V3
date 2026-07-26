-- P2-037: Consolidação de tabelas duplicadas de documentos
-- Data: 2026-07-26

-- =============================================================================
-- DIAGNÓSTICO: TABELAS RELACIONADAS A DOCUMENTOS
-- =============================================================================

-- Tabelas identificadas com domínios sobrepostos:
-- 1. documentos (genérica)
-- 2. documentos_admissao (específica)
-- 3. documentos_afastamento (específica)
-- 4. documentos_assinatura (assinaturas)
-- 5. documento_templates (templates)
-- 6. sst_regimento_documentos (específico SST)

-- =============================================================================
-- PROPOSTA DE CONSOLIDAÇÃO: VIEWS UNIFICADAS
-- =============================================================================

-- View unificada de documentos (não destrutivo - não migra dados)
CREATE OR REPLACE VIEW public.v_documentos_unificado AS
SELECT
  'admissao'::TEXT as contexto,
  id,
  empresa_id,
  admissao_id as referencia_id,
  tipo_documento as tipo,
  NULL::TEXT as titulo,
  arquivo_url,
  NULL::TEXT as conteudo_html,
  status,
  created_at,
  updated_at
FROM public.documentos_admissao

UNION ALL

SELECT
  'afastamento'::TEXT as contexto,
  id,
  empresa_id,
  afastamento_id as referencia_id,
  tipo_documento as tipo,
  NULL::TEXT as titulo,
  arquivo_url,
  NULL::TEXT as conteudo_html,
  NULL::TEXT as status,
  created_at,
  updated_at
FROM public.documentos_afastamento

UNION ALL

SELECT
  'geral'::TEXT as contexto,
  id,
  empresa_id,
  NULL::UUID as referencia_id,
  tipo,
  titulo,
  arquivo_url,
  conteudo_html,
  status,
  created_at,
  updated_at
FROM public.documentos

UNION ALL

SELECT
  'sst_regimento'::TEXT as contexto,
  id,
  empresa_id,
  NULL::UUID as referencia_id,
  titulo as tipo,
  titulo,
  NULL::TEXT as arquivo_url,
  conteudo_html,
  status,
  publicado_em as created_at,
  updated_at
FROM public.sst_regimento_documentos;

-- =============================================================================
-- FUNÇÃO DE REGISTRO DE DOCUMENTO (INDISPENSÁVEL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.documento_registrar(
  p_contexto TEXT,
  p_empresa_id UUID,
  p_referencia_id UUID DEFAULT NULL,
  p_tipo TEXT,
  p_titulo TEXT DEFAULT NULL,
  p_arquivo_url TEXT DEFAULT NULL,
  p_conteudo_html TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pendente'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Direciona para a tabela correta baseada no contexto
  CASE p_contexto
    WHEN 'admissao' THEN
      INSERT INTO public.documentos_admissao
        (empresa_id, admissao_id, tipo_documento, arquivo_url, status)
      VALUES (p_empresa_id, p_referencia_id, p_tipo, p_arquivo_url, p_status)
      RETURNING id INTO v_id;

    WHEN 'afastamento' THEN
      INSERT INTO public.documentos_afastamento
        (empresa_id, afastamento_id, tipo_documento, arquivo_url)
      VALUES (p_empresa_id, p_referencia_id, p_tipo, p_arquivo_url)
      RETURNING id INTO v_id;

    WHEN 'sst_regimento' THEN
      INSERT INTO public.sst_regimento_documentos
        (empresa_id, titulo, conteudo_html, status)
      VALUES (p_empresa_id, p_titulo, p_conteudo_html, p_status)
      RETURNING id INTO v_id;

    ELSE
      INSERT INTO public.documentos
        (empresa_id, tipo, titulo, arquivo_url, conteudo_html, status)
      VALUES (p_empresa_id, p_tipo, p_titulo, p_arquivo_url, p_conteudo_html, p_status)
      RETURNING id INTO v_id;
  END CASE;

  RETURN v_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error e relança
  RAISE NOTICE 'Erro ao registrar documento: %', SQLERRM;
  RAISE;
END;
$$;

-- =============================================================================
-- FUNÇÃO DE CONSULTA UNIFICADA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.documento_listar(
  p_empresa_id UUID,
  p_contexto TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  contexto TEXT,
  id UUID,
  empresa_id UUID,
  referencia_id UUID,
  tipo TEXT,
  titulo TEXT,
  arquivo_url TEXT,
  conteudo_html TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.v_documentos_unificado
  WHERE empresa_id = p_empresa_id
    AND (p_contexto IS NULL OR contexto = p_contexto)
    AND (p_tipo IS NULL OR tipo = p_tipo)
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC;
END;
$$;

-- =============================================================================
-- DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON VIEW public.v_documentos_unificado IS
  'View que agrega todos os tipos de documentos do sistema para consultas centralizadas. Use documento_listar() para filtros seguros.';

COMMENT ON FUNCTION public.documento_registrar IS
  'Função factory para registrar documentos no contexto correto. Use esta função em vez de insert direto nas tabelas.';

COMMENT ON FUNCTION public.documento_listar IS
  'Lista documentos de forma unificada com filtros por contexto, tipo e status.';
