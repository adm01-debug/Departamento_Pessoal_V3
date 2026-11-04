CREATE OR REPLACE FUNCTION public.proibir_delete_afastamento_encerrado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('encerrado','cancelado') OR OLD.aprovado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Afastamentos encerrados/aprovados não podem ser deletados (prova previdenciária INSS - retenção mínima 20 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
