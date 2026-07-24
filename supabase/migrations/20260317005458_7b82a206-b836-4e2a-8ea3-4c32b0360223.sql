
-- =============================================
-- MIGRATION 1: FALTAS - Campos avançados + workflow
-- =============================================
ALTER TABLE public.faltas 
  ADD COLUMN IF NOT EXISTS data_fim date,
  ADD COLUMN IF NOT EXISTS dias_total integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cid text,
  ADD COLUMN IF NOT EXISTS medico_nome text,
  ADD COLUMN IF NOT EXISTS medico_crm text,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS rejeitado_por uuid,
  ADD COLUMN IF NOT EXISTS rejeitado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS documento_anexo text,
  ADD COLUMN IF NOT EXISTS desconto_aplicado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_afastamento_id integer REFERENCES public.motivos_afastamento(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'registrada',
  ADD COLUMN IF NOT EXISTS horas_falta interval;
