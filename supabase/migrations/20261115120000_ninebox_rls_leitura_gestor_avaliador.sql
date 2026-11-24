-- NineBox / Avaliacao 360: devolve a leitura de feedbacks_360 a quem o fluxo
-- precisa, sem abrir o isolamento por empresa.
--
-- Problema: feedbacks_360_select exigia pode_gerir_avaliacoes(), que so aceita
-- 'admin' e 'rh'. As tabelas irmas criadas depois (feedbacks_360_consolidacoes
-- e feedbacks_360_aprovacoes_gestor) ja aceitam
-- "pode_gerir_avaliacoes() OR pode_aprovar_colaborador(colaborador_id)", mas a
-- tabela base ficou para tras. Como FeedbacksTab monta a fila a partir de
-- feedbacks_360, um usuario apenas 'gestor' (ou um avaliador designado sem
-- admin/rh) recebia zero linhas e nao tinha o que concluir ou aprovar na tela.
--
-- Correcao: mesma forma das irmas, mais o proprio avaliador designado. O
-- recorte por empresa (get_user_empresas) continua obrigatorio em todos os
-- ramos, e pode_aprovar_colaborador ja exige papel 'gestor' E ser supervisor do
-- avaliado, portanto nenhum gestor ve colaborador de outra linha.
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY (Postgres nao tem
-- CREATE OR REPLACE POLICY). Sem envelope transacional proprio: o
-- canonical-migrations controla a transacao.

DO $$
BEGIN
  IF to_regclass('public.feedbacks_360') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360 nao existe';
  END IF;
  IF to_regprocedure('public.pode_aprovar_colaborador(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.pode_aprovar_colaborador(uuid) nao existe — aplicar 20261017090000 antes';
  END IF;
  IF to_regprocedure('public.pode_gerir_avaliacoes()') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.pode_gerir_avaliacoes() nao existe';
  END IF;
END $$;

DROP POLICY IF EXISTS feedbacks_360_select ON public.feedbacks_360;

CREATE POLICY feedbacks_360_select
  ON public.feedbacks_360
  FOR SELECT
  -- O papel e parte do contrato da policy: sem TO, o CREATE POLICY nasce TO
  -- public e passa a valer tambem para `anon`. A policy de producao e
  -- TO {authenticated} (pg_policies) e precisa continuar assim.
  TO authenticated
  USING (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.pode_gerir_avaliacoes()
      OR public.pode_aprovar_colaborador(avaliado_id)
      OR avaliador_id IN (
        SELECT c.id FROM public.colaboradores c
         WHERE c.user_id = auth.uid()
           AND c.empresa_id = public.feedbacks_360.empresa_id
      )
    )
  );

-- Pos-condicao fail-closed (audit-migration-style): o DROP POLICY IF EXISTS
-- acima e silencioso por natureza — se o nome nao casar, o drop nao faz nada e
-- o CREATE seguinte poderia deixar a tabela sem a policy pretendida sem ninguem
-- notar. Aqui a migration se autoverifica: confere em pg_policies que a policy
-- existe com o ramo do gestor e aborta a transacao inteira se nao existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'feedbacks_360'
       AND policyname = 'feedbacks_360_select'
       AND cmd = 'SELECT'
       AND qual LIKE '%pode_aprovar_colaborador%'
       AND qual LIKE '%get_user_empresas%'
  ) THEN
    RAISE EXCEPTION
      'pos-condicao falhou: policy "feedbacks_360_select" em "feedbacks_360" ausente ou sem o ramo do gestor/avaliador apos o CREATE POLICY';
  END IF;
END $$;
