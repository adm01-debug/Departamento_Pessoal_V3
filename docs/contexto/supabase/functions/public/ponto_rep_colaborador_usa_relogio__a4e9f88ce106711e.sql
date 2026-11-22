CREATE OR REPLACE FUNCTION public.ponto_rep_colaborador_usa_relogio(_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _colaborador_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.ponto_rep_funcionarios f
    JOIN public.ponto_rep_dispositivos d ON d.id = f.dispositivo_id
    WHERE f.colaborador_id = _colaborador_id
      AND d.ativo = true
  );
$function$
