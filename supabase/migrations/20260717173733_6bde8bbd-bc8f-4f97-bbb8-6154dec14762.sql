
-- Fase A #1: Reembolsos & Despesas - workflow completo

-- 1. Expandir tabela despesas
ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'reembolso',
  ADD COLUMN IF NOT EXISTS folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejeitado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS integrado_folha_em TIMESTAMPTZ;

-- CHECK constraints (idempotente)
DO $$ BEGIN
  ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_status_check
    CHECK (status IN ('rascunho','pendente','aprovado','rejeitado','integrado_folha','pago','cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_tipo_check
    CHECK (tipo IN ('reembolso','adiantamento','despesa_viagem','material','alimentacao','transporte','outro'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_valor_positivo CHECK (valor > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_empresa_status ON public.despesas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_despesas_colaborador ON public.despesas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_despesas_folha ON public.despesas(folha_id) WHERE folha_id IS NOT NULL;

-- 2. Log de aprovações (auditoria)
CREATE TABLE IF NOT EXISTS public.despesas_aprovacoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  despesa_id UUID NOT NULL REFERENCES public.despesas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('submetido','aprovado','rejeitado','integrado_folha','pago','cancelado','editado')),
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  motivo TEXT,
  empresa_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.despesas_aprovacoes_log TO authenticated;
GRANT ALL ON public.despesas_aprovacoes_log TO service_role;

ALTER TABLE public.despesas_aprovacoes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_despesas_log_select" ON public.despesas_aprovacoes_log;
CREATE POLICY "empresa_despesas_log_select" ON public.despesas_aprovacoes_log
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "empresa_despesas_log_insert" ON public.despesas_aprovacoes_log;
CREATE POLICY "empresa_despesas_log_insert" ON public.despesas_aprovacoes_log
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())) AND usuario_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_despesas_log_despesa ON public.despesas_aprovacoes_log(despesa_id, created_at DESC);

-- 3. Trigger de auditoria automática
CREATE OR REPLACE FUNCTION public.log_despesa_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.despesas_aprovacoes_log(despesa_id, usuario_id, acao, status_novo, empresa_id)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.colaborador_id), 'submetido', COALESCE(NEW.status,'pendente'), NEW.empresa_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.despesas_aprovacoes_log(
      despesa_id, usuario_id, acao, status_anterior, status_novo, motivo, empresa_id
    )
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.aprovado_por, NEW.colaborador_id),
      CASE NEW.status
        WHEN 'aprovado' THEN 'aprovado'
        WHEN 'rejeitado' THEN 'rejeitado'
        WHEN 'integrado_folha' THEN 'integrado_folha'
        WHEN 'pago' THEN 'pago'
        WHEN 'cancelado' THEN 'cancelado'
        ELSE 'editado'
      END,
      OLD.status, NEW.status,
      NEW.rejeitado_motivo,
      NEW.empresa_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_despesas_log ON public.despesas;
CREATE TRIGGER trg_despesas_log
  AFTER INSERT OR UPDATE OF status ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.log_despesa_status_change();

-- 4. RPC de aprovação (state-machine)
CREATE OR REPLACE FUNCTION public.aprovar_despesa(_despesa_id UUID, _observacoes TEXT DEFAULT NULL)
RETURNS public.despesas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.despesas;
BEGIN
  UPDATE public.despesas
    SET status = 'aprovado',
        aprovado_por = auth.uid(),
        aprovado_em = now(),
        observacoes_aprovador = COALESCE(_observacoes, observacoes_aprovador),
        updated_at = now()
    WHERE id = _despesa_id
      AND status = 'pendente'
      AND empresa_id IN (SELECT get_user_empresas(auth.uid()))
    RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Despesa não encontrada ou não pode ser aprovada';
  END IF;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.rejeitar_despesa(_despesa_id UUID, _motivo TEXT)
RETURNS public.despesas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.despesas;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório';
  END IF;

  UPDATE public.despesas
    SET status = 'rejeitado',
        aprovado_por = auth.uid(),
        aprovado_em = now(),
        rejeitado_motivo = _motivo,
        updated_at = now()
    WHERE id = _despesa_id
      AND status = 'pendente'
      AND empresa_id IN (SELECT get_user_empresas(auth.uid()))
    RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Despesa não encontrada ou não pode ser rejeitada';
  END IF;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.aprovar_despesa(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rejeitar_despesa(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprovar_despesa(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_despesa(UUID, TEXT) TO authenticated;
