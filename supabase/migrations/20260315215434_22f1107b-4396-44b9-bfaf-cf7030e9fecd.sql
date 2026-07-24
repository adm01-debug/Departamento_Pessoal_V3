-- Add empresa_id to banco_horas for proper multi-tenant filtering
ALTER TABLE public.banco_horas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- Backfill empresa_id from colaboradores
UPDATE public.banco_horas bh
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE bh.colaborador_id = c.id
AND bh.empresa_id IS NULL;

-- Drop old permissive RLS policies and create empresa-scoped ones

-- banco_horas
DROP POLICY IF EXISTS "Authenticated users can manage banco_horas" ON public.banco_horas;
DROP POLICY IF EXISTS "empresa_banco_horas" ON public.banco_horas;
CREATE POLICY "empresa_banco_horas" ON public.banco_horas FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- pesquisas
DROP POLICY IF EXISTS "auth_pesquisas_all" ON public.pesquisas;
DROP POLICY IF EXISTS "empresa_pesquisas" ON public.pesquisas;
CREATE POLICY "empresa_pesquisas" ON public.pesquisas FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- comunicados
DROP POLICY IF EXISTS "Auth users manage comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "empresa_comunicados" ON public.comunicados;
CREATE POLICY "empresa_comunicados" ON public.comunicados FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- canal_etica
DROP POLICY IF EXISTS "auth_canal_etica_all" ON public.canal_etica;
DROP POLICY IF EXISTS "empresa_canal_etica" ON public.canal_etica;
CREATE POLICY "empresa_canal_etica" ON public.canal_etica FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- turnos
DROP POLICY IF EXISTS "auth_turnos_all" ON public.turnos;
DROP POLICY IF EXISTS "empresa_turnos" ON public.turnos;
CREATE POLICY "empresa_turnos" ON public.turnos FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- escalas_trabalho
DROP POLICY IF EXISTS "auth_escalas_trabalho_all" ON public.escalas_trabalho;
DROP POLICY IF EXISTS "empresa_escalas_trabalho" ON public.escalas_trabalho;
CREATE POLICY "empresa_escalas_trabalho" ON public.escalas_trabalho FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- workflows_definicoes
DROP POLICY IF EXISTS "auth_workflows_def_all" ON public.workflows_definicoes;
DROP POLICY IF EXISTS "empresa_workflows_def" ON public.workflows_definicoes;
CREATE POLICY "empresa_workflows_def" ON public.workflows_definicoes FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- workflows_execucoes
DROP POLICY IF EXISTS "auth_workflows_exec_all" ON public.workflows_execucoes;
DROP POLICY IF EXISTS "empresa_workflows_exec" ON public.workflows_execucoes;
CREATE POLICY "empresa_workflows_exec" ON public.workflows_execucoes FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- despesas
DROP POLICY IF EXISTS "auth_despesas_all" ON public.despesas;
DROP POLICY IF EXISTS "empresa_despesas" ON public.despesas;
CREATE POLICY "empresa_despesas" ON public.despesas FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- controle_acesso
DROP POLICY IF EXISTS "auth_controle_acesso_all" ON public.controle_acesso;
DROP POLICY IF EXISTS "empresa_controle_acesso" ON public.controle_acesso;
CREATE POLICY "empresa_controle_acesso" ON public.controle_acesso FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- lgpd_consentimentos
DROP POLICY IF EXISTS "auth_lgpd_consentimentos_all" ON public.lgpd_consentimentos;
DROP POLICY IF EXISTS "empresa_lgpd_consentimentos" ON public.lgpd_consentimentos;
CREATE POLICY "empresa_lgpd_consentimentos" ON public.lgpd_consentimentos FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- lgpd_solicitacoes
DROP POLICY IF EXISTS "auth_lgpd_solicitacoes_all" ON public.lgpd_solicitacoes;
DROP POLICY IF EXISTS "empresa_lgpd_solicitacoes" ON public.lgpd_solicitacoes;
CREATE POLICY "empresa_lgpd_solicitacoes" ON public.lgpd_solicitacoes FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));