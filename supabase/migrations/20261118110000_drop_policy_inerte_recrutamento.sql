-- ============================================================================
-- Remove a policy inerte "Multi-tenant access" das 5 tabelas de recrutamento
-- e onboarding. SEM criar policy no lugar.
-- ============================================================================
-- Medido em 18/11/2026 (docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md §16).
--
-- A policy foi criada por
-- 20260516175648_835be6f9-b129-4520-bc17-b60bf8d426c1.sql:169 assim:
--
--   CREATE POLICY "Multi-tenant access" ON public.%I FOR ALL
--     USING (empresa_id = auth.uid()
--            OR (SELECT c.empresa_id FROM public.colaboradores c
--                WHERE c.id = auth.uid()) = empresa_id)
--
-- Nenhuma das pernas do OR concede acesso:
--   1. `empresa_id = auth.uid()` compara id de EMPRESA com id de USUARIO;
--   2. a subconsulta busca `colaboradores.id = auth.uid()`, mas o vinculo
--      usuario->colaborador neste schema e `colaboradores.user_id`. Devolve
--      NULL, e `NULL = empresa_id` e NULL, que a RLS trata como falso.
-- Para `anon`, `auth.uid()` e NULL e as duas pernas sao NULL.
--
-- Ou seja: a policy e PERMISSIVE para role `public` mas nunca libera nada.
-- Fail-closed por acidente. Nao e vazamento e nao e o que governa o acesso —
-- quem governa sao as outras policies PERMISSIVE por `authenticated`
-- (`Users can manage candidatos of their empresa`,
--  `Users can manage candidaturas via vaga empresa`, etc.), que ficam INTACTAS.
--
-- Por que so o DROP, e nao a 20260724000700 (que esta na main e nunca foi
-- aplicada): aquela migration tambem CRIA `empresa_isolation_<tabela>` com
-- `empresa_id = public.get_auth_empresa_id()`, PERMISSIVE, para
-- `authenticated`. Policies PERMISSIVE sao combinadas por OR, entao somar uma
-- nova poderia ALARGAR o acesso se `get_auth_empresa_id()` for mais amplo que
-- o USING das policies atuais — o oposto da intencao, em tabelas com PII de
-- candidato. Aqui o efeito e estritamente: menos uma policy que nao fazia nada.
--
-- Idempotente: `DROP POLICY IF EXISTS` e o `IF EXISTS` da tabela.

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
    IF to_regclass('public.' || quote_ident(t_name)) IS NOT NULL THEN
      -- audit-migration-style: allow-silent-drop remocao definitiva de policy INERTE, sem recriacao no lugar — e exatamente o objetivo desta migration. O USING nunca concede (compara empresa_id com auth.uid() e busca colaboradores.id = auth.uid() quando o vinculo e colaboradores.user_id), conforme §16 da auditoria. Um gate que exigisse a policy existir em pg_policies apos o DROP contradiria o proposito. A garantia fail-closed mora no sidecar: a assercao 1 exige que a policy NAO exista em nenhuma das 5 tabelas e a 2 exige que as policies de `authenticated` que governam o acesso continuem presentes
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Multi-tenant access', t_name);
    ELSE
      RAISE NOTICE 'tabela public.% ausente — nada a remover', t_name;
    END IF;
  END LOOP;
END $$;
