-- Issue 54: Adiciona colunas de negócio ausentes em asos.
--
-- O stub 2025122813140122_create_asos.sql criou a tabela com schema genérico de
-- "documento financeiro" (numero, descricao, valor, data_emissao, data_vencimento).
-- A proper migration 20251228131668 foi NO-OP (CREATE TABLE IF NOT EXISTS).
-- A migration 20260315193923 também foi NO-OP pelo mesmo motivo.
-- Nenhuma migration posterior adicionou os campos de negócio via ADD COLUMN.
--
-- O app usa:
--   ASOTab.tsx        → INSERT tipo, data_exame, data_validade, resultado,
--                        medico_nome, medico_crm, clinica
--   AdminAsoWorkflowPage.tsx → SELECT tipo, resultado, data_exame, data_validade,
--                        restricoes_descricao, restricao_data_fim, medico_nome,
--                        medico_crm, clinica_partner_id, agendamento_id
--   automacaoService.ts → SELECT vence em data_validade
--
-- Todas essas queries falham com "column does not exist".

-- ── Adiciona colunas ausentes ────────────────────────────────────────────────
ALTER TABLE public.asos
  ADD COLUMN IF NOT EXISTS tipo                TEXT,
  ADD COLUMN IF NOT EXISTS data_exame          DATE,
  ADD COLUMN IF NOT EXISTS data_validade       DATE,
  ADD COLUMN IF NOT EXISTS resultado           TEXT,
  ADD COLUMN IF NOT EXISTS medico_nome         TEXT,
  ADD COLUMN IF NOT EXISTS medico_crm          TEXT,
  ADD COLUMN IF NOT EXISTS clinica             TEXT,
  ADD COLUMN IF NOT EXISTS restricoes_descricao TEXT,
  ADD COLUMN IF NOT EXISTS restricao_data_fim  DATE,
  ADD COLUMN IF NOT EXISTS clinica_partner_id  UUID,
  ADD COLUMN IF NOT EXISTS agendamento_id      UUID;

-- ── Backfill: tipo e data_exame a partir de colunas legadas do stub ──────────
DO $$
BEGIN
  -- data_exame ← data_emissao (campo mais próximo semanticamente)
  UPDATE public.asos
    SET data_exame = data_emissao
    WHERE data_exame IS NULL AND data_emissao IS NOT NULL;

  -- tipo: registros sem tipo recebem 'admissional' como padrão razoável
  UPDATE public.asos
    SET tipo = 'admissional'
    WHERE tipo IS NULL;

  -- Promove tipo para NOT NULL somente se ainda nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'asos'
      AND column_name  = 'tipo'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.asos ALTER COLUMN tipo SET NOT NULL;
  END IF;
END $$;

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asos_tipo_empresa
  ON public.asos (empresa_id, tipo);

CREATE INDEX IF NOT EXISTS idx_asos_data_validade
  ON public.asos (data_validade)
  WHERE data_validade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asos_clinica_partner
  ON public.asos (clinica_partner_id)
  WHERE clinica_partner_id IS NOT NULL;
