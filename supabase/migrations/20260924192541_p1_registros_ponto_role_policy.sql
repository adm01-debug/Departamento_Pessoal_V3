-- P1 (E50-21, Bloco C do PLANO_50.md): registros_ponto ainda tinha a policy
-- ampla "tenant_registros_ponto" (ALL) viva ao lado de uma policy nova de
-- leitura (registros_ponto_tenant_select). Confirmado ao vivo em produção:
--
--   tenant_registros_ponto (ALL)
--     USING/WITH CHECK: empresa_id IN (SELECT get_user_empresas(auth.uid()))
--
-- Sem checagem de papel nem de titularidade: qualquer usuário autenticado do
-- tenant podia INSERT/UPDATE/DELETE o registro de ponto de qualquer colega,
-- não só o próprio. Mesmo padrão de policy permissiva ampla já corrigido em
-- outras tabelas nesta sessão (colaboradores, folhas_pagamento, etc).
--
-- Substitui por policy que exige: o próprio colaborador (sou_o_colaborador,
-- mesmo padrão usado em registrar_batida_ponto/get_colaborador_banco_horas)
-- OU quem gerencia RH/pessoas da empresa -- preservando o escopo de tenant
-- idêntico ao original.

CREATE POLICY registros_ponto_write ON public.registros_ponto
  FOR ALL TO authenticated
  USING (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.sou_o_colaborador(colaborador_id)
      OR public.pode_gerir_rh(empresa_id)
      OR public.pode_gerir_pessoas(empresa_id)
    )
  )
  WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.sou_o_colaborador(colaborador_id)
      OR public.pode_gerir_rh(empresa_id)
      OR public.pode_gerir_pessoas(empresa_id)
    )
  );

DROP POLICY IF EXISTS tenant_registros_ponto ON public.registros_ponto;
