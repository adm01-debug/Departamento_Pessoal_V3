-- Refinamento de RLS para solicitacoes_ajuste_ponto
DROP POLICY IF EXISTS "solicitacoes_select_policy" ON public.solicitacoes_ajuste_ponto;
DROP POLICY IF EXISTS "solicitacoes_insert_policy" ON public.solicitacoes_ajuste_ponto;
DROP POLICY IF EXISTS "solicitacoes_update_policy" ON public.solicitacoes_ajuste_ponto;
DROP POLICY IF EXISTS "solicitacoes_delete_policy" ON public.solicitacoes_ajuste_ponto;

-- Política de Visualização: Admins/Gestores veem tudo. 
DROP POLICY IF EXISTS "solicitacoes_select_policy" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "solicitacoes_select_policy" ON public.solicitacoes_ajuste_ponto
FOR SELECT TO authenticated
USING (
  (SELECT role_display FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'gestor')
);

-- Política de Inserção: Permitida para autenticados
DROP POLICY IF EXISTS "solicitacoes_insert_policy" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "solicitacoes_insert_policy" ON public.solicitacoes_ajuste_ponto
FOR INSERT TO authenticated
WITH CHECK (true);

-- Política de Atualização: Apenas Admins/Gestores podem mudar status
DROP POLICY IF EXISTS "solicitacoes_update_policy" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "solicitacoes_update_policy" ON public.solicitacoes_ajuste_ponto
FOR UPDATE TO authenticated
USING (
  (SELECT role_display FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'gestor')
)
WITH CHECK (
  (SELECT role_display FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'gestor')
);

-- Política de Deleção: Admins/Gestores
DROP POLICY IF EXISTS "solicitacoes_delete_policy" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "solicitacoes_delete_policy" ON public.solicitacoes_ajuste_ponto
FOR DELETE TO authenticated
USING (
  (SELECT role_display FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'gestor')
);

-- RLS Notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_select_policy" ON public.notificacoes;
CREATE POLICY "notificacoes_select_policy" ON public.notificacoes
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notificacoes_update_policy" ON public.notificacoes;
CREATE POLICY "notificacoes_update_policy" ON public.notificacoes
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (lida IS NOT NULL);
