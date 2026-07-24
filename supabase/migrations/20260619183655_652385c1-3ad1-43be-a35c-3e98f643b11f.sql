
DROP POLICY IF EXISTS "Admins can manage employees" ON public.colaboradores;

DROP POLICY IF EXISTS "Admins manage employees in their empresas" ON public.colaboradores;
CREATE POLICY "Admins manage employees in their empresas"
ON public.colaboradores
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
);
