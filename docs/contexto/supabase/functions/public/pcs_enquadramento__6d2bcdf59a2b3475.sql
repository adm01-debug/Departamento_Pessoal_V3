CREATE OR REPLACE FUNCTION public.pcs_enquadramento(p_plano_id uuid)
 RETURNS TABLE(colaborador_id uuid, colaborador_nome text, cargo_nome text, departamento text, salario_atual numeric, grade_nome text, grade_ordem integer, salario_min numeric, salario_medio numeric, salario_max numeric, comparatio numeric, situacao text, ajuste_necessario numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  WITH authorized_plan AS (
    SELECT p.* FROM public.pcs_planos p
    WHERE p.id = p_plano_id AND p.deleted_at IS NULL
      AND public.pcs_pode_gerir_plano(p.id)
  ), evaluated AS (
    SELECT a.cargo_id, c.nome AS cargo_nome, a.pontos_total, a.plano_id
    FROM public.pcs_avaliacoes_cargo a
    JOIN public.cargos c ON c.id = a.cargo_id
    WHERE a.plano_id = p_plano_id
  )
  SELECT col.id, col.nome_completo, ev.cargo_nome, col.departamento,
    col.salario_base, grade.nome, grade.ordem,
    grade.salario_min, grade.salario_medio, grade.salario_max,
    round(col.salario_base / NULLIF(grade.salario_medio, 0), 4),
    CASE WHEN col.salario_base < grade.salario_min THEN 'abaixo_faixa'
      WHEN col.salario_base > grade.salario_max THEN 'acima_faixa'
      ELSE 'dentro_faixa' END,
    CASE WHEN col.salario_base < grade.salario_min
      THEN round(grade.salario_min - col.salario_base, 2) ELSE 0 END
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
  ORDER BY grade.ordem DESC, col.nome_completo
$function$
