-- Drift schema × código: colunas que os services escrevem/consultam há meses
-- mas que nunca existiram no schema canônico (nem no types.ts gerado). Sem
-- elas, os caminhos abaixo falhavam em runtime (PostgREST rejeita coluna
-- desconhecida): execução/aprovação de workflow (SLA) e geração/finalização
-- de remessa CNAB (o SELECT de recuperação idempotente filtra por folha_id).

ALTER TABLE public.workflows_execucoes
  ADD COLUMN IF NOT EXISTS sla_iniciado_em TIMESTAMPTZ;

ALTER TABLE public.cnab_remessas
  ADD COLUMN IF NOT EXISTS folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arquivo_remessa TEXT;

CREATE INDEX IF NOT EXISTS idx_cnab_remessas_folha ON public.cnab_remessas (folha_id);
