CREATE OR REPLACE FUNCTION public.aprovar_despesa(_despesa_id uuid, _observacoes text DEFAULT NULL::text)
 RETURNS despesas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.despesas;
BEGIN
  UPDATE public.despesas
    SET status = 'aprovado',
        aprovado_por = auth.uid(),
        aprovado_em = now(),
        observacoes_aprovador = COALESCE(_observacoes, observacoes_aprovador),
        updated_at = now()
    WHERE id = _despesa_id
      AND status = 'pendente'
      AND empresa_id IN (SELECT get_user_empresas(auth.uid()))
    RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Despesa não encontrada ou não pode ser aprovada';
  END IF;
  RETURN _row;
END;
$function$
