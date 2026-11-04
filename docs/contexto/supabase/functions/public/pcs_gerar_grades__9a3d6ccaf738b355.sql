CREATE OR REPLACE FUNCTION public.pcs_gerar_grades(p_plano_id uuid, p_num_grades integer DEFAULT 8, p_salario_base_menor numeric DEFAULT NULL::numeric)
 RETURNS SETOF pcs_grades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  min_points numeric;
  max_points numeric;
  point_step numeric;
  plan_row public.pcs_planos%ROWTYPE;
  salary_base numeric;
  progression numeric;
  grade_number integer;
  salary_mid numeric;
BEGIN
  IF NOT public.pcs_pode_gerir_plano(p_plano_id) THEN
    RAISE EXCEPTION 'not authorized to manage this PCS plan' USING ERRCODE = '42501';
  END IF;
  IF p_num_grades IS NULL OR p_num_grades < 2 OR p_num_grades > 30 THEN
    RAISE EXCEPTION 'p_num_grades must be between 2 and 30' USING ERRCODE = '22023';
  END IF;
  IF p_salario_base_menor IS NOT NULL AND p_salario_base_menor <= 0 THEN
    RAISE EXCEPTION 'p_salario_base_menor must be positive' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('pcs_grades:' || p_plano_id::text)::bigint);
  SELECT * INTO STRICT plan_row FROM public.pcs_planos
  WHERE id = p_plano_id AND deleted_at IS NULL FOR UPDATE;

  SELECT min(pontos_total), max(pontos_total) INTO min_points, max_points
  FROM public.pcs_avaliacoes_cargo WHERE plano_id = p_plano_id;
  IF min_points IS NULL OR max_points IS NULL OR max_points <= min_points THEN
    RAISE EXCEPTION 'at least two distinct evaluated scores are required' USING ERRCODE = '22023';
  END IF;

  salary_base := p_salario_base_menor;
  IF salary_base IS NULL THEN
    SELECT min(NULLIF(c.salario_base, 0)) INTO salary_base
    FROM public.pcs_avaliacoes_cargo a
    JOIN public.cargos c ON c.id = a.cargo_id
    WHERE a.plano_id = p_plano_id;
  END IF;
  IF salary_base IS NULL OR salary_base <= 0 THEN
    RAISE EXCEPTION 'a positive salary base is required' USING ERRCODE = '22023';
  END IF;

  point_step := (max_points - min_points) / p_num_grades;
  progression := 1 + ((100 - plan_row.overlap_pct) / 100.0)
    * (plan_row.amplitude_pct / 100.0);

  DELETE FROM public.pcs_grades WHERE plano_id = p_plano_id;
  FOR grade_number IN 1..p_num_grades LOOP
    salary_mid := round(salary_base * power(progression, grade_number - 1), 2);
    INSERT INTO public.pcs_grades (
      plano_id, ordem, nome, pontos_min, pontos_max,
      salario_min, salario_medio, salario_max
    ) VALUES (
      p_plano_id, grade_number, 'Grade ' || grade_number,
      round(min_points + point_step * (grade_number - 1), 4),
      round(CASE WHEN grade_number = p_num_grades THEN max_points
        ELSE min_points + point_step * grade_number END, 4),
      round(salary_mid / (1 + plan_row.amplitude_pct / 200.0), 2),
      salary_mid,
      round(salary_mid * (1 + plan_row.amplitude_pct / 200.0), 2)
    );
  END LOOP;

  RETURN QUERY SELECT g.* FROM public.pcs_grades g
  WHERE g.plano_id = p_plano_id ORDER BY g.ordem;
END
$function$
