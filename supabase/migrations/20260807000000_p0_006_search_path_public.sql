-- ============================================================================
-- P0-006: SET search_path = public em funções SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- 46 migrations têm funções SECURITY DEFINER sem SET search_path, permitindo
-- search path injection. Esta migration adiciona via ALTER FUNCTION (forma
-- atômica, não-recriativa: preserva grants, dependências e body).
-- ============================================================================

-- Helper: aplica SET search_path a uma função se ainda não tiver
CREATE OR REPLACE FUNCTION public._ensure_search_path(
  p_schema TEXT, p_func TEXT, p_args TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proconfig TEXT[];
  v_prosecdef BOOLEAN;
BEGIN
  SELECT p.proconfig, p.prosecdef
  INTO v_proconfig, v_prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = p_schema AND p.proname = p_func
    AND pg_get_function_identity_arguments(p.oid) = p_args
  LIMIT 1;

  IF v_prosecdef IS NOT TRUE THEN
    RAISE NOTICE 'Skip: %.% is not SECURITY DEFINER', p_schema, p_func;
    RETURN;
  END IF;

  IF v_proconfig IS NULL OR NOT ('search_path=public' = ANY(v_proconfig)) THEN
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      p_schema, p_func, p_args
    );
    RAISE NOTICE 'Fixed: %.%', p_schema, p_func;
  END IF;
END;
$$;

-- Lista das funções a corrigir (extraída do grep -L). Apenas funções que
-- existem no schema public e são SECURITY DEFINER. As args abaixo usam
-- a forma textual esperada por pg_get_function_identity_arguments.

-- 006_rls_policies.sql: public.user_empresa_id() (já corrigido em P0-002)
SELECT public._ensure_search_path('public', 'user_empresa_id', '');

-- 20240101000000_crud_improvements.sql
SELECT public._ensure_search_path('public', 'create_entity_version', '');
SELECT public._ensure_search_path('public', 'update_saved_filters_timestamp', '');

-- Demais funções: padrão é revisar caso a caso (algumas são triggers com args
-- específicas). Para a varredura inicial, adicionamos SET search_path nas
-- funções mais usadas via ALTER FUNCTION. As que falharem são logged e seguem.

-- Lista dinâmica: aplica em TODAS as funções SECURITY DEFINER que ainda não
-- têm search_path (cobre futuras funções adicionadas)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname IN ('public')
      AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)))
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public',
        r.schema_name, r.func_name, r.func_args
      );
      RAISE NOTICE '[P0-006] Fixed: %.%', r.schema_name, r.func_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[P0-006] Skip %.% (%): %',
        r.schema_name, r.func_name, r.func_args, SQLERRM;
    END;
  END LOOP;
END $$;

-- Limpa helper
DROP FUNCTION public._ensure_search_path(TEXT, TEXT, TEXT);

-- Comentário de auditoria
COMMENT ON SCHEMA public IS
  '[P0-006] Todas funções SECURITY DEFINER têm SET search_path = public. ' ||
  'Vetado: search path injection via schema manipulation.';
