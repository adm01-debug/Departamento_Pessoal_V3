CREATE OR REPLACE FUNCTION public.proibir_delete_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RAISE EXCEPTION 'Registros de ponto não podem ser deletados por exigência legal (Portaria 671). Use o fluxo de ajuste auditado.';
    RETURN NULL;
END;
$function$
