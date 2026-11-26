-- Sidecar de verificacao da 20261126150000 (somente leitura).
-- Prova, no catalogo pos-apply, que a retencao voltou a gravar metrica com o
-- contrato real da tabela e que a telemetria nao pode mais abortar a purga.
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enforce_log_retention'
       AND p.prosecdef
  ) THEN 'FALHOU: enforce_log_retention ausente ou sem SECURITY DEFINER'
  WHEN EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enforce_log_retention'
       AND p.prosrc LIKE '%metricas_processamento (tipo, valor, metadata%'
  ) THEN 'FALHOU: enforce_log_retention ainda insere nas colunas inexistentes tipo/valor/metadata'
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enforce_log_retention'
       AND p.prosrc LIKE '%metricas_processamento (funcao_nome, status, tempo_execucao_ms, timestamp)%'
  ) THEN 'FALHOU: enforce_log_retention nao grava a metrica com o contrato real da tabela'
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enforce_log_retention'
       AND p.prosrc LIKE '%login_attempts WHERE created_at%'
  ) THEN 'FALHOU: enforce_log_retention perdeu o filtro login_attempts.created_at'
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enforce_log_retention'
       AND p.prosrc LIKE '%EXCEPTION WHEN OTHERS%'
  ) THEN 'FALHOU: metrica sem bloco EXCEPTION — volta a poder abortar a retencao'
  WHEN NOT has_function_privilege('service_role', 'public.enforce_log_retention()', 'EXECUTE')
    THEN 'FALHOU: service_role perdeu EXECUTE em enforce_log_retention'
  WHEN has_function_privilege('anon', 'public.enforce_log_retention()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.enforce_log_retention()', 'EXECUTE')
    THEN 'FALHOU: enforce_log_retention com EXECUTE aberto para anon/authenticated'
  ELSE 'ok'
END;