CREATE OR REPLACE FUNCTION public.rejeitar_despesa(_despesa_id uuid, _motivo text)
 RETURNS despesas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.despesas;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório';
  END IF;

  UPDATE public.despesas
    SET status = 'rejeitado',
        aprovado_por = auth.uid(),
        aprovado_em = now(),
        rejeitado_motivo = _motivo,
        updated_at = now()
    WHERE id = _despesa_id
      AND status = 'pendente'
      AND empresa_id IN (SELECT get_user_empresas(auth.uid()))
    RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Despesa não encontrada ou não pode ser rejeitada';
  END IF;
  RETURN _row;
END;
$function$
