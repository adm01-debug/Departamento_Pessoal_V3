CREATE OR REPLACE FUNCTION public.garantir_rubrica_suspensao(p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rubrica_id UUID;
BEGIN
  IF NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  SELECT id INTO v_rubrica_id
  FROM public.rubricas_folha
  WHERE empresa_id = p_empresa_id AND codigo = 'DESC_SUSP'
  LIMIT 1;

  IF v_rubrica_id IS NULL THEN
    INSERT INTO public.rubricas_folha (
      empresa_id, codigo, descricao, tipo,
      incide_inss, incide_irrf, incide_fgts, automatico, ativo, natureza_rubrica
    ) VALUES (
      p_empresa_id, 'DESC_SUSP', 'Desconto por Suspensão Disciplinar', 'desconto',
      false, false, false, true, true, 'desconto_disciplinar'
    )
    RETURNING id INTO v_rubrica_id;
  END IF;

  RETURN v_rubrica_id;
END;
$function$
