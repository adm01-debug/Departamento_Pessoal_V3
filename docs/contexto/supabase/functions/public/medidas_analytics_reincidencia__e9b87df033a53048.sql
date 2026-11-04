CREATE OR REPLACE FUNCTION public.medidas_analytics_reincidencia(p_empresa_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'rh'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_empresa_id IS NULL OR p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;

  WITH base AS (
    SELECT
      m.id,
      m.tipo,
      m.gravidade,
      m.data_ocorrencia::date AS data_ocorrencia,
      m.colaborador_id,
      c.nome_completo,
      COALESCE(NULLIF(TRIM(c.departamento), ''), 'Sem setor') AS setor,
      c.gestor_ferias_id,
      g.nome_completo AS gestor_nome
    FROM public.medidas_disciplinares m
    JOIN public.colaboradores c ON c.id = m.colaborador_id
    LEFT JOIN public.colaboradores g ON g.id = c.gestor_ferias_id
    WHERE m.empresa_id = p_empresa_id
      AND m.data_ocorrencia::date BETWEEN p_data_inicio AND p_data_fim
  ),
  por_colaborador AS (
    SELECT
      colaborador_id,
      nome_completo,
      setor,
      gestor_nome,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE tipo = 'advertencia_verbal')::int  AS advertencia_verbal,
      COUNT(*) FILTER (WHERE tipo = 'advertencia_escrita')::int AS advertencia_escrita,
      COUNT(*) FILTER (WHERE tipo = 'suspensao')::int           AS suspensao,
      COUNT(*) FILTER (WHERE tipo = 'justa_causa')::int         AS justa_causa,
      COUNT(*) FILTER (WHERE gravidade = 'grave')::int          AS graves,
      MAX(data_ocorrencia)                                       AS ultima_ocorrencia,
      (COUNT(*) > 1)                                             AS reincidente
    FROM base
    GROUP BY colaborador_id, nome_completo, setor, gestor_nome
  ),
  por_setor AS (
    SELECT
      setor,
      COUNT(*)::int AS total,
      COUNT(DISTINCT colaborador_id)::int AS colaboradores_envolvidos,
      COUNT(DISTINCT colaborador_id) FILTER (
        WHERE colaborador_id IN (SELECT colaborador_id FROM por_colaborador WHERE reincidente)
      )::int AS reincidentes,
      COUNT(*) FILTER (WHERE tipo = 'suspensao')::int   AS suspensoes,
      COUNT(*) FILTER (WHERE tipo = 'justa_causa')::int AS justas_causas
    FROM base
    GROUP BY setor
  ),
  por_gestor AS (
    SELECT
      COALESCE(gestor_nome, 'Sem gestor') AS gestor_nome,
      COUNT(*)::int AS total,
      COUNT(DISTINCT colaborador_id)::int AS colaboradores_envolvidos,
      COUNT(DISTINCT colaborador_id) FILTER (
        WHERE colaborador_id IN (SELECT colaborador_id FROM por_colaborador WHERE reincidente)
      )::int AS reincidentes,
      COUNT(*) FILTER (WHERE tipo = 'suspensao')::int   AS suspensoes,
      COUNT(*) FILTER (WHERE tipo = 'justa_causa')::int AS justas_causas
    FROM base
    GROUP BY COALESCE(gestor_nome, 'Sem gestor')
  ),
  heatmap AS (
    SELECT
      to_char(date_trunc('month', data_ocorrencia), 'YYYY-MM') AS mes,
      tipo,
      COUNT(*)::int AS total
    FROM base
    GROUP BY 1, 2
  ),
  resumo AS (
    SELECT
      COUNT(*)::int                                                             AS total_medidas,
      COUNT(DISTINCT colaborador_id)::int                                       AS colaboradores_envolvidos,
      (SELECT COUNT(*) FROM por_colaborador WHERE reincidente)::int             AS colaboradores_reincidentes,
      COUNT(*) FILTER (WHERE tipo = 'suspensao')::int                           AS total_suspensoes,
      COUNT(*) FILTER (WHERE tipo = 'justa_causa')::int                         AS total_justas_causas
    FROM base
  )
  SELECT jsonb_build_object(
    'periodo',           jsonb_build_object('inicio', p_data_inicio, 'fim', p_data_fim),
    'resumo',            COALESCE((SELECT to_jsonb(r) FROM resumo r), '{}'::jsonb),
    'por_colaborador',   COALESCE((SELECT jsonb_agg(pc ORDER BY pc.total DESC, pc.nome_completo)
                                    FROM (SELECT * FROM por_colaborador) pc), '[]'::jsonb),
    'por_setor',         COALESCE((SELECT jsonb_agg(ps ORDER BY ps.total DESC)
                                    FROM (SELECT * FROM por_setor) ps), '[]'::jsonb),
    'por_gestor',        COALESCE((SELECT jsonb_agg(pg ORDER BY pg.total DESC)
                                    FROM (SELECT * FROM por_gestor) pg), '[]'::jsonb),
    'heatmap',           COALESCE((SELECT jsonb_agg(h ORDER BY h.mes, h.tipo)
                                    FROM (SELECT * FROM heatmap) h), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$
