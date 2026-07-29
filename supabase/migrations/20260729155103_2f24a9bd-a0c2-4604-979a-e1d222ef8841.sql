-- ============================================================================
-- Recrutamento/Onboarding: políticas apoiadas em claim inexistente + sem GRANT
--
-- CAUSA RAIZ
-- `get_auth_empresa_id()` lê `app_metadata.empresa_id` do JWT. Nenhum dos
-- usuários possui essa claim (verificado: 3/3 sem `empresa_id`), então a
-- função retorna NULL e o predicado `empresa_id = NULL` avalia para NULL —
-- nunca TRUE. As políticas negavam 100% dos acessos.
--
-- Falha fechada, portanto não houve vazamento; mas os módulos eram
-- inoperantes. Somava-se a isso a ausência total de GRANT nas 6 tabelas: sem
-- privilégio, o PostgREST recusa antes mesmo de avaliar a política.
--
-- As 6 tabelas estão vazias e não são referenciadas por nenhuma tela
-- (apenas em `types.ts`, que é gerado), logo a troca não afeta dados.
--
-- ESCOLHA DO PREDICADO
-- `pode_gerir_pessoas(empresa_id)` (RH + gestor + admin) em vez de
-- `pertence_a_empresa`: currículos, notas de triagem e feedback de entrevista
-- descrevem candidatos e não devem ficar legíveis a todo colaborador do
-- tenant. Também não se usa `pode_gerir_rh`, que excluiria o gestor —
-- justamente quem conduz entrevista e avalia etapa de vaga.
--
-- `WITH CHECK` idêntico ao `USING` impede gravar linha carimbada com o
-- `empresa_id` de outra empresa. Com `empresa_id` NULL o helper não retorna
-- TRUE, então a política permanece fechada.
-- ============================================================================

-- 1. Ponto: política redundante e inócua. `tenant_registros_ponto` já protege
--    a tabela via get_user_empresas(auth.uid()), com USING e WITH CHECK.
DROP POLICY IF EXISTS "empresa_isolation_ponto" ON public.registros_ponto;

-- 2. As 6 tabelas: substitui o predicado morto e concede os privilégios.
DO $$
DECLARE
  t text;
  alvos text[] := ARRAY[
    'curriculos_arquivos',
    'onboarding_documentos_obrigatorios',
    'onboarding_kits',
    'triagem_notas',
    'vaga_entrevistas',
    'vaga_etapas'
  ];
BEGIN
  FOREACH t IN ARRAY alvos LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'empresa_isolation_' || t, t);

    -- Sem GRANT o Data API recusa antes de chegar na política.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    -- anon deliberadamente sem privilégio: nenhuma política o alcança.

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL
        TO authenticated
        USING (public.pode_gerir_pessoas(empresa_id))
        WITH CHECK (public.pode_gerir_pessoas(empresa_id))
    $f$, t || '_gestao_pessoas', t);
  END LOOP;
END $$;