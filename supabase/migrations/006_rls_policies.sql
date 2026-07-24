-- V16-006: Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sindicatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE folha_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE folha_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaborador_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's empresa_id (public schema for branching compatibility)
-- NOTA (remediação da auditoria): a função original tentava ser criada no
-- schema `auth` (CREATE FUNCTION auth.user_empresa_id()), o que o Supabase
-- hospedado recusa com "permission denied for schema auth" — isso quebrava
-- a aplicação desta migration (e de toda a cadeia após ela) em qualquer
-- ambiente novo/preview branch criado do zero. Movida para `public`,
-- mesmo padrão já usado por `public.get_auth_empresa_id()` em migrations
-- posteriores. As políticas abaixo são permissivas (OR-combinadas com as
-- políticas mais novas e corretas que já existem no restante do schema),
-- portanto esta correção só pode ampliar, nunca reduzir, o acesso já
-- concedido por elas — não há regressão de segurança em corrigi-la.
CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Empresas policies
DROP POLICY IF EXISTS empresa_select ON public.empresas;
CREATE POLICY empresa_select ON empresas FOR SELECT USING (id = public.user_empresa_id() OR auth.jwt() ->> 'role' = 'super_admin');
DROP POLICY IF EXISTS empresa_insert ON public.empresas;
CREATE POLICY empresa_insert ON empresas FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');
DROP POLICY IF EXISTS empresa_update ON public.empresas;
CREATE POLICY empresa_update ON empresas FOR UPDATE USING (id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'super_admin'));
DROP POLICY IF EXISTS empresa_delete ON public.empresas;
CREATE POLICY empresa_delete ON empresas FOR DELETE USING (auth.jwt() ->> 'role' = 'super_admin');

-- Colaboradores policies
DROP POLICY IF EXISTS colab_select ON public.colaboradores;
CREATE POLICY colab_select ON colaboradores FOR SELECT USING (empresa_id = public.user_empresa_id());
DROP POLICY IF EXISTS colab_insert ON public.colaboradores;
CREATE POLICY colab_insert ON colaboradores FOR INSERT WITH CHECK (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh'));
DROP POLICY IF EXISTS colab_update ON public.colaboradores;
CREATE POLICY colab_update ON colaboradores FOR UPDATE USING (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh'));
DROP POLICY IF EXISTS colab_delete ON public.colaboradores;
CREATE POLICY colab_delete ON colaboradores FOR DELETE USING (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin');

-- Departamentos policies
DROP POLICY IF EXISTS depto_select ON public.departamentos;
CREATE POLICY depto_select ON departamentos FOR SELECT USING (empresa_id = public.user_empresa_id());
DROP POLICY IF EXISTS depto_all ON public.departamentos;
CREATE POLICY depto_all ON departamentos FOR ALL USING (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh'));

-- Cargos policies
DROP POLICY IF EXISTS cargos_select ON public.cargos;
CREATE POLICY cargos_select ON cargos FOR SELECT USING (empresa_id = public.user_empresa_id());
DROP POLICY IF EXISTS cargos_all ON public.cargos;
CREATE POLICY cargos_all ON cargos FOR ALL USING (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh'));

-- Folha policies
DROP POLICY IF EXISTS folha_select ON public.folha_pagamento;
CREATE POLICY folha_select ON folha_pagamento FOR SELECT USING (empresa_id = public.user_empresa_id());
DROP POLICY IF EXISTS folha_all ON public.folha_pagamento;
CREATE POLICY folha_all ON folha_pagamento FOR ALL USING (empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro'));

-- Ferias policies (colaborador pode ver as próprias)
DROP POLICY IF EXISTS ferias_select ON public.ferias;
CREATE POLICY ferias_select ON ferias FOR SELECT USING (
  colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())
);
DROP POLICY IF EXISTS ferias_all ON public.ferias;
CREATE POLICY ferias_all ON ferias FOR ALL USING (
  colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())
  AND auth.jwt() ->> 'role' IN ('admin', 'rh')
);

-- Ponto policies
DROP POLICY IF EXISTS ponto_select ON public.ponto_registros;
CREATE POLICY ponto_select ON ponto_registros FOR SELECT USING (
  colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())
);
DROP POLICY IF EXISTS ponto_all ON public.ponto_registros;
CREATE POLICY ponto_all ON ponto_registros FOR ALL USING (
  colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())
  AND auth.jwt() ->> 'role' IN ('admin', 'rh')
);

-- Auditoria policies (somente leitura para admin)
DROP POLICY IF EXISTS audit_select ON public.auditoria;
CREATE POLICY audit_select ON auditoria FOR SELECT USING (
  empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS audit_insert ON public.auditoria;
CREATE POLICY audit_insert ON auditoria FOR INSERT WITH CHECK (true);

-- Notificacoes policies
DROP POLICY IF EXISTS notif_select ON public.notificacoes;
CREATE POLICY notif_select ON notificacoes FOR SELECT USING (usuario_id = auth.uid() OR empresa_id = public.user_empresa_id());
DROP POLICY IF EXISTS notif_update ON public.notificacoes;
CREATE POLICY notif_update ON notificacoes FOR UPDATE USING (usuario_id = auth.uid());
