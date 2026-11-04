CREATE OR REPLACE FUNCTION public.pode_editar_colaborador(p_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
     and exists (
       select 1
         from public.colaboradores alvo
        where alvo.id = p_colaborador_id
          and alvo.empresa_id is not null
          and alvo.empresa_id in (select public.get_user_empresas(auth.uid()))
          and (
            public.pode_gerir_avaliacoes()
            or (
              exists (
                select 1 from public.user_roles ur
                 where ur.user_id = auth.uid() and ur.role::text = 'gestor'
              )
              and (
                exists (
                  select 1
                    from public.colaboradores gestor
                   where gestor.id = alvo.supervisor_id
                     and gestor.empresa_id = alvo.empresa_id
                     and gestor.user_id = auth.uid()
                     and gestor.id <> alvo.id
                )
                or (
                  alvo.user_id is distinct from auth.uid()
                  and exists (
                    select 1
                      from public.ninebox_permissoes_homologacao h
                     where h.user_id = auth.uid()
                       and h.habilitado = true
                       and h.expira_em > now()
                  )
                )
              )
            )
          )
     )
$function$
