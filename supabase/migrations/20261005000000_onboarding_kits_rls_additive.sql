-- ============================================================================
-- ONBOARDING — FECHAMENTO DO DOMÍNIO (Jornada de Onboarding)
--
-- ADITIVA E IDEMPOTENTE. Não altera colunas, não apaga nada, não faz DROP.
--
-- CONTEXTO (achado da auditoria de paridade): `public.onboarding_kits` foi
-- criada em `20260513191939_debf0e40-...sql` SEM `ENABLE ROW LEVEL SECURITY` e
-- SEM policies — as outras duas tabelas daquela migration (`documentos_admissao`
-- e `tarefas_onboarding`) receberam isolamento, ela não. A Jornada passou a ler
-- e a ESCREVER nessa tabela (Gestão de Kits), então ela precisa do mesmo
-- isolamento por tenant usado no resto do produto: `get_user_empresas(auth.uid())`.
--
-- ESCOPO DAS POLICIES:
--   • SELECT  → perfis da(s) empresa(s) do usuário (grade + gerenciador)
--   • INSERT  → só na própria empresa (criar perfil de kit)
--   • UPDATE  → só na própria empresa (editar nome/itens/ativo)
--   • DELETE  → NÃO é concedido: não existe exclusão de kit no produto (a
--               desativação é `ativo = false`, preservando histórico).
--
-- ÍNDICE: leitura é sempre por empresa (`listarKits`), então `empresa_id`
-- ganha índice — operação aditiva e não bloqueante.
-- ============================================================================

ALTER TABLE public.onboarding_kits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onboarding_kits_empresa_id
  ON public.onboarding_kits (empresa_id);

DO $$
BEGIN
  -- Leitura: perfis da própria empresa.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'onboarding_kits' AND policyname = 'Tenant scoped onboarding kits select'
  ) THEN
    CREATE POLICY "Tenant scoped onboarding kits select" ON public.onboarding_kits
      FOR SELECT TO authenticated
      USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));
  END IF;

  -- Criação: só na própria empresa.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'onboarding_kits' AND policyname = 'Tenant scoped onboarding kits insert'
  ) THEN
    CREATE POLICY "Tenant scoped onboarding kits insert" ON public.onboarding_kits
      FOR INSERT TO authenticated
      WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())));
  END IF;

  -- Edição: só na própria empresa (nome, itens e ativo/inativo).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'onboarding_kits' AND policyname = 'Tenant scoped onboarding kits update'
  ) THEN
    CREATE POLICY "Tenant scoped onboarding kits update" ON public.onboarding_kits
      FOR UPDATE TO authenticated
      USING (empresa_id IN (SELECT get_user_empresas(auth.uid())))
      WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())));
  END IF;
END $$;
