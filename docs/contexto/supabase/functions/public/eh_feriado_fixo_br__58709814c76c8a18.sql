CREATE OR REPLACE FUNCTION public.eh_feriado_fixo_br(p_data date)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT to_char(p_data, 'MM-DD') IN (
    '01-01', -- Ano Novo
    '04-21', -- Tiradentes
    '05-01', -- Dia do Trabalho
    '09-07', -- Independência
    '10-12', -- Nossa Senhora Aparecida
    '11-02', -- Finados
    '11-15', -- Proclamação da República
    '12-25'  -- Natal
  );
$function$
