-- Sidecar de 20261119120000_ferias_folhas_gestor_update.sql (escopo revisado).
-- Só leitura. Devolve exatamente uma linha 'ok' quando o estado está certo e
-- ZERO linhas quando está errado — o contrato do passo "Executar sidecars de
-- verificação" do canonical-migrations.yml trata saída vazia como falha e
-- exige que toda linha não vazia seja literalmente `ok`.
--
-- Escopo: a policy de UPDATE do gestor existe em `ferias` para authenticated,
-- com pode_gerir_pessoas no USING e no WITH CHECK, e nenhuma policy de
-- `ferias` virou aberta. A decisão de escopo da 20261119130000 mantém
-- `folhas_pagamento` sem escrita de gestor (e o sidecar dela já assevera a
-- não-existência).
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
AND NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND (btrim(COALESCE(qual, '')) = 'true' OR btrim(COALESCE(with_check, '')) = 'true')
);
