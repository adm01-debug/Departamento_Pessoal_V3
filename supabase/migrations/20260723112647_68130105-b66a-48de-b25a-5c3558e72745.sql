
-- Art. 145 CLT — pagamento de férias até 2 dias antes do início.
-- 1) Coluna de confirmação de pagamento com auditoria (user + timestamp)
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS pagamento_confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pagamento_confirmado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pagamento_valor NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS pagamento_comprovante_path TEXT;

CREATE INDEX IF NOT EXISTS idx_ferias_pagamento_pend
  ON public.ferias (empresa_id, data_inicio)
  WHERE pagamento_confirmado_em IS NULL AND status IN ('aprovada','programada');

-- 2) View de alertas Art. 145 (D-2)
CREATE OR REPLACE VIEW public.v_ferias_alerta_pagamento_d2
WITH (security_invoker = true) AS
SELECT
  f.id,
  f.empresa_id,
  f.colaborador_id,
  f.data_inicio,
  f.data_pagamento,
  f.pagamento_confirmado_em,
  f.status,
  (f.data_inicio - CURRENT_DATE) AS dias_ate_inicio,
  CASE
    WHEN f.pagamento_confirmado_em IS NOT NULL THEN 'ok'
    WHEN f.data_inicio < CURRENT_DATE THEN 'violacao_grave'   -- férias iniciadas sem pagamento
    WHEN (f.data_inicio - CURRENT_DATE) <= 2 THEN 'critico'   -- prazo legal estourado
    WHEN (f.data_inicio - CURRENT_DATE) <= 5 THEN 'atencao'   -- janela de ação
    ELSE 'ok'
  END AS severidade
FROM public.ferias f
WHERE f.status IN ('aprovada','programada','em_gozo')
  AND f.cancelado IS NOT TRUE;

GRANT SELECT ON public.v_ferias_alerta_pagamento_d2 TO authenticated;

-- 3) RPC para registrar pagamento (auditada, restrita ao RH/admin da empresa)
CREATE OR REPLACE FUNCTION public.registrar_pagamento_ferias(
  p_ferias_id UUID,
  p_valor NUMERIC,
  p_comprovante_path TEXT DEFAULT NULL
)
RETURNS public.ferias
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ferias;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.ferias WHERE id = p_ferias_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FERIAS_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Isolamento multi-tenant + role
  IF NOT public.user_belongs_to_empresa(v_uid, v_row.empresa_id)
     OR NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'rh')) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_row.pagamento_confirmado_em IS NOT NULL THEN
    RAISE EXCEPTION 'PAGAMENTO_JA_CONFIRMADO' USING ERRCODE = '23505';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'VALOR_INVALIDO' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ferias
     SET pagamento_confirmado_em  = now(),
         pagamento_confirmado_por = v_uid,
         pagamento_valor          = p_valor,
         pagamento_comprovante_path = p_comprovante_path,
         data_pagamento           = COALESCE(data_pagamento, CURRENT_DATE)
   WHERE id = p_ferias_id
   RETURNING * INTO v_row;

  -- Auditoria unificada (best-effort)
  BEGIN
    INSERT INTO public.audit_log_unified (empresa_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (v_row.empresa_id, v_uid, 'FERIAS_PAGAMENTO_CONFIRMADO', 'ferias', v_row.id,
      jsonb_build_object('valor', p_valor, 'data_inicio', v_row.data_inicio,
                         'dias_antecedencia', (v_row.data_inicio - CURRENT_DATE)));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pagamento_ferias(UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento_ferias(UUID,NUMERIC,TEXT) TO authenticated;

-- 4) Trigger: bloqueia transição para 'em_gozo' sem pagamento confirmado
CREATE OR REPLACE FUNCTION public.trg_ferias_bloquear_gozo_sem_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'em_gozo' AND (OLD.status IS DISTINCT FROM 'em_gozo') THEN
    IF NEW.pagamento_confirmado_em IS NULL THEN
      RAISE EXCEPTION 'CLT_ART_145: pagamento das férias deve ser confirmado antes do início do gozo'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ferias_bloquear_gozo_sem_pagamento ON public.ferias;
CREATE TRIGGER ferias_bloquear_gozo_sem_pagamento
  BEFORE UPDATE OF status ON public.ferias
  FOR EACH ROW EXECUTE FUNCTION public.trg_ferias_bloquear_gozo_sem_pagamento();
