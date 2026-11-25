-- Verifica que as policies de provisoes_folha e historico_calculos_folha nao
-- voltaram a derivar o tenant de claim do JWT (current_setting('request.jwt...')
-- ou auth.jwt()), que e forjavel pelo cliente. Espera-se exatamente 'ok'.
WITH alvo AS (
  SELECT policyname, tablename, coalesce(qual, '') || ' ' || coalesce(with_check, '') AS expr
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('provisoes_folha', 'historico_calculos_folha')
), resumo AS (
  SELECT
    count(*) FILTER (
      WHERE expr ~* 'request\.jwt|auth\.jwt|app_metadata'
    ) AS com_claim,
    count(*) FILTER (
      WHERE tablename = 'provisoes_folha'
        AND policyname IN ('provisoes_folha_insert','provisoes_folha_update','provisoes_folha_delete')
        AND expr !~* 'pertence_a_empresa'
    ) AS provisoes_sem_pertence,
    count(*) FILTER (
      WHERE tablename = 'historico_calculos_folha'
        AND policyname IN ('Acesso por empresa historico','Insercao por empresa historico','historico_calculos_delete')
        AND expr !~* 'pertence_a_empresa'
    ) AS historico_sem_pertence
  FROM alvo
)
SELECT CASE
  WHEN com_claim = 0 AND provisoes_sem_pertence = 0 AND historico_sem_pertence = 0 THEN 'ok'
  ELSE format(
    'FALHOU: policies com claim de JWT=%s, provisoes sem pertence_a_empresa=%s, historico sem pertence_a_empresa=%s',
    com_claim, provisoes_sem_pertence, historico_sem_pertence)
END AS resultado
FROM resumo;
