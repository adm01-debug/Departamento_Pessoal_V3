CREATE OR REPLACE FUNCTION public.sec_verify_seals_admin()
 RETURNS TABLE(tabela text, selados bigint, divergentes bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.sec_verify_seals();
END;
$function$
