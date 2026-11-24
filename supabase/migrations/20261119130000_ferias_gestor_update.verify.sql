-- Sidecar de 20261119130000_ferias_gestor_update.sql
-- Só leitura. Devolve exatamente uma linha 'ok' quando o estado está certo, e
-- ZERO linhas quando está errado — o contrato do passo "Executar sidecars de
-- verificação" do canonical-migrations.yml trata saída vazia como falha e
-- exige que toda linha não vazia seja literalmente `ok`.
--
-- (A PR #726 trazia um sidecar com `SELECT 1 / COUNT(*)` dentro de
-- BEGIN/ROLLBACK: ele imprime número, não `ok`, e por isso reprovaria no
-- verify mesmo com o banco no estado correto. Daí este.)
--
-- Prova quatro coisas:
--   1. a policy de UPDATE do gestor existe, para authenticated, com
--      pode_gerir_pessoas no USING e no WITH CHECK;
--   2. as duas policies que já governavam `ferias` continuam lá — nada foi
--      revogado ao somar a nova;
--   3. nenhuma policy de `ferias` virou aberta (qual/with_check `true`);
--   4. `folhas_pagamento` NÃO ganhou escrita de gestor, que é a decisão de
--      escopo desta migration (ver o cabeçalho do .sql).
SELECT 'ok'
WHERE EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_update'
    AND cmd = 'UPDATE'
    AND 'authenticated' = ANY (roles)
    AND qual LIKE '%pode_gerir_pessoas%'
    AND with_check LIKE '%pode_gerir_pessoas%'
)
AND EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_read'
    AND cmd = 'SELECT'
    AND qual LIKE '%pode_gerir_pessoas%'
)
AND EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND policyname = 'ferias_rh_manage'
    AND cmd = 'ALL'
    AND qual LIKE '%pode_gerir_rh%'
    AND with_check LIKE '%pode_gerir_rh%'
)
AND NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND (btrim(COALESCE(qual, '')) = 'true' OR btrim(COALESCE(with_check, '')) = 'true')
)
AND NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'folhas_pagamento'
    AND cmd IN ('UPDATE', 'ALL')
    AND qual LIKE '%pode_gerir_pessoas%'
);
