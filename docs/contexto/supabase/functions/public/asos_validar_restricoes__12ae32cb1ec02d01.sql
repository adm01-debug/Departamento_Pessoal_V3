CREATE OR REPLACE FUNCTION public.asos_validar_restricoes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.resultado = 'apto_com_restricoes' AND (NEW.restricoes_descricao IS NULL OR length(trim(NEW.restricoes_descricao)) < 5) THEN
    RAISE EXCEPTION 'ASO com restrições exige descrição detalhada (mínimo 5 caracteres)';
  END IF;
  IF NEW.resultado = 'apto_com_restricoes' AND NEW.restricao_data_fim IS NULL THEN
    RAISE EXCEPTION 'ASO com restrições exige data_fim da restrição';
  END IF;
  RETURN NEW;
END;
$function$
