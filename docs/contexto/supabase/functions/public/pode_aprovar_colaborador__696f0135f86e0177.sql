CREATE OR REPLACE FUNCTION public.pode_aprovar_colaborador(p_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.colaboradores alvo
     WHERE alvo.id = p_colaborador_id
       AND alvo.empresa_id IS NOT NULL
       AND alvo.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role::text = 'gestor'
       )
       AND (
         EXISTS (
           SELECT 1 FROM public.colaboradores gestor
            WHERE gestor.id = alvo.supervisor_id
              AND gestor.empresa_id = alvo.empresa_id
              AND gestor.user_id = auth.uid()
              AND gestor.id <> alvo.id
         )
         OR (
           auth.uid() = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d'::uuid
           AND EXISTS (
             SELECT 1 FROM public.ninebox_permissoes_homologacao h
              WHERE h.user_id = auth.uid()
                AND h.habilitado = true
                AND h.expira_em > now()
           )
           -- Evita autoaprovacao se o avaliado for vinculado a mesma conta.
           AND alvo.user_id IS DISTINCT FROM auth.uid()
         )
       )
  );
$function$
