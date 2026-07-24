-- Remediação de RLS (achados L1-L4 da auditoria em docs/auditoria/01_FALHAS_E_GAPS.md).
-- Nenhuma tabela é removida; apenas políticas são substituídas por versões
-- corretamente escopadas por tenant. Idempotente (DROP IF EXISTS antes de recriar).

-- =====================================================================
-- L1 — public.folhas e public.pontos (legado) com "Allow all" USING(true)
-- =====================================================================
-- Estas tabelas não têm coluna empresa_id própria (são escopadas via
-- colaborador_id -> colaboradores.empresa_id), diferente de folhas_pagamento/
-- registros_ponto (já corrigidas em 20260527130231). O loop de limpeza daquela
-- migration não cobria os nomes legados "folhas"/"pontos", então a policy
-- "Allow all" sobreviveu.
DROP POLICY IF EXISTS "Allow all" ON public.folhas;
CREATE POLICY "empresa_isolation_folhas_legado" ON public.folhas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

DROP POLICY IF EXISTS "Allow all" ON public.pontos;
CREATE POLICY "empresa_isolation_pontos_legado" ON public.pontos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- =====================================================================
-- L2 — public.entity_versions: SELECT USING(true) expõe snapshot completo
-- de QUALQUER entidade (colaboradores, holerites, folha...) a qualquer um.
-- =====================================================================
-- É uma tabela de histórico genérica entre tipos de entidade distintos;
-- não dá para escopar por empresa_id sem um JOIN por entity_type (fora de
-- escopo seguro nesta correção). Reduzimos drasticamente a exposição:
-- apenas admins podem ler o histórico de versões (era o único uso legítimo
-- observado: auditoria/compliance), fechando o vazamento anônimo/geral.
--
-- Existem DUAS policies de SELECT amplas nesta tabela, criadas em migrations
-- diferentes: "Users can view versions" (USING true, de 20241231000001) e
-- "Authenticated users can view versions" (USING auth.uid() IS NOT NULL, de
-- 20240101000000 — a migration que originalmente criou a tabela). Como
-- policies permissivas são combinadas com OR, dropar só uma delas não
-- fecha o vazamento: qualquer usuário autenticado (de qualquer empresa)
-- continuaria lendo tudo pela outra. As duas precisam ser removidas.
DROP POLICY IF EXISTS "Users can view versions" ON public.entity_versions;
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.entity_versions;
CREATE POLICY "entity_versions_admin_only_select" ON public.entity_versions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =====================================================================
-- L4 — Tabelas de recrutamento/onboarding com política sempre-falsa
-- =====================================================================
-- ENABLE ROW LEVEL SECURITY já roda hoje (via DO-block dinâmico em
-- 20260516175648), mas a única policy criada compara `empresa_id = auth.uid()`
-- e `colaboradores.id = auth.uid()` — nenhuma das duas é verdadeira neste
-- schema (empresa_id é o id de uma empresa; colaboradores.id não é o id do
-- usuário autenticado). RLS default-deny + policy sempre falsa = ninguém
-- consegue ler/escrever essas tabelas hoje (fail-closed, mas quebrado para
-- uso legítimo). Substituímos pelo padrão correto já usado em todo o
-- restante do schema (get_auth_empresa_id()).
DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'curriculos_arquivos', 'triagem_notas', 'vaga_entrevistas', 'vaga_etapas',
        'onboarding_kits', 'onboarding_documentos_obrigatorios'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
    EXECUTE format('DROP POLICY IF EXISTS "Multi-tenant access" ON public.%I', t_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (empresa_id = public.get_auth_empresa_id())',
      'empresa_isolation_' || t_name,
      t_name
    );
  END LOOP;
END $$;

-- =====================================================================
-- L3 — public.admissao_tokens: policies de SELECT `TO anon` sempre
-- verdadeiras (ou quase) permitem enumerar TODOS os tokens de admissão
-- (e-mail, telefone, assinatura em base64, IP) sem conhecer nenhum token.
-- A policy `TO authenticated` ("Tenant scoped admissao_tokens", já correta
-- desde 20260317222959) NÃO é afetada por esta correção.
-- =====================================================================
DROP POLICY IF EXISTS "Candidato pode acessar seu proprio token" ON public.admissao_tokens;
DROP POLICY IF EXISTS "token_access_isolation" ON public.admissao_tokens;

-- Substitui o acesso anônimo por uma função SECURITY DEFINER que exige o
-- token EXATO como argumento — não há como "esquecer" o filtro e obter
-- todas as linhas, ao contrário de uma policy `USING(true)` combinada com
-- uma query sem WHERE. Retorna o tipo composto da própria tabela (não
-- fixamos a lista de colunas, pois há definições divergentes de
-- admissao_tokens entre migrations mais antigas e mais novas — ver achado
-- de drift L10 da auditoria) mais os dados da admissão associada em JSONB.
--
-- NÃO filtramos por `data_expiracao` aqui de propósito: o frontend
-- (TokenInput.tsx, ContratacaoPage.tsx) distingue "código inválido" de
-- "link expirado" comparando `data_expiracao` no cliente, preservando a
-- mensagem específica que já existia. Isso não reabre o vazamento original:
-- a barreira de segurança é exigir o token EXATO como argumento da função
-- (impossível enumerar sem já conhecer o token), não a validade dele — quem
-- já possui o token de um link expirado teria a mesma informação hoje (o
-- código atual também busca a linha sem filtrar por expiração e só decide
-- a mensagem depois, no client).
CREATE OR REPLACE FUNCTION public.get_admissao_por_token(_token TEXT)
RETURNS TABLE (token_row public.admissao_tokens, admissao JSONB)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t, to_jsonb(a.*)
  FROM public.admissao_tokens t
  JOIN public.admissoes a ON a.id = t.admissao_id
  WHERE t.token = _token;
$$;

REVOKE ALL ON FUNCTION public.get_admissao_por_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admissao_por_token(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_admissao_por_token(TEXT) IS
  'Lookup público de admissao_tokens por token exato (substitui as policies anon USING(true)/data_expiracao>now() removidas nesta migration — achado L3 da auditoria). Ver src/components/contratacao/TokenInput.tsx e src/pages/ContratacaoPage.tsx.';
