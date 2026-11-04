CREATE OR REPLACE FUNCTION public.proibir_delete_epi_entrega_assinada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assinatura_url IS NOT NULL AND OLD.assinatura_url <> '' THEN
    RAISE EXCEPTION 'Entregas de EPI assinadas não podem ser deletadas (NR-6: prova de fornecimento em ações trabalhistas - retenção mínima 5 anos após desligamento).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
