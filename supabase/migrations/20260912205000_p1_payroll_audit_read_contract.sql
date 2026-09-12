-- P1: align payroll compliance readers with the physical audit action CHECK.
-- Historical CLOSE/REOPEN rows remain readable, but the public contract emits
-- only PAYROLL_CLOSE/PAYROLL_REOPEN so consumers do not split one event type.

DO $preflight$
BEGIN
  IF to_regclass('public.audit_log') IS NULL
     OR to_regclass('public.vw_folha_compliance') IS NULL THEN
    RAISE EXCEPTION 'payroll audit read contract requires audit_log and vw_folha_compliance';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.audit_log'::regclass
      AND attname = 'empresa_id' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'payroll audit read contract requires audit_log.empresa_id';
  END IF;
END
$preflight$;

CREATE OR REPLACE VIEW public.vw_folha_compliance
WITH (security_invoker = true) AS
SELECT
  a.id AS audit_id,
  a.created_at AS event_at,
  CASE a.acao
    WHEN 'CLOSE' THEN 'PAYROLL_CLOSE'
    WHEN 'REOPEN' THEN 'PAYROLL_REOPEN'
    ELSE a.acao
  END AS acao,
  a.registro_id AS folha_id,
  COALESCE(
    a.empresa_id,
    CASE
      WHEN COALESCE(a.dados_novos ->> 'empresaId', a.dados_novos ->> 'empresa_id', '')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN COALESCE(a.dados_novos ->> 'empresaId', a.dados_novos ->> 'empresa_id')::uuid
    END
  ) AS empresa_id,
  COALESCE(
    a.dados_novos ->> 'competencia',
    a.dados_novos -> 'integritySnapshot' ->> 'competencia'
  ) AS competencia,
  NULLIF(a.dados_novos ->> 'version_nova', '')::int AS version_nova,
  NULLIF(a.dados_novos ->> 'version_anterior', '')::int AS version_anterior,
  COALESCE(a.dados_novos ->> 'audit_hash', a.dados_novos ->> 'integrity_hash') AS integrity_hash,
  NULLIF(a.dados_novos ->> 'total_proventos', '')::numeric AS total_proventos,
  NULLIF(a.dados_novos ->> 'total_descontos', '')::numeric AS total_descontos,
  NULLIF(a.dados_novos ->> 'total_liquido', '')::numeric AS total_liquido,
  NULLIF(a.dados_novos ->> 'total_fgts', '')::numeric AS total_fgts,
  NULLIF(a.dados_novos ->> 'holerites_count', '')::int AS holerites_count,
  NULLIF(a.dados_novos ->> 'itens_count', '')::int AS itens_count,
  a.dados_novos ->> 'motivo' AS motivo,
  (a.dados_novos ->> 'override_esocial')::boolean AS override_esocial,
  a.user_id,
  a.user_email,
  a.ip_address,
  a.dados_novos
FROM public.audit_log AS a
WHERE a.tabela = 'folhas_pagamento'
  AND a.acao IN ('PAYROLL_CALC', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN', 'CLOSE', 'REOPEN');

REVOKE ALL ON public.vw_folha_compliance FROM PUBLIC, anon;
GRANT SELECT ON public.vw_folha_compliance TO authenticated, service_role;

COMMENT ON VIEW public.vw_folha_compliance IS
  'Tenant-scoped payroll compliance trail. Legacy CLOSE/REOPEN rows are normalized to PAYROLL_CLOSE/PAYROLL_REOPEN; security_invoker preserves audit_log RLS.';
