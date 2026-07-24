
-- Adiantamento 13º nas férias (Lei 4.749/65 Art. 2º §2º)
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS adiantamento_13_solicitado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adiantamento_13_solicitado_por UUID,
  ADD COLUMN IF NOT EXISTS adiantamento_13_ano_exercicio INTEGER;

-- Unicidade: 1 adiantamento por colaborador/ano
CREATE UNIQUE INDEX IF NOT EXISTS uq_ferias_adiant13_ano
  ON public.ferias (colaborador_id, adiantamento_13_ano_exercicio)
  WHERE adiantamento_13o = true AND adiantamento_13_ano_exercicio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ferias_adiant13_empresa
  ON public.ferias (empresa_id, adiantamento_13_ano_exercicio)
  WHERE adiantamento_13o = true;

-- RPC: solicitar adiantamento 13º
CREATE OR REPLACE FUNCTION public.solicitar_adiantamento_13_ferias(
  p_ferias_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ferias RECORD;
  v_ano INT;
  v_salario NUMERIC;
  v_meses NUMERIC;
  v_valor NUMERIC;
  v_ja_existe BOOLEAN;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT f.*, c.salario_base AS c_salario, c.data_admissao AS c_admissao
    INTO v_ferias
  FROM public.ferias f
  JOIN public.colaboradores c ON c.id = f.colaborador_id
  WHERE f.id = p_ferias_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias não encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Autorização: RH/admin da empresa OU o próprio colaborador
  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = v_uid AND ue.empresa_id = v_ferias.empresa_id)
    OR EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = v_ferias.colaborador_id AND c.user_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;

  v_ano := EXTRACT(YEAR FROM v_ferias.data_inicio)::INT;

  -- Prazo legal: solicitação até 31/janeiro do ano do gozo
  IF CURRENT_DATE > make_date(v_ano, 1, 31) AND v_ferias.data_inicio > CURRENT_DATE THEN
    -- permite se férias já em curso não faz sentido, então bloqueia após jan
    RAISE EXCEPTION 'Prazo legal expirado (Lei 4.749/65 Art. 2º §2º: solicitar até 31/jan de %)', v_ano
      USING ERRCODE = 'P0001';
  END IF;

  -- Impedir duplicidade no ano
  SELECT EXISTS (
    SELECT 1 FROM public.ferias
    WHERE colaborador_id = v_ferias.colaborador_id
      AND adiantamento_13o = true
      AND adiantamento_13_ano_exercicio = v_ano
      AND id <> p_ferias_id
  ) INTO v_ja_existe;

  IF v_ja_existe THEN
    RAISE EXCEPTION 'Colaborador já recebeu adiantamento do 13º em %', v_ano
      USING ERRCODE = 'P0001';
  END IF;

  -- Cálculo: 50% de (salário * avos/12); avos = meses trabalhados no ano até início das férias
  v_salario := COALESCE(v_ferias.c_salario, 0);
  v_meses := LEAST(12, GREATEST(0,
    EXTRACT(MONTH FROM v_ferias.data_inicio)::INT
    - CASE WHEN EXTRACT(YEAR FROM v_ferias.c_admissao)::INT = v_ano
           THEN EXTRACT(MONTH FROM v_ferias.c_admissao)::INT - 1
           ELSE 0 END
  ));
  v_valor := ROUND((v_salario * v_meses / 12.0) * 0.5, 2);

  UPDATE public.ferias
     SET adiantamento_13o = true,
         adiantamento_13 = true,
         valor_adiantamento_13 = v_valor,
         adiantamento_13_solicitado_em = now(),
         adiantamento_13_solicitado_por = v_uid,
         adiantamento_13_ano_exercicio = v_ano
   WHERE id = p_ferias_id;

  INSERT INTO public.audit_log_unified (
    empresa_id, actor_id, action, source_table, entity, entity_id, payload
  ) VALUES (
    v_ferias.empresa_id, v_uid, 'ferias.adiantamento_13.solicitado', 'ferias',
    'ferias', p_ferias_id,
    jsonb_build_object('ano', v_ano, 'valor', v_valor, 'meses_avos', v_meses)
  );

  RETURN jsonb_build_object('ok', true, 'ano', v_ano, 'valor', v_valor, 'meses_avos', v_meses);
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_adiantamento_13_ferias(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_adiantamento_13_ferias(UUID) TO authenticated;

-- View de elegibilidade
CREATE OR REPLACE VIEW public.v_ferias_adiant13_elegibilidade
WITH (security_invoker = true)
AS
SELECT
  f.id AS ferias_id,
  f.empresa_id,
  f.colaborador_id,
  f.data_inicio,
  EXTRACT(YEAR FROM f.data_inicio)::INT AS ano_exercicio,
  f.adiantamento_13o AS ja_solicitado,
  (CURRENT_DATE <= make_date(EXTRACT(YEAR FROM f.data_inicio)::INT, 1, 31)) AS dentro_do_prazo,
  NOT EXISTS (
    SELECT 1 FROM public.ferias f2
    WHERE f2.colaborador_id = f.colaborador_id
      AND f2.adiantamento_13o = true
      AND f2.adiantamento_13_ano_exercicio = EXTRACT(YEAR FROM f.data_inicio)::INT
      AND f2.id <> f.id
  ) AS sem_duplicidade
FROM public.ferias f;

GRANT SELECT ON public.v_ferias_adiant13_elegibilidade TO authenticated;
