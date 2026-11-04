CREATE OR REPLACE FUNCTION public.calcular_total_provisao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.total = NEW.valor_principal + NEW.encargos_inss + NEW.encargos_fgts;
    RETURN NEW;
END;
$function$
