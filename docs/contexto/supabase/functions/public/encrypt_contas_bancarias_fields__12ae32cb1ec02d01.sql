CREATE OR REPLACE FUNCTION public.encrypt_contas_bancarias_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.agencia IS DISTINCT FROM OLD.agencia THEN
    NEW.agencia_encrypted := public.encrypt_dados_bancarios(NEW.agencia);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.conta IS DISTINCT FROM OLD.conta THEN
    NEW.conta_encrypted := public.encrypt_dados_bancarios(NEW.conta);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.digito IS DISTINCT FROM OLD.digito THEN
    NEW.digito_encrypted := public.encrypt_dados_bancarios(NEW.digito);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.pix_chave IS DISTINCT FROM OLD.pix_chave THEN
    NEW.pix_chave_encrypted := public.encrypt_dados_bancarios(NEW.pix_chave);
  END IF;
  RETURN NEW;
END;
$function$
