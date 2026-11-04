CREATE OR REPLACE FUNCTION public.encrypt_pix_itens_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.chave_pix IS DISTINCT FROM OLD.chave_pix THEN
    NEW.chave_pix_encrypted := public.encrypt_dados_bancarios(NEW.chave_pix);
  END IF;
  RETURN NEW;
END;
$function$
