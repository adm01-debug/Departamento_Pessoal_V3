-- ok só se o índice único parcial existe sobre (empresa_id, colaborador_id)
-- e nenhuma linha hoje já viola a regra (não deveria existir em produção,
-- mas prova que a migration não se aplicou por cima de dado inconsistente).
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_funcionarios'
      AND indexname = 'ux_ponto_rep_funcionarios_colaborador_por_empresa'
  ) THEN 'FALHOU: indice unico de vinculo reverso ausente'
  WHEN EXISTS (
    SELECT empresa_id, colaborador_id FROM public.ponto_rep_funcionarios
    WHERE colaborador_id IS NOT NULL
    GROUP BY empresa_id, colaborador_id
    HAVING count(*) > 1
  ) THEN 'FALHOU: ja existe colaborador vinculado a mais de um funcionario do relogio'
  ELSE 'ok'
END;
