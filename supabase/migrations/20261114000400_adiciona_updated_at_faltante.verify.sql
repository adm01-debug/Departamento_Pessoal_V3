-- ok = as 15 tabelas têm updated_at (timestamptz, NOT NULL, DEFAULT now()).
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
);
