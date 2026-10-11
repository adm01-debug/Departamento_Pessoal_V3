-- Uma remessa por (empresa, folha): o guard de idempotência no cliente é
-- check-then-insert e duas gerações concorrentes passavam ambas, produzindo
-- dois arquivos pagáveis para os mesmos salários. O índice único parcial
-- faz o segundo INSERT perder com 23505 — o cliente então reusa o arquivo
-- publicado ou aborta com "remessa em andamento".
-- folha_id é NULLABLE (ON DELETE SET NULL) — NULLs não colidem no índice.

DO $migration$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT 1
    FROM public.cnab_remessas
    WHERE folha_id IS NOT NULL
    GROUP BY empresa_id, folha_id
    HAVING count(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'cnab_remessas: % grupo(s) duplicados em (empresa_id, folha_id) — remessa duplicada pode ser pagamento em dobro, resolver manualmente antes do índice',
      dup_count;
  END IF;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS cnab_remessas_empresa_folha_uniq
  ON public.cnab_remessas (empresa_id, folha_id)
  WHERE folha_id IS NOT NULL;
