CREATE TABLE IF NOT EXISTS public.afdt_divergencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID NOT NULL REFERENCES public.afdt_importacoes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  registro_raw_id UUID REFERENCES public.afdt_registros_raw(id) ON DELETE CASCADE,
  colaborador_id UUID,
  batida_id UUID,
  pis TEXT,
  data_hora_afdt TIMESTAMPTZ,
  tipo TEXT NOT NULL CHECK (tipo IN ('ok','sem_colaborador','sem_batida','duplicado')),
  delta_segundos INTEGER,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afdt_div_imp ON public.afdt_divergencias(importacao_id);
CREATE INDEX IF NOT EXISTS idx_afdt_div_emp_tipo ON public.afdt_divergencias(empresa_id, tipo) WHERE resolvido = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.afdt_divergencias TO authenticated;
GRANT ALL ON public.afdt_divergencias TO service_role;

ALTER TABLE public.afdt_divergencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afdt_div_tenant_all" ON public.afdt_divergencias;
CREATE POLICY "afdt_div_tenant_all" ON public.afdt_divergencias
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()));

-- RPC: reconciliar_afdt
CREATE OR REPLACE FUNCTION public.reconciliar_afdt(_importacao_id UUID, _janela_seg INTEGER DEFAULT 300)
RETURNS TABLE (total INTEGER, ok INTEGER, sem_colaborador INTEGER, sem_batida INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_total INT := 0; v_ok INT := 0; v_sc INT := 0; v_sb INT := 0;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.afdt_importacoes WHERE id = _importacao_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Importação não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_empresa) THEN
    RAISE EXCEPTION 'Sem permissão nesta empresa';
  END IF;

  DELETE FROM public.afdt_divergencias WHERE importacao_id = _importacao_id;

  WITH raw AS (
    SELECT r.id AS raw_id, r.pis, r.data_hora_marcacao
      FROM public.afdt_registros_raw r
     WHERE r.importacao_id = _importacao_id
       AND r.tipo_registro = '3'
       AND r.data_hora_marcacao IS NOT NULL
       AND r.pis IS NOT NULL
  ),
  matched AS (
    SELECT
      raw.raw_id,
      raw.pis,
      raw.data_hora_marcacao,
      c.id AS colaborador_id,
      b.id AS batida_id,
      CASE WHEN b.id IS NOT NULL THEN
        EXTRACT(EPOCH FROM (raw.data_hora_marcacao - ((b.data::timestamp + b.hora))))::int
      END AS delta
    FROM raw
    LEFT JOIN public.colaboradores c
      ON c.empresa_id = v_empresa AND regexp_replace(coalesce(c.pis_pasep,''), '\D', '', 'g') = raw.pis
    LEFT JOIN LATERAL (
      SELECT bp.id, bp.data, bp.hora
        FROM public.batidas_ponto bp
       WHERE bp.empresa_id = v_empresa
         AND bp.colaborador_id = c.id
         AND (bp.data::timestamp + bp.hora)
             BETWEEN raw.data_hora_marcacao - make_interval(secs => _janela_seg)
                 AND raw.data_hora_marcacao + make_interval(secs => _janela_seg)
       ORDER BY abs(extract(epoch from ((bp.data::timestamp + bp.hora) - raw.data_hora_marcacao)))
       LIMIT 1
    ) b ON c.id IS NOT NULL
  ),
  ins AS (
    INSERT INTO public.afdt_divergencias
      (importacao_id, empresa_id, registro_raw_id, colaborador_id, batida_id, pis, data_hora_afdt, tipo, delta_segundos)
    SELECT
      _importacao_id, v_empresa, m.raw_id, m.colaborador_id, m.batida_id, m.pis, m.data_hora_marcacao,
      CASE
        WHEN m.colaborador_id IS NULL THEN 'sem_colaborador'
        WHEN m.batida_id      IS NULL THEN 'sem_batida'
        ELSE 'ok'
      END,
      m.delta
    FROM matched m
    RETURNING tipo
  )
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE tipo = 'ok')::int,
    count(*) FILTER (WHERE tipo = 'sem_colaborador')::int,
    count(*) FILTER (WHERE tipo = 'sem_batida')::int
  INTO v_total, v_ok, v_sc, v_sb
  FROM ins;

  RETURN QUERY SELECT v_total, v_ok, v_sc, v_sb;
END;
$$;

REVOKE ALL ON FUNCTION public.reconciliar_afdt(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconciliar_afdt(UUID, INTEGER) TO authenticated;