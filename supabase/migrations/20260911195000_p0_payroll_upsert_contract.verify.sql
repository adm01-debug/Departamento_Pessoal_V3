-- Sidecar de 20260911195000_p0_payroll_upsert_contract.sql
-- Só leitura. Prova as duas chaves únicas que o upsert da folha usa para
-- inferir o ON CONFLICT. Compara por conjunto de colunas ordenado, não pelo
-- nome da constraint nem pela ordem das colunas: a migration de propósito
-- aceita uma chave equivalente pré-existente com outro nome.
WITH chaves AS (
  SELECT
    c.conrelid::regclass::text AS tabela,
    (
      SELECT array_agg(a.attname::text ORDER BY a.attname)
      FROM unnest(c.conkey) AS k(attnum)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    ) AS colunas
  FROM pg_constraint c
  WHERE c.contype = 'u'
    AND c.conrelid IN ('public.folhas_pagamento'::regclass, 'public.folha_itens'::regclass)
)
SELECT 'ok'
WHERE EXISTS (
  SELECT 1 FROM chaves
  WHERE tabela = 'folhas_pagamento'
    AND colunas = ARRAY['competencia', 'empresa_id', 'tipo']
)
AND EXISTS (
  SELECT 1 FROM chaves
  WHERE tabela = 'folha_itens'
    AND colunas = ARRAY['colaborador_id', 'folha_id']
);
