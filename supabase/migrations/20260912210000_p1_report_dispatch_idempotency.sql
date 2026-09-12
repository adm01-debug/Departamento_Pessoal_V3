-- P1: persist the exact scheduled-report provider payload before delivery.
DO $preflight$
BEGIN
  IF to_regclass('public.relatorios_agendados') IS NULL THEN
    RAISE EXCEPTION 'report dispatch idempotency requires public.relatorios_agendados';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.report_dispatch_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_key_hash text NOT NULL UNIQUE CHECK (dispatch_key_hash ~ '^[0-9a-f]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  agendamento_id uuid NOT NULL REFERENCES public.relatorios_agendados(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  storage_path text NOT NULL,
  signed_url text NOT NULL,
  signed_url_expires_at timestamptz NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  total_registros integer NOT NULL CHECK (total_registros >= 0),
  provider_message_id text,
  status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_dispatch_attempts_schedule
  ON public.report_dispatch_attempts (agendamento_id, created_at DESC);

ALTER TABLE public.report_dispatch_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_dispatch_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.report_dispatch_attempts TO service_role;

COMMENT ON TABLE public.report_dispatch_attempts IS
  'Payload exato e recibo de envio de relatório agendado; impede alteração de parâmetros sob a mesma Idempotency-Key.';
