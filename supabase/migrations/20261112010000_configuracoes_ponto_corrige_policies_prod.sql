-- Corrige as policies de configuracoes_ponto em produção.
-- O run 43118012420 (apply, commit bfb3cb0) aplicou as versões antigas de
-- 20261107203000 e 20261109000000 antes da correção da #446. Resultado no
-- canônico: policy FOR ALL "configuracoes_ponto_tenant_manage" via
-- rls_tenant_or_admin (OR com is_admin() global: admin de qualquer empresa e
-- qualquer membro da empresa podem inserir/alterar/apagar a configuração) e
-- INSERT "Admins podem inserir..." TO public só com pertence_a_empresa.
-- Como as duas versões já estão no ledger, a 20261109 corrigida nunca rodaria;
-- esta migration leva o estado final esperado: INSERT só admin/rh da própria
-- empresa, sem FOR ALL/DELETE.
-- audit-migration-style: allow-silent-drop policy FOR ALL aplicada pela 20261107203000 no run 43118012420; precisa sair em produção
DROP POLICY IF EXISTS "configuracoes_ponto_tenant_manage" ON public.configuracoes_ponto;
-- audit-migration-style: allow-silent-drop versão antiga (TO public, sem papel) da policy INSERT, recriada logo abaixo com papel admin/rh
DROP POLICY IF EXISTS "Admins podem inserir configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY "Admins podem inserir configurações de ponto"
  ON public.configuracoes_ponto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.pertence_a_empresa(empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );
