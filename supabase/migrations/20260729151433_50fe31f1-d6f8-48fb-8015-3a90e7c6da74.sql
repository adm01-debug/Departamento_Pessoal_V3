-- ============================================================
-- Helpers de autorização (SECURITY DEFINER, search_path fixo)
-- ============================================================

CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _empresa_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.user_empresas ue
       WHERE ue.user_id = auth.uid()
         AND ue.empresa_id = _empresa_id
     )
     AND (
       public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'rh'::app_role)
     );
$$;

REVOKE EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) TO authenticated, service_role;

-- gestor inclui a linha de frente (aprovações), além de RH/admin
CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.pode_gerir_rh(_empresa_id)
      OR (
        _empresa_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_empresas ue
          WHERE ue.user_id = auth.uid()
            AND ue.empresa_id = _empresa_id
        )
        AND public.has_role(auth.uid(), 'gestor'::app_role)
      );
$$;

REVOKE EXECUTE ON FUNCTION public.pode_gerir_pessoas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas(uuid) TO authenticated, service_role;

-- "este cadastro trabalhista sou eu?"  (colaboradores.id, NAO auth.uid())
CREATE OR REPLACE FUNCTION public.sou_o_colaborador(_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _colaborador_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.colaboradores c
       WHERE c.id = _colaborador_id
         AND c.user_id = auth.uid()
     );
$$;

REVOKE EXECUTE ON FUNCTION public.sou_o_colaborador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sou_o_colaborador(uuid) TO authenticated, service_role;

-- empresa a que pertence um cadastro trabalhista (evita subselect em policy)
CREATE OR REPLACE FUNCTION public.empresa_do_colaborador(_colaborador_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.empresa_id FROM public.colaboradores c WHERE c.id = _colaborador_id;
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_do_colaborador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empresa_do_colaborador(uuid) TO authenticated, service_role;

-- ============================================================
-- HOLERITES
-- ============================================================
DROP POLICY IF EXISTS "tenant_holerites" ON public.holerites;
DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios holerites" ON public.holerites;

CREATE POLICY "holerites_rh_manage" ON public.holerites
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));

CREATE POLICY "holerites_self_read" ON public.holerites
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- CONTAS BANCARIAS
-- ============================================================
DROP POLICY IF EXISTS "tenant_contas_bancarias" ON public.contas_bancarias;

CREATE POLICY "contas_bancarias_rh_manage" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "contas_bancarias_self_read" ON public.contas_bancarias
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- HISTORICO SALARIAL
-- ============================================================
DROP POLICY IF EXISTS "tenant_historico_salarial" ON public.historico_salarial;

CREATE POLICY "historico_salarial_rh_manage" ON public.historico_salarial
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "historico_salarial_self_read" ON public.historico_salarial
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- EMPRESTIMOS CONSIGNADOS
-- ============================================================
DROP POLICY IF EXISTS "Emprestimos por empresa" ON public.emprestimos_consignados;

CREATE POLICY "emprestimos_rh_manage" ON public.emprestimos_consignados
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "emprestimos_self_read" ON public.emprestimos_consignados
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- DOCUMENTOS DO COLABORADOR
-- ============================================================
DROP POLICY IF EXISTS "tenant_documentos_colaborador" ON public.documentos_colaborador;
DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios documentos" ON public.documentos_colaborador;

CREATE POLICY "documentos_colaborador_rh_manage" ON public.documentos_colaborador
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));

CREATE POLICY "documentos_colaborador_self_read" ON public.documentos_colaborador
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- indices de apoio ao predicado de auto-acesso
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id ON public.colaboradores(user_id) WHERE user_id IS NOT NULL;