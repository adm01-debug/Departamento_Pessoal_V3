-- 1. Restrict orphan tables
ALTER TABLE public.permissao_recursos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissao_recursos;
CREATE POLICY "Admin can manage permissions" ON public.permissao_recursos
    FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE public.versao_banco ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view DB version" ON public.versao_banco;
CREATE POLICY "Anyone authenticated can view DB version" ON public.versao_banco
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Harden audit_logs (Multi-tenant isolation)
-- Drop permissive policies if they exist (already checked they are loose)
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "Multi-tenant access for audit_logs" ON public.audit_logs;

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        (empresa_id IN (SELECT get_user_empresas(auth.uid())))
    );

DROP POLICY IF EXISTS "Users can view logs of their companies" ON public.audit_logs;
CREATE POLICY "Users can view logs of their companies" ON public.audit_logs
    FOR SELECT USING (
        empresa_id IN (SELECT get_user_empresas(auth.uid())) OR
        is_admin(auth.uid())
    );

-- 3. Update metricas_processamento
DROP POLICY IF EXISTS "Service role can manage metrics" ON public.metricas_processamento;
DROP POLICY IF EXISTS "Service role full access" ON public.metricas_processamento;
CREATE POLICY "Service role full access" ON public.metricas_processamento
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can view processing metrics" ON public.metricas_processamento;
CREATE POLICY "Admins can view processing metrics" ON public.metricas_processamento
    FOR SELECT USING (is_admin(auth.uid()));

-- 4. Lookup tables (Authenticated only)
DROP POLICY IF EXISTS "Read etnias" ON public.etnias;
DROP POLICY IF EXISTS "Authenticated users can read etnias" ON public.etnias;
CREATE POLICY "Authenticated users can read etnias" ON public.etnias
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Read identidades_genero" ON public.identidades_genero;
DROP POLICY IF EXISTS "Authenticated users can read gender identities" ON public.identidades_genero;
CREATE POLICY "Authenticated users can read gender identities" ON public.identidades_genero
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "paises_read" ON public.paises;
DROP POLICY IF EXISTS "Authenticated users can read countries" ON public.paises;
CREATE POLICY "Authenticated users can read countries" ON public.paises
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "nacionalidades_read" ON public.nacionalidades;
DROP POLICY IF EXISTS "Authenticated users can read nationalities" ON public.nacionalidades;
CREATE POLICY "Authenticated users can read nationalities" ON public.nacionalidades
    FOR SELECT USING (auth.role() = 'authenticated');
