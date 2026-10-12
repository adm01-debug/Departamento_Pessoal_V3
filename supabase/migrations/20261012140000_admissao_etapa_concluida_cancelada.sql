-- Etapas terminais da admissão — levantamento de pendências 2026-10-12 (#20).
--
-- A UI (AdmissoesPage: etapaLabels/etapaGradients/filtros) e o
-- admissaoService.concluir/cancelar já tratavam 'concluida' e 'cancelada'
-- como etapas válidas, mas o enum nunca recebeu os valores — qualquer
-- chamada real falharia com violação do enum do Postgres.
--
-- ADD VALUE é irreversível por desenho do Postgres; os dois valores são
-- terminais (processo encerrado com sucesso ou cancelado), alinhados com
-- o que a interface já exibia como destino final do funil.

ALTER TYPE "public"."etapa_admissao" ADD VALUE IF NOT EXISTS 'concluida';
ALTER TYPE "public"."etapa_admissao" ADD VALUE IF NOT EXISTS 'cancelada';
