
ALTER TABLE public.contrato_assinatura_tokens
  ADD COLUMN IF NOT EXISTS revogado_em timestamptz,
  ADD COLUMN IF NOT EXISTS revogado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS revogacao_motivo text;

CREATE INDEX IF NOT EXISTS idx_contrato_tokens_ativo
  ON public.contrato_assinatura_tokens (contrato_id)
  WHERE usado_em IS NULL AND revogado_em IS NULL;

-- Atualizar view de pendentes para ignorar revogados
CREATE OR REPLACE VIEW public.v_contratos_tokens_pendentes
WITH (security_invoker = true) AS
SELECT
  t.id, t.empresa_id, t.contrato_id, t.email_destinatario, t.expira_em, t.created_at,
  t.reminders_enviados, t.ultimo_reminder_at,
  EXTRACT(DAY FROM (now() - t.created_at))::int AS dias_desde_geracao,
  EXTRACT(DAY FROM (t.expira_em - now()))::int  AS dias_para_expirar,
  c.status AS contrato_status, c.data_inicio, c.data_fim,
  c.colaborador_id, col.nome_completo AS colaborador_nome, tpl.tipo_contrato
FROM public.contrato_assinatura_tokens t
JOIN public.contratos_gerados c ON c.id = t.contrato_id
LEFT JOIN public.colaboradores col ON col.id = c.colaborador_id
LEFT JOIN public.contrato_templates tpl ON tpl.id = c.template_id
WHERE t.usado_em IS NULL
  AND t.revogado_em IS NULL
  AND t.expira_em > now();

GRANT SELECT ON public.v_contratos_tokens_pendentes TO authenticated;

-- Atualizar KPI: expirados considera revogados
CREATE OR REPLACE VIEW public.v_contratos_assinatura_kpi
WITH (security_invoker = true) AS
SELECT
  t.empresa_id,
  COUNT(*) AS tokens_gerados,
  COUNT(*) FILTER (WHERE t.usado_em IS NOT NULL) AS tokens_assinados,
  COUNT(*) FILTER (WHERE t.usado_em IS NULL AND t.revogado_em IS NULL AND t.expira_em > now()) AS tokens_pendentes,
  COUNT(*) FILTER (WHERE t.usado_em IS NULL AND (t.revogado_em IS NOT NULL OR t.expira_em <= now())) AS tokens_expirados,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.usado_em IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS taxa_conversao_pct,
  AVG(EXTRACT(EPOCH FROM (t.usado_em - t.created_at))/3600.0) FILTER (WHERE t.usado_em IS NOT NULL) AS tempo_medio_assinatura_h
FROM public.contrato_assinatura_tokens t
GROUP BY t.empresa_id;

GRANT SELECT ON public.v_contratos_assinatura_kpi TO authenticated;

-- RPC: revogar token
CREATE OR REPLACE FUNCTION public.contrato_revogar_token(
  p_token_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_usado timestamptz;
  v_revogado timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id, usado_em, revogado_em
    INTO v_empresa, v_usado, v_revogado
  FROM public.contrato_assinatura_tokens
  WHERE id = p_token_id;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'token_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_belongs_to_empresa(v_uid, v_empresa) THEN
    RAISE EXCEPTION 'forbidden_tenant' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'rh'::app_role)) THEN
    RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
  END IF;

  IF v_usado IS NOT NULL THEN
    RAISE EXCEPTION 'token_already_signed' USING ERRCODE = '22023';
  END IF;

  -- Idempotente: se já revogado, apenas retorna
  IF v_revogado IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.contrato_assinatura_tokens
  SET revogado_em = now(),
      revogado_por = v_uid,
      revogacao_motivo = NULLIF(trim(p_motivo), '')
  WHERE id = p_token_id;
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_revogar_token(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contrato_revogar_token(uuid, text) TO authenticated;
