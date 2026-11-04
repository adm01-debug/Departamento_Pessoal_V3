CREATE OR REPLACE FUNCTION public.proibir_delete_documento_assinado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'assinado' OR OLD.assinatura_base64 IS NOT NULL OR OLD.assinado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Documentos assinados digitalmente não podem ser deletados (validade jurídica MP 2.200-2/2001 - retenção mínima 5 anos após término do vínculo). Use status=cancelado.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
