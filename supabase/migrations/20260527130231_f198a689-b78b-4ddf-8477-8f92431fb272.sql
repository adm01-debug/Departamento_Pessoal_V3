-- 1. Função de helper segura no schema public (evita problemas de permissão no schema auth)
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id', ''))::UUID;
$$ LANGUAGE SQL STABLE SET search_path = public;

-- 2. Limpar políticas permissivas perigosas (USING true)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual = '(true)' OR qual ILIKE '%auth.uid() IS NOT NULL%')
        AND tablename IN ('colaboradores', 'ferias', 'folhas_pagamento', 'registros_ponto', 'dependentes', 'jornadas', 'escalas', 'turnos')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 3. Aplicar Isolamento Robusto por Empresa utilizando a nova função
DROP POLICY IF EXISTS "empresa_isolation_colaboradores" ON public.colaboradores;
CREATE POLICY "empresa_isolation_colaboradores" ON public.colaboradores
FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "empresa_isolation_dependentes" ON public.dependentes;
CREATE POLICY "empresa_isolation_dependentes" ON public.dependentes
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM colaboradores WHERE id = colaborador_id AND empresa_id = public.get_auth_empresa_id())
);

DROP POLICY IF EXISTS "empresa_isolation_ponto" ON public.registros_ponto;
CREATE POLICY "empresa_isolation_ponto" ON public.registros_ponto
FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "empresa_isolation_ferias" ON public.ferias;
CREATE POLICY "empresa_isolation_ferias" ON public.ferias
FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "empresa_isolation_folhas" ON public.folhas_pagamento;
CREATE POLICY "empresa_isolation_folhas" ON public.folhas_pagamento
FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id());

-- 4. Segurança em Admissão (Token-based)
ALTER TABLE public.admissao_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon access" ON public.admissao_tokens;
DROP POLICY IF EXISTS "token_access_isolation" ON public.admissao_tokens;
CREATE POLICY "token_access_isolation" ON public.admissao_tokens
FOR SELECT TO anon, authenticated USING (data_expiracao > NOW());
