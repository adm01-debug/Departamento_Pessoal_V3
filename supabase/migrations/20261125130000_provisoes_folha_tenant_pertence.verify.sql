-- Verifica que as policies de provisoes_folha e historico_calculos_folha nao
-- voltaram a derivar o tenant de claim do JWT (current_setting('request.jwt...')
-- ou auth.jwt()), que e forjavel pelo cliente. Espera-se exatamente 'ok'.
WITH alvo AS (
  SELECT policyname, tablename, cmd,
         coalesce(qual, '') || ' ' || coalesce(with_check, '') AS expr
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('provisoes_folha', 'historico_calculos_folha')
), resumo AS (
  SELECT
    count(*) FILTER (WHERE expr ~* 'request\.jwt|auth\.jwt|app_metadata') AS com_claim,
    count(*) FILTER (
      WHERE tablename = 'provisoes_folha' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
    ) AS provisoes_total,
    count(*) FILTER (
      WHERE tablename = 'provisoes_folha' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
        AND expr !~* 'pertence_a_empresa'
    ) AS provisoes_sem_pertence,
    count(*) FILTER (
      WHERE tablename = 'historico_calculos_folha' AND cmd IN ('SELECT', 'INSERT', 'DELETE')
    ) AS historico_total,
    count(*) FILTER (
      WHERE tablename = 'historico_calculos_folha' AND cmd IN ('SELECT', 'INSERT', 'DELETE')
        AND expr !~* 'pertence_a_empresa'
    ) AS historico_sem_pertence
  FROM alvo
)
SELECT CASE
  WHEN com_claim = 0
   AND provisoes_total = 3 AND provisoes_sem_pertence = 0
   AND historico_total = 3 AND historico_sem_pertence = 0 THEN 'ok'
  ELSE format(
    'FALHOU: policies com claim de JWT=%s; provisoes %s/3 sem pertence_a_empresa=%s; historico %s/3 sem pertence_a_empresa=%s',
    com_claim, provisoes_total, provisoes_sem_pertence, historico_total, historico_sem_pertence)
END AS resultado
FROM resumo;
