-- P0-RLS-AUDITORIA: Garante políticas RLS consistentes para tabelas do dashboard
-- Corrigido após análise de erros 400 nas queries do dashboard
--
-- PROBLEMAS IDENTIFICADOS:
-- 1. DashboardPage.tsx:168 - neq duplicado para mesma coluna (corrigido no frontend)
-- 2. useExecutiveDashboard.ts:45 - coluna horas_falta não existe em batidas_ponto (corrigido)
-- 3. Queries sem filtro de empresa podem falhar se RLS exigir empresa_id
--
-- SOLUÇÃO: Garantir políticas RLS permissivas para SELECT nas tabelas do dashboard

-- ============================================================================
-- CRIA/RECRIA POLÍTICAS RLS PARA TABELAS DO DASHBOARD
-- ============================================================================

-- 1. admissoes - política permissiva de SELECT
DROP POLICY IF EXISTS "admissoes_tenant_select" ON public.admissoes;
CREATE POLICY "admissoes_tenant_select" ON public.admissoes
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR empresa_id IS NULL
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 2. batidas_ponto - política via colaboradores (JOIN)
DROP POLICY IF EXISTS "batidas_ponto_tenant_select" ON public.batidas_ponto;
CREATE POLICY "batidas_ponto_tenant_select" ON public.batidas_ponto
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 3. provisoes_mensais - política via colaboradores (JOIN)
DROP POLICY IF EXISTS "provisoes_mensais_tenant_select" ON public.provisoes_mensais;
CREATE POLICY "provisoes_mensais_tenant_select" ON public.provisoes_mensais
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 4. registros_ponto - garantir política via colaboradores
DROP POLICY IF EXISTS "registros_ponto_tenant_select" ON public.registros_ponto;
CREATE POLICY "registros_ponto_tenant_select" ON public.registros_ponto
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 5. faltas - garantir política
DROP POLICY IF EXISTS "faltas_tenant_select" ON public.faltas;
CREATE POLICY "faltas_tenant_select" ON public.faltas
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 6. esocial_eventos - política via empresa
DROP POLICY IF EXISTS "esocial_eventos_tenant_select" ON public.esocial_eventos;
CREATE POLICY "esocial_eventos_tenant_select" ON public.esocial_eventos
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR empresa_id IS NULL
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 7. exames - política via colaboradores
DROP POLICY IF EXISTS "exames_tenant_select" ON public.exames;
CREATE POLICY "exames_tenant_select" ON public.exames
  FOR SELECT TO authenticated
  USING (
    (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 8. folhas_pagamento - política via empresa
DROP POLICY IF EXISTS "folhas_pagamento_tenant_select" ON public.folhas_pagamento;
CREATE POLICY "folhas_pagamento_tenant_select" ON public.folhas_pagamento
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'financeiro')
  );

-- 9. desligamentos - política via empresa
DROP POLICY IF EXISTS "desligamentos_tenant_select" ON public.desligamentos;
CREATE POLICY "desligamentos_tenant_select" ON public.desligamentos
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 10. banco_horas - política via colaboradores
DROP POLICY IF EXISTS "banco_horas_tenant_select" ON public.banco_horas;
CREATE POLICY "banco_horas_tenant_select" ON public.banco_horas
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 11. solicitacoes_ajuste_ponto - política via empresa
DROP POLICY IF EXISTS "solicitacoes_ajuste_ponto_tenant_select" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "solicitacoes_ajuste_ponto_tenant_select" ON public.solicitacoes_ajuste_ponto
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 12. documentos_assinatura - política via empresa
DROP POLICY IF EXISTS "documentos_assinatura_tenant_select" ON public.documentos_assinatura;
CREATE POLICY "documentos_assinatura_tenant_select" ON public.documentos_assinatura
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- 13. colaborador_beneficios - política via empresa
DROP POLICY IF EXISTS "colaborador_beneficios_tenant_select" ON public.colaborador_beneficios;
CREATE POLICY "colaborador_beneficios_tenant_select" ON public.colaborador_beneficios
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR (
      colaborador_id IN (
        SELECT id FROM public.colaboradores
        WHERE empresa_id = public.user_empresa_id()
      )
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

COMMENT ON POLICY "admissoes_tenant_select" ON public.admissoes IS '[P0-RLS-AUDITORIA] SELECT permissivo via user_empresa_id()';
COMMENT ON POLICY "batidas_ponto_tenant_select" ON public.batidas_ponto IS '[P0-RLS-AUDITORIA] SELECT via JOIN colaboradores';
COMMENT ON POLICY "provisoes_mensais_tenant_select" ON public.provisoes_mensais IS '[P0-RLS-AUDITORIA] SELECT via JOIN colaboradores';
