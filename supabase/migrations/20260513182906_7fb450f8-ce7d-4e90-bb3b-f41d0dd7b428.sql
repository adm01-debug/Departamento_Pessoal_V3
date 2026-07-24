-- Ajustar search_path para segurança
ALTER FUNCTION public.process_audit_log() SET search_path = public;
ALTER FUNCTION public.fn_workflow_admissao_auto() SET search_path = public;

-- Habilitar RLS
ALTER TABLE public.cnab_remessas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para CNAB Remessas
DROP POLICY IF EXISTS "Users can see their company remessas" ON public.cnab_remessas;
CREATE POLICY "Users can see their company remessas" ON public.cnab_remessas
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM public.colaboradores 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert their company remessas" ON public.cnab_remessas;
CREATE POLICY "Users can insert their company remessas" ON public.cnab_remessas
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM public.colaboradores 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Políticas para CNAB Itens
DROP POLICY IF EXISTS "Users can see their company cnab items" ON public.cnab_itens;
CREATE POLICY "Users can see their company cnab items" ON public.cnab_itens
FOR SELECT USING (
  remessa_id IN (SELECT id FROM public.cnab_remessas)
);

-- Políticas para Auditoria (Admin apenas via roles)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.auditoria_logs;
CREATE POLICY "Admins can view audit logs" ON public.auditoria_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
