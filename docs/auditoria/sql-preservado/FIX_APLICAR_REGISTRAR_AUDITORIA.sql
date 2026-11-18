-- =============================================================================
-- Diagnóstico + Correção: registrar_auditoria 404
-- =============================================================================
-- Como aplicar:
--   1. Abra https://supabase.com/dashboard/project/frjbfeamybqsejlvmqbl/sql/new
--   2. Cole este script INTEIRO
--   3. Clique "Run"
-- =============================================================================

-- PASSO 1: Diagnóstico — mostra quais versões da função existem
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS signature,
  p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('registrar_auditoria', 'listar_auditoria')
ORDER BY p.proname, signature;

-- PASSO 2: Aplica a migration corrigida
-- (DROP explícito remove versões antigas conflitantes antes do CREATE)
DROP FUNCTION IF EXISTS public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.registrar_auditoria(text, text, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.listar_auditoria(uuid, text, text, text, timestamptz, timestamptz, int);

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

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_all" ON public.audit_log;
CREATE POLICY "audit_log_all" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

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
    a.id, a.tabela, a.registro_id, a.acao,
    a.user_id, a.payload, a.created_at
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

GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.listar_auditoria(uuid, text, text, text, timestamptz, timestamptz, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.registrar_auditoria IS
  'Insere registro de auditoria. Deriva user_id de auth.uid().';
COMMENT ON FUNCTION public.listar_auditoria IS
  'Lista logs de auditoria com filtros.';

-- PASSO 3: Validação — confirma que a função está acessível
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('registrar_auditoria', 'listar_auditoria')
ORDER BY p.proname, signature;

-- PASSO 4: Teste real — chama a função com parâmetros dummy
-- Se o SELECT anterior retornou 2 linhas, esta chamada deve funcionar (sem erro de "function not found")
DO $$
DECLARE
  v_test_id UUID;
BEGIN
  -- Pega qualquer empresa válida para teste
  SELECT id INTO v_test_id FROM public.empresas LIMIT 1;

  IF v_test_id IS NOT NULL THEN
    PERFORM public.registrar_auditoria(
      '__diagnostico__',
      'diagnostic-test',
      'INSERT',
      NULL,
      jsonb_build_object('test', true, 'ts', now()),
      v_test_id
    );
    RAISE NOTICE 'OK: registrar_auditoria() executada com sucesso para empresa %', v_test_id;
  ELSE
    RAISE NOTICE 'AVISO: nenhuma empresa encontrada — função foi criada mas não testada';
  END IF;
END;
$$;

-- PASSO 5: Limpa o registro de teste
DELETE FROM public.audit_log WHERE tabela = '__diagnostico__';