-- QA-2: lote PIX entra no ciclo de remessa (BUG-2.5) + sequencial CNAB único.
--
-- generatePIXBatch devolvia um CSV solto, sem registro — regenerar a mesma
-- folha produzia um segundo arquivo pagável (risco de pagamento em dobro).
-- pix_lotes ganha folha_id + arquivo_lote: o lote fica registrado e
-- idempotente como o CNAB240 (cnab_remessas).

ALTER TABLE public.pix_lotes
  ADD COLUMN IF NOT EXISTS folha_id uuid REFERENCES public.folhas_pagamento(id),
  ADD COLUMN IF NOT EXISTS arquivo_lote text;

-- Um lote PIX por (empresa, folha): segunda geração reusa/rejeita, nunca
-- cria arquivo paralelo.
CREATE UNIQUE INDEX IF NOT EXISTS pix_lotes_empresa_folha_uk
  ON public.pix_lotes (empresa_id, folha_id)
  WHERE folha_id IS NOT NULL;

-- Sequencial CNAB único por (empresa, banco): a RPC next_cnab_sequencial
-- já aloca atomicamente; o índice é o último guarda-chuva contra um insert
-- direto que pule a RPC. Fail-open no aplicador: se produção já tiver
-- duplicatas legadas, a migration avisa em vez de abortar o deploy —
-- duplicatas são tratadas antes de recriar o índice.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT empresa_id, banco_codigo, sequencial_arquivo, COUNT(*) c
      FROM public.cnab_remessas
      GROUP BY 1, 2, 3 HAVING COUNT(*) > 1
    ) d
  ) THEN
    RAISE WARNING 'cnab_remessas: sequencial duplicado legado — índice único adiado';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS cnab_remessas_sequencial_uk
      ON public.cnab_remessas (empresa_id, banco_codigo, sequencial_arquivo);
  END IF;
END $$;
