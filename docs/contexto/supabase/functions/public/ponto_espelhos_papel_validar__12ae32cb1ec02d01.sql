CREATE OR REPLACE FUNCTION public.ponto_espelhos_papel_validar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id AND c.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'colaborador % não pertence à empresa %', NEW.colaborador_id, NEW.empresa_id
      USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL THEN
    NEW.registrado_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
