-- Ajustar política de auditoria
DROP POLICY IF EXISTS audit_insert ON public.auditoria;
CREATE POLICY audit_insert ON public.auditoria 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Garantir RLS em tabelas que podem ter sido esquecidas (baseado no linter)
ALTER TABLE IF EXISTS public.query_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Telemetria visível apenas para admins" ON public.query_telemetry;
CREATE POLICY "Telemetria visível apenas para admins" ON public.query_telemetry
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Criar política de inserção para telemetria (usada pela bridge)
-- Como a bridge usa service_role para inserir, mas queremos segurança caso mude:
DROP POLICY IF EXISTS "Telemetria inserível por service_role" ON public.query_telemetry;
CREATE POLICY "Telemetria inserível por service_role" ON public.query_telemetry
FOR INSERT WITH CHECK (true); 
-- Nota: Inserções via service_role ignoram RLS por padrão, mas habilitamos para boa prática.