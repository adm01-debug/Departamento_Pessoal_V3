CREATE OR REPLACE FUNCTION public.sst_dashboard_sla(p_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_hoje DATE := CURRENT_DATE;
BEGIN
  -- Autorização: usuário precisa ter vínculo com a empresa
  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado à empresa informada';
  END IF;

  WITH aso_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE data_validade < v_hoje) AS vencidos,
      COUNT(*) FILTER (WHERE data_validade BETWEEN v_hoje AND v_hoje + INTERVAL '30 days') AS vencendo_30,
      COUNT(*) FILTER (WHERE data_validade BETWEEN v_hoje + INTERVAL '31 days' AND v_hoje + INTERVAL '60 days') AS vencendo_60,
      COUNT(*) FILTER (WHERE data_validade BETWEEN v_hoje + INTERVAL '61 days' AND v_hoje + INTERVAL '90 days') AS vencendo_90,
      COUNT(*) FILTER (WHERE data_validade > v_hoje + INTERVAL '90 days') AS validos,
      COUNT(*) AS total
    FROM public.asos
    WHERE empresa_id = p_empresa_id
      AND status IN ('validado','recebido_rh')
  ),
  colab_sem_aso AS (
    SELECT COUNT(*) AS qtd
    FROM public.colaboradores c
    WHERE c.empresa_id = p_empresa_id
      AND c.status = 'ativo'
      AND NOT EXISTS (
        SELECT 1 FROM public.asos a
        WHERE a.colaborador_id = c.id AND a.status IN ('validado','recebido_rh')
      )
  ),
  epi_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE ca_validade < v_hoje) AS ca_vencidos,
      COUNT(*) FILTER (WHERE ca_validade BETWEEN v_hoje AND v_hoje + INTERVAL '60 days') AS ca_vencendo_60
    FROM public.epis
    WHERE empresa_id = p_empresa_id
  ),
  agenda_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'agendado' AND data_agendada >= v_hoje) AS pendentes,
      COUNT(*) FILTER (WHERE status = 'agendado' AND data_agendada < v_hoje) AS atrasados,
      COUNT(*) FILTER (WHERE status = 'realizado' AND data_agendada >= date_trunc('month', v_hoje)) AS realizados_mes
    FROM public.exames_agendamentos
    WHERE empresa_id = p_empresa_id
  ),
  sla_clinicas AS (
    SELECT AVG(EXTRACT(EPOCH FROM (a.validado_em - ag.created_at)) / 86400.0) AS dias_medio
    FROM public.asos a
    JOIN public.exames_agendamentos ag ON ag.id = a.agendamento_id
    WHERE a.empresa_id = p_empresa_id
      AND a.status = 'validado'
      AND a.validado_em IS NOT NULL
      AND a.validado_em >= v_hoje - INTERVAL '90 days'
  )
  SELECT jsonb_build_object(
    'asos', (SELECT to_jsonb(a) FROM aso_stats a),
    'colaboradores_sem_aso', (SELECT qtd FROM colab_sem_aso),
    'epis', (SELECT to_jsonb(e) FROM epi_stats e),
    'agendamentos', (SELECT to_jsonb(ag) FROM agenda_stats ag),
    'sla_clinicas_dias', COALESCE((SELECT ROUND(dias_medio::numeric, 2) FROM sla_clinicas), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$function$
