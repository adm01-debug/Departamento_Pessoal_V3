CREATE OR REPLACE FUNCTION public.get_colaborador_banco_horas(p_colaborador_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_saldo_total INTEGER := 0;
    v_empresa_id uuid;
BEGIN
    SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
    IF NOT (public.sou_o_colaborador(p_colaborador_id)
            OR public.pode_gerir_rh(v_empresa_id)
            OR public.pode_gerir_pessoas(v_empresa_id)) THEN
        RAISE EXCEPTION 'Sem permissão para este saldo de banco de horas';
    END IF;

    SELECT
        COALESCE(SUM(
            EXTRACT(EPOCH FROM (COALESCE(horas_extras, '00:00:00'::interval) - COALESCE(horas_falta, '00:00:00'::interval))) / 60
        )::INTEGER, 0)
    INTO v_saldo_total
    FROM public.registros_ponto
    WHERE colaborador_id = p_colaborador_id
    AND aprovado = true;

    RETURN v_saldo_total;
END;
$function$
