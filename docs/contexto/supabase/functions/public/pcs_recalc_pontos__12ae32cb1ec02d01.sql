CREATE OR REPLACE FUNCTION public.pcs_recalc_pontos()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  expected integer;
  supplied integer;
  total numeric(14,4);
BEGIN
  IF jsonb_typeof(NEW.pontuacoes) <> 'object' THEN
    RAISE EXCEPTION 'pontuacoes must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pcs_planos p
    JOIN public.cargos c ON c.id = NEW.cargo_id
    WHERE p.id = NEW.plano_id
      AND (c.empresa_id = p.empresa_id OR c.empresa_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'cargo does not belong to the PCS tenant' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO expected
  FROM public.pcs_fatores f WHERE f.plano_id = NEW.plano_id;
  SELECT count(*) INTO supplied FROM jsonb_each(NEW.pontuacoes);
  IF expected = 0 OR supplied <> expected THEN
    RAISE EXCEPTION 'pontuacoes must contain exactly one value per PCS factor' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(NEW.pontuacoes) p(key, value)
    LEFT JOIN public.pcs_fatores f
      ON f.plano_id = NEW.plano_id AND f.id::text = p.key
    WHERE f.id IS NULL OR jsonb_typeof(p.value) <> 'number'
      OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(f.graus) AS grade
        WHERE (grade->>'pontos')::numeric = (p.value #>> '{}')::numeric
      )
  ) THEN
    RAISE EXCEPTION 'pontuacoes contains an unknown factor or value' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(sum(f.peso * (NEW.pontuacoes->>f.id::text)::numeric), 0)
  INTO total FROM public.pcs_fatores f WHERE f.plano_id = NEW.plano_id;
  NEW.pontos_total := total;
  NEW.avaliado_por := COALESCE(auth.uid(), NEW.avaliado_por);
  IF NEW.avaliado_por IS NULL THEN
    RAISE EXCEPTION 'avaliado_por is required' USING ERRCODE = '23502';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$function$
