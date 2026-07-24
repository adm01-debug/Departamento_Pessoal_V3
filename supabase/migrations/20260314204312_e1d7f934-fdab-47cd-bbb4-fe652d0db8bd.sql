-- Harden notifications RLS to avoid cross-user/company data exposure
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notificacoes;

DROP POLICY IF EXISTS "Users can manage scoped notifications" ON public.notificacoes;
CREATE POLICY "Users can manage scoped notifications"
ON public.notificacoes
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    empresa_id IS NOT NULL
    AND public.user_belongs_to_empresa(auth.uid(), empresa_id)
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    empresa_id IS NOT NULL
    AND public.user_belongs_to_empresa(auth.uid(), empresa_id)
  )
);

-- Harden periodos_aquisitivos RLS by company membership through collaborator
DROP POLICY IF EXISTS "Authenticated users can manage periodos_aquisitivos" ON public.periodos_aquisitivos;

DROP POLICY IF EXISTS "Users can manage periodos by empresa" ON public.periodos_aquisitivos;
CREATE POLICY "Users can manage periodos by empresa"
ON public.periodos_aquisitivos
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.colaboradores c
    WHERE c.id = periodos_aquisitivos.colaborador_id
      AND c.empresa_id IS NOT NULL
      AND public.user_belongs_to_empresa(auth.uid(), c.empresa_id)
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.colaboradores c
    WHERE c.id = periodos_aquisitivos.colaborador_id
      AND c.empresa_id IS NOT NULL
      AND public.user_belongs_to_empresa(auth.uid(), c.empresa_id)
  )
);