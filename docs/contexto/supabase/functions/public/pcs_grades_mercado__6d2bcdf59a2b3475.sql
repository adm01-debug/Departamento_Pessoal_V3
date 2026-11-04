CREATE OR REPLACE FUNCTION public.pcs_grades_mercado(p_plano_id uuid)
 RETURNS TABLE(grade_id uuid, grade_nome text, ordem integer, pontos_min numeric, pontos_max numeric, salario_min numeric, salario_medio numeric, salario_max numeric, mercado_p50 numeric, cargos_com_mercado integer, posicionamento numeric, aderencia text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  WITH authorized_plan AS (
    SELECT p.* FROM public.pcs_planos p
    WHERE p.id = p_plano_id AND p.deleted_at IS NULL
      AND public.pcs_pode_ver_plano(p.id)
  ), market AS (
    SELECT DISTINCT ON (lower(btrim(s.cargo_referencia)))
      lower(btrim(s.cargo_referencia)) AS key, s.p50
    FROM public.pcs_pesquisa_salarial s
    JOIN authorized_plan p ON p.empresa_id = s.empresa_id
    WHERE s.p50 IS NOT NULL
    ORDER BY lower(btrim(s.cargo_referencia)), s.data_referencia DESC, s.id DESC
  ), by_grade AS (
    SELECT g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
      g.salario_min, g.salario_medio, g.salario_max,
      avg(m.p50)::numeric AS market_p50, count(m.p50)::integer AS market_jobs
    FROM authorized_plan p
    JOIN public.pcs_grades g ON g.plano_id = p.id
    LEFT JOIN public.pcs_avaliacoes_cargo a ON a.plano_id = g.plano_id
      AND a.pontos_total BETWEEN g.pontos_min AND g.pontos_max
    LEFT JOIN public.cargos c ON c.id = a.cargo_id
    LEFT JOIN market m ON m.key = lower(btrim(c.nome))
    GROUP BY g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
      g.salario_min, g.salario_medio, g.salario_max
  )
  SELECT id, nome, by_grade.ordem, by_grade.pontos_min, by_grade.pontos_max,
    by_grade.salario_min, by_grade.salario_medio, by_grade.salario_max,
    round(market_p50, 2), market_jobs,
    round(by_grade.salario_medio / NULLIF(market_p50, 0), 4),
    CASE WHEN market_p50 IS NULL THEN 'sem_referencia'
      WHEN by_grade.salario_medio < market_p50 * 0.95 THEN 'abaixo_mercado'
      WHEN by_grade.salario_medio > market_p50 * 1.05 THEN 'acima_mercado'
      ELSE 'alinhado' END
  FROM by_grade ORDER BY by_grade.ordem
$function$
