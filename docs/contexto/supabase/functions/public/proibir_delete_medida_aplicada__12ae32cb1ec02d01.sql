CREATE OR REPLACE FUNCTION public.proibir_delete_medida_aplicada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('aplicada','assinada','ciente','homologada','concluida','concluída')
     OR OLD.colaborador_ciente = true
     OR OLD.assinado_em IS NOT NULL
     OR OLD.recusa_assinatura = true THEN
    RAISE EXCEPTION 'Medidas disciplinares aplicadas não podem ser deletadas (prova trabalhista - retenção mínima 5 anos). Use status=anulada.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
