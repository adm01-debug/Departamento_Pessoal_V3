CREATE OR REPLACE FUNCTION public.sst_extintores_dashboard(p_empresa_id uuid)
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
    'total', COUNT(*),
    'ativos', COUNT(*) FILTER (WHERE status = 'ATIVO'),
    'vencidos', COUNT(*) FILTER (WHERE status = 'VENCIDO'),
    'em_manutencao', COUNT(*) FILTER (WHERE status = 'MANUTENCAO'),
    'recarga_30d', COUNT(*) FILTER (WHERE data_proxima_recarga BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),
    'hidro_90d', COUNT(*) FILTER (WHERE data_proximo_teste_hidrostatico BETWEEN CURRENT_DATE AND CURRENT_DATE + 90),
    'inspecoes_mes', (SELECT COUNT(*) FROM public.sst_extintores_inspecoes 
                       WHERE empresa_id = p_empresa_id 
                       AND data_inspecao >= date_trunc('month', CURRENT_DATE)),
    'nao_conformes_mes', (SELECT COUNT(*) FROM public.sst_extintores_inspecoes 
                           WHERE empresa_id = p_empresa_id 
                           AND data_inspecao >= date_trunc('month', CURRENT_DATE)
                           AND resultado <> 'CONFORME')
  ) INTO v_result
  FROM public.sst_extintores
  WHERE empresa_id = p_empresa_id AND deleted_at IS NULL;

  RETURN v_result;
END;
$function$
