-- ok = as 15 tabelas têm updated_at (timestamptz, NOT NULL, DEFAULT now()) E
-- process_ferias_audit()/fn_update_admissao_checklist() não leem mais colunas
-- inexistentes (status_gestor/status_rh direto; status/tipo_documento), seguem
-- SECURITY DEFINER com search_path=public e sem EXECUTE para PUBLIC/anon/authenticated.
-- Saída vazia reprova o verify (inclusive se alguma tabela não existir).
SELECT 'ok'
WHERE NOT EXISTS (
  SELECT 1
  FROM unnest(ARRAY[
      'public.auth_gov_br_sessions',
      'public.blocked_ips',
      'public.controle_acesso',
      'public.documentos_admissao',
      'public.documentos_assinatura',
      'public.documentos_colaborador',
      'public.escalas_trabalho',
      'public.ferias_solicitacoes',
      'public.notificacoes',
      'public.onboarding_tarefas',
      'public.onboarding_templates',
      'public.periodos_ponto',
      'public.rubricas_folha',
      'public.seguros_vida',
      'public.treinamentos'
  ]) AS alvo(tabela)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = to_regclass(alvo.tabela)
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.attnotnull
      AND a.atttypid = 'timestamptz'::regtype
      AND pg_get_expr(d.adbin, d.adrelid) = 'now()'
  )
)
AND EXISTS (
  SELECT 1 FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.process_ferias_audit()')
    AND p.prosecdef
    AND p.proconfig = ARRAY['search_path=public']
    AND p.prosrc LIKE '%to_jsonb(OLD)%'
    AND p.prosrc NOT LIKE '%OLD.status_gestor%'
    AND p.prosrc NOT LIKE '%OLD.status_rh%'
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
)
AND EXISTS (
  SELECT 1 FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.fn_update_admissao_checklist()')
    AND p.prosecdef
    AND p.proconfig = ARRAY['search_path=public']
    AND p.prosrc LIKE '%NEW.validado%'
    AND p.prosrc NOT LIKE '%NEW.status%'
    AND p.prosrc NOT LIKE '%tipo_documento%'
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
);
