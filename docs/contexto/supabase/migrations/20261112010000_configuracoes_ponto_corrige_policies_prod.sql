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

-- Decisão do dono (12/11): ALTERAR a configuração de ponto é só de
-- supervisor/coordenador da própria empresa (admin e RH não alteram).
-- Papéis novos no enum. ADD VALUE roda no lote transacional (PG >= 12), mas o
-- valor novo não pode ser usado como literal do enum na mesma transação; por
-- isso o helper compara role::text.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';

CREATE OR REPLACE FUNCTION public.pode_gerir_config_ponto(_empresa_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT public.pertence_a_empresa(_empresa_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role::text IN ('supervisor', 'coordenador')
     );
$$;
REVOKE ALL ON FUNCTION public.pode_gerir_config_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_config_ponto(uuid) TO authenticated;

-- A tela salva com upsert (INSERT ... ON CONFLICT DO UPDATE), que exige a
-- policy de INSERT além da de UPDATE: supervisor/coordenador também inserem.
CREATE POLICY "Supervisor ou coordenador inserem configurações de ponto"
  ON public.configuracoes_ponto
  FOR INSERT
  TO authenticated
  WITH CHECK (public.pode_gerir_config_ponto(empresa_id));

-- audit-migration-style: allow-silent-drop UPDATE antiga (TO public, qualquer membro da empresa), substituída logo abaixo por supervisor/coordenador
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY "Supervisor ou coordenador alteram configurações de ponto"
  ON public.configuracoes_ponto
  FOR UPDATE
  TO authenticated
  USING (public.pode_gerir_config_ponto(empresa_id))
  WITH CHECK (public.pode_gerir_config_ponto(empresa_id));
