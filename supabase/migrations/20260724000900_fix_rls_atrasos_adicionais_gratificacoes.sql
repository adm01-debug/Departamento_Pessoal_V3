-- Issue 37: Corrige políticas RLS com auth.uid() IS NOT NULL em atrasos,
-- adicionais e gratificacoes.
--
-- Os stubs 2025122813133806_create_atrasos.sql, 2025122813133907_create_adicionais.sql
-- e 2025122813133908_create_gratificacoes.sql criaram políticas USING (auth.uid() IS NOT NULL)
-- que permitem qualquer usuário autenticado ler/escrever dados de QUALQUER empresa.
-- As migrações "corretas" de 20251228* são NO-OPs (tabelas já existem) e recriam
-- as mesmas políticas inseguras. Nenhuma migração posterior de 2026 cobriu essas
-- três tabelas no loop de remediação.
-- Todas têm coluna empresa_id → usar get_auth_empresa_id() (padrão do schema).

DO $$
DECLARE
  t_name TEXT;
  policy_name TEXT;
BEGIN
  FOR t_name IN SELECT unnest(ARRAY['atrasos', 'adicionais', 'gratificacoes']) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t_name
    ) THEN
      -- Drop todas as políticas permissivas existentes (nomes variados entre stub e proper)
      FOR policy_name IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t_name);
      END LOOP;

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);

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
