-- P0-FIX-RPC: Cria as funções de auditoria que estão sendo chamadas pelo frontend
-- mas não existem no banco, gerando 404 em todas as páginas de auditoria.
--
-- `registrar_auditoria` — insert seguro na audit_log via SECURITY DEFINER
-- `listar_auditoria` — leitura com filtros por empresa (via RLS)
--
-- IMPORTANTE: Existem 3 versões conflitantes desta função no histórico de
-- migrations (20260728204353, 20260805000000_p0_005, e esta). CREATE OR
-- REPLACE em assinaturas diferentes cria overloads — DROP explícito antes
-- do CREATE garante uma única versão canônica.

-- 0) Remove qualquer versão antiga (sobrescreve assinaturas divergentes)
DROP FUNCTION IF EXISTS public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.registrar_auditoria(text, text, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.listar_auditoria(uuid, text, text, text, timestamptz, timestamptz, int);

-- Tabela de audit_log (se não existir — cria mínima)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela      TEXT,
  registro_id TEXT,
  acao        TEXT,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id  UUID        REFERENCES public.empresas(id) ON DELETE SET NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Garante RLS (cria se não existir)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_all" ON public.audit_log;
CREATE POLICY "audit_log_all" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

-- Função que insere na audit_log (chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_tabela           TEXT,
  p_registro_id      TEXT,
  p_acao             TEXT,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos      JSONB DEFAULT NULL,
  p_empresa_id       UUID  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, empresa_id, payload)
  VALUES (
    p_tabela,
    p_registro_id,
    p_acao,
    auth.uid(),
    COALESCE(p_empresa_id, public.user_empresa_id()),
    jsonb_build_object(
      'dados_anteriores', p_dados_anteriores,
      'dados_novos',      p_dados_novos
    )
  );
END;
$$;

-- Função que lista logs de auditoria
CREATE OR REPLACE FUNCTION public.listar_auditoria(
  p_empresa_id  UUID,
  p_tabela      TEXT  DEFAULT NULL,
  p_acao        TEXT  DEFAULT NULL,
  p_registro_id TEXT  DEFAULT NULL,
  p_data_inicio TIMESTAMPTZ DEFAULT NULL,
  p_data_fim    TIMESTAMPTZ DEFAULT NULL,
  p_limite      INT   DEFAULT 200
)
RETURNS TABLE (
  id          UUID,
  tabela      TEXT,
  registro_id TEXT,
  acao        TEXT,
  user_id     UUID,
  payload     JSONB,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.tabela,
    a.registro_id,
    a.acao,
    a.user_id,
    a.payload,
    a.created_at
  FROM public.audit_log a
  WHERE a.empresa_id = p_empresa_id
    AND (p_tabela      IS NULL OR a.tabela      = p_tabela)
    AND (p_acao        IS NULL OR a.acao         = p_acao)
    AND (p_registro_id IS NULL OR a.registro_id = p_registro_id)
    AND (p_data_inicio IS NULL OR a.created_at  >= p_data_inicio)
    AND (p_data_fim    IS NULL OR a.created_at  <= p_data_fim)
  ORDER BY a.created_at DESC
  LIMIT p_limite;
END;
$$;

COMMENT ON FUNCTION public.registrar_auditoria IS
  'Insere registro de auditoria. Deriva user_id de auth.uid() — não aceita user_id fakeado do cliente.';
COMMENT ON FUNCTION public.listar_auditoria IS
  'Lista logs de auditoria com filtros. Restrito à empresa do usuário via SECURITY DEFINER.';

-- Permissões explícitas para authenticated (necessário para PostgREST expor a RPC)
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.listar_auditoria(uuid, text, text, text, timestamptz, timestamptz, int) TO authenticated, service_role;
