CREATE OR REPLACE FUNCTION public.proibir_delete_ferias_concluidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('em_gozo','paga','concluida','homologada','concluída') THEN
    RAISE EXCEPTION 'Férias em gozo/pagas/concluídas não podem ser deletadas (rastreabilidade CLT - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
