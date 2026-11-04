CREATE OR REPLACE FUNCTION public.reconcile_training_image(p_empresa_id uuid, p_content_type text, p_content_id uuid, p_decision text, p_operator text, p_notes text)
 RETURNS training_images
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_linha public.training_images;
BEGIN
  IF p_decision NOT IN ('confirmar_nao_gerado', 'manter_bloqueado') THEN
    RAISE EXCEPTION 'decisao_invalida';
  END IF;
  IF coalesce(trim(p_operator), '') = '' THEN
    RAISE EXCEPTION 'operador_obrigatorio';
  END IF;
  IF coalesce(trim(p_notes), '') = '' THEN
    RAISE EXCEPTION 'notas_obrigatorias';
  END IF;

  SELECT * INTO v_linha
  FROM public.training_images ti
  WHERE ti.empresa_id = p_empresa_id
    AND ti.content_type = p_content_type
    AND ti.content_id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registro_inexistente';
  END IF;

  IF v_linha.status <> 'failed'
     OR coalesce(v_linha.last_error, '') NOT LIKE 'resultado_desconhecido%' THEN
    RAISE EXCEPTION 'registro_nao_esta_em_estado_desconhecido';
  END IF;

  IF p_decision = 'confirmar_nao_gerado' THEN
    UPDATE public.training_images
       SET status = 'disabled',
           attempts = 0,
           last_error = NULL,
           completed_at = now(),
           reconciled_at = now(),
           reconciled_by = p_operator,
           reconciliation_notes = p_notes
     WHERE id = v_linha.id
     RETURNING * INTO v_linha;
  ELSE
    UPDATE public.training_images
       SET reconciled_at = now(),
           reconciled_by = p_operator,
           reconciliation_notes = p_notes
     WHERE id = v_linha.id
     RETURNING * INTO v_linha;
  END IF;

  RETURN v_linha;
END
$function$
