
ALTER TABLE public.periodos_aquisitivos
  ADD COLUMN IF NOT EXISTS em_dobra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_limite_concessao date;

CREATE OR REPLACE FUNCTION public.trg_periodos_aquisitivos_dobra()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.data_limite_concessao := NEW.data_fim + INTERVAL '12 months';
  IF CURRENT_DATE > NEW.data_limite_concessao AND COALESCE(NEW.perdeu_direito,false) = false THEN
    NEW.em_dobra := true;
  ELSE
    NEW.em_dobra := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_periodos_aquisitivos_dobra ON public.periodos_aquisitivos;
CREATE TRIGGER trg_periodos_aquisitivos_dobra
BEFORE INSERT OR UPDATE OF data_fim, perdeu_direito
ON public.periodos_aquisitivos
FOR EACH ROW
EXECUTE FUNCTION public.trg_periodos_aquisitivos_dobra();

-- Retroativo
UPDATE public.periodos_aquisitivos
SET data_limite_concessao = data_fim + INTERVAL '12 months',
    em_dobra = (CURRENT_DATE > (data_fim + INTERVAL '12 months') AND COALESCE(perdeu_direito,false) = false)
WHERE data_limite_concessao IS NULL OR em_dobra IS NULL;

-- View de alertas críticos
CREATE OR REPLACE VIEW public.v_ferias_alertas_criticos
WITH (security_invoker = true)
AS
SELECT
  pa.id AS periodo_aquisitivo_id,
  pa.colaborador_id,
  c.empresa_id,
  c.nome_completo AS colaborador,
  pa.data_inicio AS aquisitivo_inicio,
  pa.data_fim AS aquisitivo_fim,
  pa.data_limite_concessao,
  pa.dias_direito,
  pa.em_dobra,
  pa.perdeu_direito,
  (pa.data_limite_concessao - CURRENT_DATE) AS dias_para_limite,
  CASE
    WHEN pa.em_dobra THEN 'DOBRA_VENCIDA'
    WHEN (pa.data_limite_concessao - CURRENT_DATE) <= 30 THEN 'DOBRA_IMINENTE_30'
    WHEN (pa.data_limite_concessao - CURRENT_DATE) <= 60 THEN 'DOBRA_IMINENTE_60'
    ELSE 'OK'
  END AS severidade
FROM public.periodos_aquisitivos pa
JOIN public.colaboradores c ON c.id = pa.colaborador_id
WHERE COALESCE(pa.perdeu_direito, false) = false
  AND COALESCE(pa.dias_direito, 0) > 0
  AND (pa.data_limite_concessao - CURRENT_DATE) <= 60
UNION ALL
SELECT
  NULL::uuid,
  f.colaborador_id,
  f.empresa_id,
  c.nome_completo,
  NULL::date,
  NULL::date,
  NULL::date,
  f.dias_gozo,
  false,
  false,
  (f.data_inicio - f.data_pagamento) AS dias_para_limite,
  'PAGAMENTO_ATRASADO_ART_145' AS severidade
FROM public.ferias f
JOIN public.colaboradores c ON c.id = f.colaborador_id
WHERE f.data_pagamento IS NOT NULL
  AND f.data_inicio IS NOT NULL
  AND (f.data_inicio - f.data_pagamento) < 2
  AND COALESCE(f.cancelado, false) = false
  AND f.status IN ('aprovada','concluida','em_gozo');

REVOKE ALL ON public.v_ferias_alertas_criticos FROM PUBLIC;
GRANT SELECT ON public.v_ferias_alertas_criticos TO authenticated, service_role;
