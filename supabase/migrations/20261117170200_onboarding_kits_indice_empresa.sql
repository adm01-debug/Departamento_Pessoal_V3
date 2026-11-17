-- =============================================================================
-- Resgate PARCIAL da branch `muri` (20261005000000_onboarding_kits_rls_additive),
-- redatado. Autorizado pelo dono na issue #628.
--
-- DO ARQUIVO ORIGINAL, TRAGO SO O INDICE. As 3 policies dele ficaram de fora,
-- e o motivo e importante:
--
-- Producao tem UMA policy em `onboarding_kits`:
--   empresa_isolation_onboarding_kits, FOR ALL, PERMISSIVE,
--   USING/WITH CHECK: empresa_id = get_auth_empresa_id()
-- ou seja, escopo da empresa ATIVA, cobrindo select/insert/update/delete.
--
-- As 3 policies da `muri` usam `empresa_id IN (SELECT get_user_empresas(auth.uid()))`
-- — TODAS as empresas do usuario. Policies permissivas sao combinadas por OR,
-- entao somar as da `muri` nao restringiria nada: AMPLIARIA o escopo, deixando
-- um usuario de 3 empresas ler e escrever kits das 3 independentemente de qual
-- esta selecionada.
--
-- Isso corrige, tambem, o que eu mesmo escrevi na issue #628: eu tratei "uma
-- policy so" como lacuna. Nao era — uma policy FOR ALL cobre os quatro
-- comandos, e com escopo MAIS ESTREITO que a proposta da `muri`. A lacuna real
-- era apenas o indice.
--
-- O indice: `pg_indexes` nao tem `idx_onboarding_kits_empresa_id`, e toda
-- consulta de kit filtra por empresa_id (e a propria policy avalia empresa_id
-- linha a linha). Sem indice, varredura completa da tabela.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_onboarding_kits_empresa_id
  ON public.onboarding_kits (empresa_id);
