-- 1. Políticas de RLS para tabelas órfãs (v3)
DO $$ 
BEGIN
    -- ponto_auditoria
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ponto_auditoria' AND policyname = 'Users can view their own point audit') THEN
        CREATE POLICY "Users can view their own point audit" ON public.ponto_auditoria 
        FOR SELECT TO authenticated USING (
            usuario_id = auth.uid() OR 
            EXISTS (
                SELECT 1 FROM registros_ponto rp
                WHERE rp.id = registro_id AND rp.colaborador_id IN (
                    SELECT id FROM colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))
                )
            )
        );
    END IF;

    -- auditoria_contratual
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria_contratual' AND policyname = 'Users can view their company contract audit') THEN
        CREATE POLICY "Users can view their company contract audit" ON public.auditoria_contratual 
        FOR SELECT TO authenticated USING (
            EXISTS (
                SELECT 1 FROM colaboradores c 
                WHERE c.id = colaborador_id 
                AND c.empresa_id IN (SELECT get_user_empresas(auth.uid()))
            )
        );
    END IF;

    -- logs_sincronizacao
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logs_sincronizacao' AND policyname = 'Users can view their company sync logs') THEN
        CREATE POLICY "Users can view their company sync logs" ON public.logs_sincronizacao 
        FOR SELECT TO authenticated USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));
    END IF;

    -- permissao_perfis
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'permissao_perfis' AND policyname = 'Users can view profiles') THEN
        CREATE POLICY "Users can view profiles" ON public.permissao_perfis 
        FOR SELECT TO authenticated USING (true);
    END IF;

    -- parametros_sistema
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parametros_sistema' AND policyname = 'Users can view system parameters') THEN
        CREATE POLICY "Users can view system parameters" ON public.parametros_sistema 
        FOR SELECT TO authenticated USING (true);
    END IF;

    -- tarefas_onboarding
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tarefas_onboarding' AND policyname = 'Tenant scoped onboarding tasks') THEN
        CREATE POLICY "Tenant scoped onboarding tasks" ON public.tarefas_onboarding 
        FOR ALL TO authenticated USING (
            EXISTS (
                SELECT 1 FROM admissoes a
                WHERE a.id = admissao_id
                AND a.empresa_id IN (SELECT get_user_empresas(auth.uid()))
            )
        );
    END IF;
END $$;

-- 2. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status ON public.colaboradores (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_colaborador_data ON public.registros_ponto (colaborador_id, data);
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_competencia ON public.folhas_pagamento (empresa_id, competencia);
CREATE INDEX IF NOT EXISTS idx_batidas_ponto_empresa_data ON public.batidas_ponto (empresa_id, data);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_created_at ON public.logs_sistema (created_at DESC);

-- 3. Telemetria
CREATE TABLE IF NOT EXISTS public.query_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT,
    table_name TEXT,
    rpc_name TEXT,
    duration_ms INTEGER,
    record_count INTEGER,
    query_limit INTEGER,
    query_offset INTEGER,
    count_mode TEXT,
    severity TEXT,
    error_message TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'query_telemetry' AND policyname = 'Service role and admins can view telemetry') THEN
        CREATE POLICY "Service role and admins can view telemetry" ON public.query_telemetry 
        FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'query_telemetry' AND policyname = 'Authenticated users can insert telemetry') THEN
        CREATE POLICY "Authenticated users can insert telemetry" ON public.query_telemetry 
        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
