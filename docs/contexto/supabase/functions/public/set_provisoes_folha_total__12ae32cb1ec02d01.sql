CREATE OR REPLACE FUNCTION public.set_provisoes_folha_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.valor_total := round(
    COALESCE(NEW.valor_13_salario, 0)
    + COALESCE(NEW.valor_ferias, 0)
    + COALESCE(NEW.encargos_provisao, 0),
    2
  );
  RETURN NEW;
END
$function$
