CREATE OR REPLACE FUNCTION public.fn_link_gov_br_account(_user_id uuid, _cpf text, _nivel text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF _user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    UPDATE public.profiles
    SET gov_br_vinculado = true,
        gov_br_nivel = _nivel
    WHERE id = _user_id;

    UPDATE public.colaboradores
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{gov_br_verified}', 'true')
    WHERE cpf = _cpf AND empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = _user_id);
END;
$function$
