CREATE OR REPLACE FUNCTION public.desvincular_funcionario_relogio(_funcionario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_func public.ponto_rep_funcionarios%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_func FROM public.ponto_rep_funcionarios WHERE id = _funcionario_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.pertence_a_empresa(v_func.empresa_id)
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissao para desvincular este funcionario do relogio' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ponto_rep_funcionarios
     SET colaborador_id = NULL,
         vinculo_metodo = NULL,
         vinculado_em = NULL,
         updated_at = now()
   WHERE id = v_func.id;

  UPDATE public.ponto_rep_dias
     SET processado_em = NULL,
         updated_at = now()
   WHERE dispositivo_id = v_func.dispositivo_id
     AND funcionario_codigo = v_func.codigo;
END
$function$
