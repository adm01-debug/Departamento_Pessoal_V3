-- Sidecar de 20260911190000_p0_hash_trigger_search_path.sql
-- Só leitura. Prova que pgcrypto segue no schema extensions e que as 13
-- funções de selo continuam com o search_path resolvendo digest() em tempo de
-- execução. O LIKE em vez de igualdade exata tolera a formatação do proconfig
-- (ordem e aspas variam entre versões) sem deixar passar schema faltando.
SELECT 'ok'
WHERE EXISTS (
  SELECT 1
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto' AND n.nspname = 'extensions'
)
AND NOT EXISTS (
  SELECT 1
  FROM unnest(ARRAY[
    'enforce_afastamento_hash',
    'enforce_aso_hash',
    'enforce_batida_ponto_hash',
    'enforce_cat_hash',
    'enforce_cnab_remessa_hash',
    'enforce_desligamento_hash',
    'enforce_documento_assinatura_hash',
    'enforce_epi_entrega_hash',
    'enforce_esocial_evento_hash',
    'enforce_ferias_hash',
    'enforce_folha_pagamento_hash',
    'enforce_holerite_signed_hash',
    'enforce_medida_disciplinar_hash'
  ]) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE pn.nspname = 'public'
      AND p.proname = required.name
      AND p.pronargs = 0
      AND p.prorettype = 'trigger'::regtype
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
          AND cfg LIKE '%public%'
          AND cfg LIKE '%extensions%'
          AND cfg LIKE '%pg_catalog%'
      )
  )
);
