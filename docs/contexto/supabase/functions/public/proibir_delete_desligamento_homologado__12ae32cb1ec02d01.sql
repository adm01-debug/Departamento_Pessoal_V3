CREATE OR REPLACE FUNCTION public.proibir_delete_desligamento_homologado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    RAISE EXCEPTION 'Desligamentos homologados/pagos não podem ser deletados (retenção fiscal/trabalhista mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
