-- Issue 35: Corrige políticas RLS com empresa_id = auth.uid() em tabelas de
-- recrutamento e onboarding não cobertas por 20260718220000_rls_remediacao_auditoria.sql.
--
-- 20260516175648_* criou "Multi-tenant access" com USING (empresa_id = auth.uid() OR ...)
-- para vagas, candidatos, candidaturas, onboarding_colaborador, onboarding_tarefas.
-- A migration 20260718220000_* corrigiu apenas um subconjunto (curriculos_arquivos,
-- triagem_notas, vaga_entrevistas, vaga_etapas, onboarding_kits,
-- onboarding_documentos_obrigatorios). As 5 tabelas abaixo ficaram com a policy
-- fail-closed (ninguém consegue ler/escrever) desde então.

DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN
    SELECT unnest(ARRAY[
      'vagas',
      'candidatos',
      'candidaturas',
      'onboarding_colaborador',
      'onboarding_tarefas'
    ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Multi-tenant access', t_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        'USING (empresa_id = public.get_auth_empresa_id()) '
        'WITH CHECK (empresa_id = public.get_auth_empresa_id())',
        'empresa_isolation_' || t_name,
        t_name
      );
    END IF;
  END LOOP;
END $$;
