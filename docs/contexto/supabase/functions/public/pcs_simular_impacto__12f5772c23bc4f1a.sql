CREATE OR REPLACE FUNCTION public.pcs_simular_impacto(p_plano_id uuid, p_encargos_pct numeric DEFAULT 36.8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.pcs_pode_ver_plano(p_plano_id) THEN
    RAISE EXCEPTION 'not authorized to read this PCS plan' USING ERRCODE = '42501';
  END IF;
  IF p_encargos_pct IS NULL OR p_encargos_pct < 0 OR p_encargos_pct > 200 THEN
    RAISE EXCEPTION 'p_encargos_pct must be between 0 and 200' USING ERRCODE = '22023';
  END IF;
  WITH authorized_plan AS (
    SELECT p.* FROM public.pcs_planos p
    WHERE p.id = p_plano_id AND p.deleted_at IS NULL
      AND public.pcs_pode_ver_plano(p.id)
  ), evaluated AS (
    SELECT a.cargo_id, c.nome AS cargo_nome, a.pontos_total, a.plano_id
    FROM public.pcs_avaliacoes_cargo a
    JOIN public.cargos c ON c.id = a.cargo_id
    WHERE a.plano_id = p_plano_id
  ), fits AS (
    SELECT
      col.salario_base AS salario_atual,
      round(col.salario_base / NULLIF(grade.salario_medio, 0), 4) AS comparatio,
      CASE WHEN col.salario_base < grade.salario_min THEN 'abaixo_faixa'
        WHEN col.salario_base > grade.salario_max THEN 'acima_faixa'
        ELSE 'dentro_faixa' END AS situacao,
      CASE WHEN col.salario_base < grade.salario_min
        THEN round(grade.salario_min - col.salario_base, 2) ELSE 0 END AS ajuste_necessario
    FROM authorized_plan plan
    JOIN public.colaboradores col
      ON col.empresa_id = plan.empresa_id AND col.status = 'ativo'
        AND col.salario_base IS NOT NULL
    JOIN evaluated ev ON ev.plano_id = plan.id
      AND ((col.cargo_id IS NOT NULL AND col.cargo_id = ev.cargo_id)
        OR (col.cargo_id IS NULL AND lower(btrim(col.cargo)) = lower(btrim(ev.cargo_nome))))
    JOIN LATERAL (
      SELECT g.* FROM public.pcs_grades g
      WHERE g.plano_id = plan.id
        AND ev.pontos_total BETWEEN g.pontos_min AND g.pontos_max
      ORDER BY g.ordem DESC LIMIT 1
    ) grade ON true
  )
  SELECT jsonb_build_object(
    'colaboradores_enquadrados', count(*),
    'abaixo_faixa', count(*) FILTER (WHERE situacao = 'abaixo_faixa'),
    'dentro_faixa', count(*) FILTER (WHERE situacao = 'dentro_faixa'),
    'acima_faixa', count(*) FILTER (WHERE situacao = 'acima_faixa'),
    'folha_atual', round(COALESCE(sum(salario_atual), 0), 2),
    'ajuste_mensal', round(COALESCE(sum(ajuste_necessario), 0), 2),
    'ajuste_com_encargos', round(COALESCE(sum(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0), 2),
    'impacto_anual', round(COALESCE(sum(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0) * 13.33, 2),
    'impacto_pct_folha', round(COALESCE(sum(ajuste_necessario), 0) / NULLIF(sum(salario_atual), 0) * 100, 2),
    'comparatio_medio', round(avg(comparatio), 4),
    'encargos_pct', p_encargos_pct
  ) INTO result FROM fits;
  RETURN COALESCE(result, '{}'::jsonb);
END
$function$
