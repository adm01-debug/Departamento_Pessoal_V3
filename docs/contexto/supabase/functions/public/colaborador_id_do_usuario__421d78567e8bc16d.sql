CREATE OR REPLACE FUNCTION public.colaborador_id_do_usuario(p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select c.id
    from public.colaboradores c
   where c.user_id = auth.uid()
     and c.empresa_id = p_empresa_id
   limit 1
$function$
