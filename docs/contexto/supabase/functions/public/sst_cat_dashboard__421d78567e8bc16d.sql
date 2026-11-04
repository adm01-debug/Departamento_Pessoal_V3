CREATE OR REPLACE FUNCTION public.sst_cat_dashboard(p_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_cats', COUNT(*),
    'pendentes_envio', COUNT(*) FILTER (WHERE data_envio_esocial IS NULL),
    'transmitidas', COUNT(*) FILTER (WHERE data_envio_esocial IS NOT NULL),
    'em_atraso', COUNT(*) FILTER (WHERE data_envio_esocial IS NULL AND prazo_limite_envio < now()),
    'obitos_ano', COUNT(*) FILTER (WHERE houve_obito AND EXTRACT(YEAR FROM data_acidente) = EXTRACT(YEAR FROM now())),
    'com_afastamento', COUNT(*) FILTER (WHERE houve_afastamento),
    'por_tipo', (
      SELECT jsonb_object_agg(tipo_acidente, cnt) FROM (
        SELECT tipo_acidente, COUNT(*) cnt FROM public.sst_cat WHERE empresa_id = p_empresa_id GROUP BY tipo_acidente
      ) t
    )
  ) INTO v_result
  FROM public.sst_cat
  WHERE empresa_id = p_empresa_id;

  RETURN v_result;
END;
$function$
