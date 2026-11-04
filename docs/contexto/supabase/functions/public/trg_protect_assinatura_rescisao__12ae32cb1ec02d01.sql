CREATE OR REPLACE FUNCTION public.trg_protect_assinatura_rescisao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.assinado_empresa IS DISTINCT FROM OLD.assinado_empresa
      OR NEW.assinado_colaborador IS DISTINCT FROM OLD.assinado_colaborador
      OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
      OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador)
     AND current_setting('app.allow_signature_write', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Assinatura de rescisao so pode ser registrada via public.assinar_desligamento()'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$
