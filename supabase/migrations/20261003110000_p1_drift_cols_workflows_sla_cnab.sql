-- Drift schema × código: colunas que os services escrevem/consultam há meses
-- mas que nunca existiram no schema canônico (nem no types.ts gerado). Sem
-- elas, os caminhos abaixo falhavam em runtime (PostgREST rejeita coluna
-- desconhecida): execução/aprovação de workflow (SLA) e geração/finalização
-- de remessa CNAB (o SELECT de recuperação idempotente filtra por folha_id).

ALTER TABLE public.workflows_execucoes
  ADD COLUMN IF NOT EXISTS sla_iniciado_em TIMESTAMPTZ;

ALTER TABLE public.cnab_remessas
  ADD COLUMN IF NOT EXISTS folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arquivo_remessa TEXT;

CREATE INDEX IF NOT EXISTS idx_cnab_remessas_folha ON public.cnab_remessas (folha_id);

-- RPC tenant-scoped para as notificações críticas de premiações: retorna os
-- usuários com papel privilegiado (admin/gestor/rh) da empresa. user_empresas
-- e user_roles estão na TABLE_DENYLIST do bridge, então membership só sai por
-- RPCs estreitas como esta. Autorização: membro da empresa ou admin global.
CREATE OR REPLACE FUNCTION public.get_empresa_admin_ids(p_empresa_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_empresas ue
  JOIN public.user_roles ur ON ur.user_id = ue.user_id
  WHERE ue.empresa_id = p_empresa_id
    AND ur.role IN ('admin', 'gestor', 'rh')
    AND (
      p_empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      OR public.is_admin(auth.uid())
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_empresa_admin_ids(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_admin_ids(uuid) TO authenticated;
