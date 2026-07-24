-- Issue 53: Corrige RLS cross-tenant em adiantamentos_salariais.
--
-- Migration 20260520120947 criou adiantamentos_salariais com:
--   USING (empresa_id IN (SELECT id FROM public.empresas))
-- Isso permite que qualquer usuário autenticado acesse adiantamentos de TODAS
-- as empresas — violação crítica de isolamento multi-tenant.
--
-- A tabela tem empresa_id NOT NULL com FK para empresas → usar
-- get_auth_empresa_id() diretamente (mesmo padrão das demais tabelas críticas).
--
-- DescontosPage.tsx usa esta tabela em 3 pontos:
--   SELECT  (linha 53)
--   INSERT  (linha 80)
--   UPDATE  (linha 97)

ALTER TABLE public.adiantamentos_salariais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores podem gerenciar adiantamentos da empresa" ON public.adiantamentos_salariais;
DROP POLICY IF EXISTS "adiantamentos_salariais_tenant"                     ON public.adiantamentos_salariais;

CREATE POLICY "adiantamentos_salariais_tenant"
  ON public.adiantamentos_salariais
  FOR ALL
  TO authenticated
  USING  (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── Índices (já podem existir via 20260711153353, IF NOT EXISTS é idempotente) ──
CREATE INDEX IF NOT EXISTS idx_adiantamentos_empresa_status
  ON public.adiantamentos_salariais (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_adiantamentos_colaborador_competencia
  ON public.adiantamentos_salariais (colaborador_id, competencia_desconto);
