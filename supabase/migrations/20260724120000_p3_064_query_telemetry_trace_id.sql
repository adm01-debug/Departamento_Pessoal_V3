-- ============================================================
-- P3-064: Adiciona trace_id à query_telemetry
-- Criado: 2026-07-24
-- Origem: PLANO_MELHORIAS.md P3-064
-- Descrição: Coluna para correlação de traces distribuídos
--   entre frontend, bridge e edge functions.
-- ============================================================

BEGIN;

ALTER TABLE public.query_telemetry
  ADD COLUMN IF NOT EXISTS trace_id TEXT;

-- Índice para busca por trace_id (útil para debugging de uma request)
CREATE INDEX IF NOT EXISTS idx_query_telemetry_trace_id
  ON public.query_telemetry (trace_id)
  WHERE trace_id IS NOT NULL;

COMMENT ON COLUMN public.query_telemetry.trace_id IS
  'P3-064: trace_id da requisição distribuída. Vem do body da request ou é gerado pelo bridge.';

COMMIT;
